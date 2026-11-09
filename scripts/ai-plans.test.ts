import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const intakeSql = readFileSync("supabase/migrations/20261103100000_ai_intake.sql", "utf8");
const plansSql = readFileSync("supabase/migrations/20261110100000_ai_plans.sql", "utf8");
const plansDownSql = readFileSync("supabase/migrations/rollback/20261110100000_ai_plans_down.sql", "utf8");

function statement(start: string, end: string): string {
  const from = intakeSql.indexOf(start);
  if (from < 0) throw new Error(`not in the migration: ${start}`);
  return intakeSql.slice(from, intakeSql.indexOf(end, from) + end.length);
}

type Decision = { allowed: boolean; reason: string | null; usage_id?: string; units_left?: number };
type Access = {
  allowed: boolean;
  plan: string | null;
  units_total: number;
  units_used: number;
  units_left: number;
  resets_at: string | null;
};

const TRACKED_FUNCTIONS = [
  "ai.usage_quota(uuid)",
  "ai.take_call(uuid)",
  "ai.consume_usage(uuid,text,uuid,text)",
  "ai.consume_call(uuid)",
] as const;

let db: PGlite;
let originalDefs: Record<string, string>;

async function functionDefs(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const name of TRACKED_FUNCTIONS) {
    const { rows } = await db.query<{ def: string }>(
      "SELECT pg_get_functiondef($1::regprocedure) AS def",
      [name],
    );
    out[name] = rows[0].def;
  }
  return out;
}

async function addUser(): Promise<string> {
  const user = randomUUID();
  await db.query("INSERT INTO auth.users (id) VALUES ($1)", [user]);
  return user;
}

async function grantPlan(user: string, plan: string, expiresAt: string | null = null): Promise<void> {
  await db.query(
    "INSERT INTO public.user_plans (user_id, plan, source, note, expires_at) VALUES ($1, $2, 'manual', 'test', $3)",
    [user, plan, expiresAt],
  );
}

async function consume(user: string, kind = "text"): Promise<Decision> {
  const { rows } = await db.query<{ r: Decision }>(
    "SELECT public.consume_ai_usage($1, $2, null, null) AS r",
    [user, kind],
  );
  return rows[0].r;
}

async function accessAs(user: string): Promise<Access> {
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [user]);
  const { rows } = await db.query<{ r: Access }>("SELECT public.get_my_ai_access() AS r");
  return rows[0].r;
}

async function countRows(user: string): Promise<{ counters: number; rate: number }> {
  const counters = await db.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM ai.usage_counters WHERE user_id = $1",
    [user],
  );
  const rate = await db.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM ai.usage_rate WHERE user_id = $1",
    [user],
  );
  return { counters: counters.rows[0].n, rate: rate.rows[0].n };
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE SCHEMA ai;
    CREATE SCHEMA auth;
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$
      SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'service_role')
    $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION public.handle_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      NEW.updated_at := now();
      RETURN NEW;
    END;
    $$;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT USAGE ON SCHEMA ai TO anon, authenticated, service_role;
    ${statement("CREATE TABLE ai.usage_counters (", "\n);")}
    ${statement("CREATE TABLE ai.usage_events (", "\n);")}
    ${statement("CREATE TABLE ai.usage_rate (", "\n);")}
    ALTER TABLE ai.usage_counters ADD PRIMARY KEY (user_id, period_start);
    ALTER TABLE ai.usage_rate ADD PRIMARY KEY (user_id, bucket, bucket_start);
    ${statement("CREATE UNIQUE INDEX usage_events_turn_idx", ";")}
    ${statement("CREATE FUNCTION ai.usage_quota(", "\n$$;")}
    ${statement("CREATE FUNCTION ai.usage_weight(", "\n$$;")}
    ${statement("CREATE FUNCTION ai.take_call(", "\n$$;")}
    ${statement("CREATE FUNCTION ai.consume_usage(", "\n$$;")}
    ${statement("CREATE FUNCTION ai.release_usage(", "\n$$;")}
    ${statement("CREATE FUNCTION ai.consume_call(", "\n$$;")}
    ${statement("CREATE FUNCTION public.consume_ai_usage(", "\n$$;")}
    ${statement("CREATE FUNCTION public.consume_ai_call(", "\n$$;")}
    REVOKE ALL ON FUNCTION ai.usage_quota(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
    REVOKE ALL ON FUNCTION ai.take_call(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
    REVOKE ALL ON FUNCTION ai.consume_call(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
    REVOKE ALL ON FUNCTION ai.consume_usage(p_user_id uuid, p_kind text, p_turn uuid, p_op text) FROM PUBLIC, anon, authenticated, service_role;
    REVOKE ALL ON FUNCTION public.consume_ai_usage(p_user_id uuid, p_kind text, p_turn uuid, p_op text) FROM PUBLIC, anon, authenticated, service_role;
    GRANT ALL ON FUNCTION public.consume_ai_usage(p_user_id uuid, p_kind text, p_turn uuid, p_op text) TO service_role;
    REVOKE ALL ON FUNCTION public.consume_ai_call(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
    GRANT ALL ON FUNCTION public.consume_ai_call(p_user_id uuid) TO service_role;
  `);
  originalDefs = await functionDefs();
  await db.exec(plansSql);
}, 60_000);

describe("AI plans", () => {
  it("denies a user with no row and no default, and writes no usage rows", async () => {
    const user = await addUser();
    expect(await accessAs(user)).toMatchObject({ allowed: false, plan: null, units_total: 0 });
    expect(await consume(user)).toMatchObject({ allowed: false, reason: "not_allowed" });
    expect(await countRows(user)).toEqual({ counters: 0, rate: 0 });
  });

  it("allows a beta user with today's quotas and weights", async () => {
    const user = await addUser();
    await grantPlan(user, "beta");
    expect(await accessAs(user)).toMatchObject({
      allowed: true,
      plan: "beta",
      units_total: 1000,
      units_used: 0,
      units_left: 1000,
    });
    expect(await consume(user, "text")).toMatchObject({ allowed: true, units_left: 999 });
    expect(await consume(user, "receipt")).toMatchObject({ allowed: true, units_left: 994 });
    expect(await consume(user, "speech")).toMatchObject({ allowed: true, units_left: 991 });
  });

  it("treats an expired assignment as no plan when there is no default", async () => {
    const user = await addUser();
    await grantPlan(user, "beta", "2020-01-01T00:00:00Z");
    expect(await accessAs(user)).toMatchObject({ allowed: false, plan: null });
    expect(await consume(user)).toMatchObject({ allowed: false, reason: "not_allowed" });
    expect(await countRows(user)).toEqual({ counters: 0, rate: 0 });
  });

  it("uses the default plan for users with no row, and keeps beta at 1000", async () => {
    await db.query(
      "INSERT INTO public.plans (plan, ai_monthly_units, ai_daily_calls, ai_minute_calls, is_default) VALUES ('free', 100, 300, 30, true)",
    );
    const open = await addUser();
    const beta = await addUser();
    await grantPlan(beta, "beta");
    expect(await accessAs(open)).toMatchObject({ allowed: true, plan: "free", units_total: 100 });
    expect(await consume(open)).toMatchObject({ allowed: true, units_left: 99 });
    expect(await accessAs(beta)).toMatchObject({ allowed: true, plan: "beta", units_total: 1000 });
    await db.query("UPDATE public.plans SET is_default = false WHERE plan = 'free'");
  });

  it("treats a plan with zero monthly units as not allowed", async () => {
    await db.query(
      "INSERT INTO public.plans (plan, ai_monthly_units, ai_daily_calls, ai_minute_calls) VALUES ('blocked', 0, 300, 30)",
    );
    const user = await addUser();
    await grantPlan(user, "blocked");
    expect(await accessAs(user)).toMatchObject({ allowed: false, plan: "blocked", units_total: 0 });
    expect(await consume(user)).toMatchObject({ allowed: false, reason: "not_allowed" });
    expect(await countRows(user)).toEqual({ counters: 0, rate: 0 });
  });

  it("keeps a beta user who used up the month allowed, with consume returning quota_exhausted", async () => {
    const user = await addUser();
    await grantPlan(user, "beta");
    await db.query(
      "INSERT INTO ai.usage_counters (user_id, period_start, units_used) VALUES ($1, date_trunc('month', now() AT TIME ZONE 'UTC')::date, 1000)",
      [user],
    );
    expect(await accessAs(user)).toMatchObject({
      allowed: true,
      plan: "beta",
      units_total: 1000,
      units_used: 1000,
      units_left: 0,
    });
    expect(await consume(user)).toMatchObject({ allowed: false, reason: "quota_exhausted" });
  });

  it("reads rate limits from the plan", async () => {
    await db.query(
      "INSERT INTO public.plans (plan, ai_monthly_units, ai_daily_calls, ai_minute_calls) VALUES ('tight_minute', 1000, 300, 2)",
    );
    await db.query(
      "INSERT INTO public.plans (plan, ai_monthly_units, ai_daily_calls, ai_minute_calls) VALUES ('tight_day', 1000, 2, 30)",
    );
    const minuteUser = await addUser();
    await grantPlan(minuteUser, "tight_minute");
    expect(await consume(minuteUser)).toMatchObject({ allowed: true });
    expect(await consume(minuteUser)).toMatchObject({ allowed: true });
    expect(await consume(minuteUser)).toMatchObject({ allowed: false, reason: "rate_limited" });

    const dayUser = await addUser();
    await grantPlan(dayUser, "tight_day");
    expect(await consume(dayUser)).toMatchObject({ allowed: true });
    expect(await consume(dayUser)).toMatchObject({ allowed: true });
    expect(await consume(dayUser)).toMatchObject({ allowed: false, reason: "daily_limit" });
  });

  it("locks writes and other-user reads from client roles", async () => {
    const owner = await addUser();
    const other = await addUser();
    await grantPlan(owner, "beta");
    await grantPlan(other, "beta");

    const { rows: tablePrivs } = await db.query<{
      plans_ins: boolean;
      plans_upd: boolean;
      plans_del: boolean;
      plans_sel: boolean;
      users_ins: boolean;
      users_upd: boolean;
      users_del: boolean;
      users_sel: boolean;
      anon_plans: boolean;
      anon_users: boolean;
    }>(`
      SELECT
        has_table_privilege('authenticated', 'public.plans', 'INSERT') AS plans_ins,
        has_table_privilege('authenticated', 'public.plans', 'UPDATE') AS plans_upd,
        has_table_privilege('authenticated', 'public.plans', 'DELETE') AS plans_del,
        has_table_privilege('authenticated', 'public.plans', 'SELECT') AS plans_sel,
        has_table_privilege('authenticated', 'public.user_plans', 'INSERT') AS users_ins,
        has_table_privilege('authenticated', 'public.user_plans', 'UPDATE') AS users_upd,
        has_table_privilege('authenticated', 'public.user_plans', 'DELETE') AS users_del,
        has_table_privilege('authenticated', 'public.user_plans', 'SELECT') AS users_sel,
        has_table_privilege('anon', 'public.plans', 'SELECT') AS anon_plans,
        has_table_privilege('anon', 'public.user_plans', 'SELECT') AS anon_users
    `);
    expect(tablePrivs[0]).toEqual({
      plans_ins: false,
      plans_upd: false,
      plans_del: false,
      plans_sel: true,
      users_ins: false,
      users_upd: false,
      users_del: false,
      users_sel: true,
      anon_plans: false,
      anon_users: false,
    });

    const { rows: fnPrivs } = await db.query<{
      anon_access: boolean;
      auth_access: boolean;
      auth_allowed: boolean;
      auth_plan: boolean;
      auth_consume: boolean;
      auth_call: boolean;
    }>(`
      SELECT
        has_function_privilege('anon', 'public.get_my_ai_access()', 'EXECUTE') AS anon_access,
        has_function_privilege('authenticated', 'public.get_my_ai_access()', 'EXECUTE') AS auth_access,
        has_function_privilege('authenticated', 'public.ai_user_allowed(uuid)', 'EXECUTE') AS auth_allowed,
        has_function_privilege('authenticated', 'ai.effective_plan(uuid)', 'EXECUTE') AS auth_plan,
        has_function_privilege('authenticated', 'public.consume_ai_usage(uuid,text,uuid,text)', 'EXECUTE') AS auth_consume,
        has_function_privilege('authenticated', 'public.consume_ai_call(uuid)', 'EXECUTE') AS auth_call
    `);
    expect(fnPrivs[0]).toEqual({
      anon_access: false,
      auth_access: true,
      auth_allowed: false,
      auth_plan: false,
      auth_consume: false,
      auth_call: false,
    });

    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [owner]);
    await db.query("SELECT set_config('request.jwt.claim.role', 'authenticated', false)");
    await db.exec("SET ROLE authenticated");
    try {
      const { rows } = await db.query<{ user_id: string }>("SELECT user_id FROM public.user_plans");
      expect(rows.map((row) => row.user_id)).toEqual([owner]);
      await expect(db.exec(`INSERT INTO public.user_plans (user_id, plan) VALUES ('${other}', 'beta')`)).rejects.toThrow(
        /permission denied/,
      );
      await expect(db.exec("UPDATE public.user_plans SET note = 'hack'")).rejects.toThrow(/permission denied/);
      await expect(db.exec("DELETE FROM public.user_plans")).rejects.toThrow(/permission denied/);
      await expect(db.exec("INSERT INTO public.plans (plan, ai_monthly_units, ai_daily_calls, ai_minute_calls) VALUES ('x', 1, 1, 1)")).rejects.toThrow(
        /permission denied/,
      );
      await expect(db.exec("UPDATE public.plans SET ai_monthly_units = 9999")).rejects.toThrow(/permission denied/);
      await expect(db.exec("DELETE FROM public.plans")).rejects.toThrow(/permission denied/);
      await expect(db.query("SELECT ai.effective_plan($1)", [owner])).rejects.toThrow(/permission denied/);
      await expect(db.query("SELECT public.ai_user_allowed($1)", [owner])).rejects.toThrow(/permission denied/);
      await expect(db.query("SELECT public.consume_ai_usage($1, 'text', null, null)", [owner])).rejects.toThrow(
        /permission denied/,
      );
    } finally {
      await db.exec("RESET ROLE");
    }

    await db.exec("SET ROLE anon");
    try {
      await expect(db.query("SELECT * FROM public.user_plans")).rejects.toThrow(/permission denied/);
      await expect(db.query("SELECT * FROM public.plans")).rejects.toThrow(/permission denied/);
      await expect(db.query("SELECT public.get_my_ai_access()")).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec("RESET ROLE");
      await db.query("SELECT set_config('request.jwt.claim.sub', '', false)");
      await db.query("SELECT set_config('request.jwt.claim.role', '', false)");
    }
  });

  it("restores post-intake function bodies and drops the new tables", async () => {
    await db.exec(plansDownSql);
    expect(await functionDefs()).toEqual(originalDefs);
    const { rows } = await db.query<{
      plans: string | null;
      user_plans: string | null;
      access: string | null;
      allowed: string | null;
      plan: string | null;
    }>(`
      SELECT
        to_regclass('public.plans')::text AS plans,
        to_regclass('public.user_plans')::text AS user_plans,
        to_regprocedure('public.get_my_ai_access()')::text AS access,
        to_regprocedure('public.ai_user_allowed(uuid)')::text AS allowed,
        to_regprocedure('ai.effective_plan(uuid)')::text AS plan
    `);
    expect(rows[0]).toEqual({
      plans: null,
      user_plans: null,
      access: null,
      allowed: null,
      plan: null,
    });
  });
});
