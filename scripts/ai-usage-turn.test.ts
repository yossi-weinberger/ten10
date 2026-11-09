import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/20261103100000_ai_intake.sql", "utf8");
const plansSql = readFileSync("supabase/migrations/20261110100000_ai_plans.sql", "utf8");

/** One statement of the AI migration, as it is in the file. */
function statement(start: string, end: string): string {
  const from = sql.indexOf(start);
  if (from < 0) throw new Error(`not in the migration: ${start}`);
  return sql.slice(from, sql.indexOf(end, from) + end.length);
}

type Decision = { allowed: boolean; reason: string | null; usage_id?: string };

let db: PGlite;

async function betaUser(): Promise<string> {
  const user = randomUUID();
  await db.query("INSERT INTO auth.users (id) VALUES ($1)", [user]);
  await db.query(
    "INSERT INTO public.user_plans (user_id, plan, source, note) VALUES ($1, 'beta', 'manual', 'test')",
    [user],
  );
  return user;
}

async function consume(user: string, turn: string | null, op: string | null): Promise<Decision> {
  const { rows } = await db.query<{ r: Decision }>(
    "SELECT public.consume_ai_usage($1, 'text', $2, $3) AS r",
    [user, turn, op],
  );
  return rows[0].r;
}

async function helperCall(user: string): Promise<Decision> {
  const { rows } = await db.query<{ r: Decision }>("SELECT ai.consume_call($1) AS r", [user]);
  return rows[0].r;
}

async function useUpMonth(user: string, units = 1000): Promise<void> {
  await db.query(
    "INSERT INTO ai.usage_counters (user_id, period_start, units_used) VALUES ($1, date_trunc('month', now() AT TIME ZONE 'UTC')::date, $2)",
    [user, units],
  );
}

async function unitsUsed(user: string): Promise<number> {
  const { rows } = await db.query<{ units: number }>(
    "SELECT coalesce(sum(units_used), 0)::int AS units FROM ai.usage_counters WHERE user_id = $1",
    [user],
  );
  return rows[0].units;
}

async function release(usageId: string | undefined): Promise<boolean> {
  const { rows } = await db.query<{ r: boolean }>("SELECT ai.release_usage($1) AS r", [usageId]);
  return rows[0].r;
}

/** The real usage tables and functions from the migration, on an in-memory Postgres. */
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE SCHEMA ai;
    CREATE SCHEMA auth;
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'service_role' $$;
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
  `);
  await db.exec(plansSql);
}, 60_000);

describe("one text message is one charge", () => {
  it("charges classify and split of one message once, in either order, and still counts both calls", async () => {
    const user = await betaUser();
    const first = randomUUID();
    expect(await consume(user, first, "intent")).toMatchObject({ allowed: true });
    expect(await consume(user, first, "split")).toMatchObject({ allowed: true });
    const second = randomUUID();
    expect(await consume(user, second, "split")).toMatchObject({ allowed: true });
    expect(await consume(user, second, "intent")).toMatchObject({ allowed: true });
    expect(await unitsUsed(user)).toBe(2);
    const { rows } = await db.query<{ calls: number }>(
      "SELECT calls FROM ai.usage_rate WHERE user_id = $1 AND bucket = 'day'",
      [user],
    );
    expect(rows[0].calls).toBe(4);
  });

  it("charges a split that brings no turn on its own", async () => {
    const user = await betaUser();
    expect(await consume(user, null, null)).toMatchObject({ allowed: true });
    expect(await consume(user, null, null)).toMatchObject({ allowed: true });
    expect(await unitsUsed(user)).toBe(2);
  });

  it("charges a data question once: classify, split and the question read share the message's turn", async () => {
    const user = await betaUser();
    const turn = randomUUID();
    for (const op of ["intent", "split", "question"]) {
      expect(await consume(user, turn, op)).toMatchObject({ allowed: true });
    }
    expect(await unitsUsed(user)).toBe(1);
  });

  it("charges a second use of an operation on the same turn on its own", async () => {
    const user = await betaUser();
    const turn = randomUUID();
    await consume(user, turn, "split");
    expect(await consume(user, turn, "split")).toMatchObject({ allowed: true });
    await consume(user, turn, "question");
    expect(await consume(user, turn, "question")).toMatchObject({ allowed: true });
    expect(await unitsUsed(user)).toBe(3);
    await consume(randomUUID(), turn, "split");
    expect(await unitsUsed(user)).toBe(3);
  });

  it("refuses the split and the question read once the monthly allowance is used up, with or without a turn", async () => {
    const user = await betaUser();
    await useUpMonth(user);
    const turn = randomUUID();
    expect(await consume(user, turn, "split")).toMatchObject({ allowed: false, reason: "quota_exhausted" });
    expect(await consume(user, turn, "intent")).toMatchObject({ allowed: false, reason: "quota_exhausted" });
    expect(await consume(user, turn, "question")).toMatchObject({ allowed: false, reason: "quota_exhausted" });
    expect(await consume(user, null, null)).toMatchObject({ allowed: false, reason: "quota_exhausted" });
    expect(await unitsUsed(user)).toBe(1000);
  });

  it("stops helper calls (duplicate ranking, the split's retry) once the month is used up", async () => {
    const open = await betaUser();
    await useUpMonth(open, 999);
    expect(await helperCall(open)).toMatchObject({ allowed: true });
    expect(await unitsUsed(open)).toBe(999);
    const spent = await betaUser();
    await useUpMonth(spent);
    expect(await helperCall(spent)).toMatchObject({ allowed: false, reason: "quota_exhausted" });
    const { rows } = await db.query("SELECT 1 FROM ai.usage_rate WHERE user_id = $1", [spent]);
    expect(rows).toHaveLength(0);
  });

  it("makes a split pay on its own when the turn's charge was given back or is stale", async () => {
    const user = await betaUser();
    const given = randomUUID();
    const charge = await consume(user, given, "intent");
    expect(await release(charge.usage_id)).toBe(true);
    expect(await unitsUsed(user)).toBe(0);
    expect(await consume(user, given, "split")).toMatchObject({ allowed: true });
    expect(await unitsUsed(user)).toBe(1);

    const stale = randomUUID();
    await consume(user, stale, "intent");
    await db.query("UPDATE ai.usage_events SET created_at = now() - interval '3 minutes' WHERE turn_id = $1", [stale]);
    expect(await consume(user, stale, "split")).toMatchObject({ allowed: true });
    expect(await unitsUsed(user)).toBe(3);
  });

  it("keeps the unit when one call of a shared turn fails", async () => {
    const user = await betaUser();
    const turn = randomUUID();
    const charge = await consume(user, turn, "intent");
    await consume(user, turn, "split");
    expect(await release(charge.usage_id)).toBe(false);
    expect(await unitsUsed(user)).toBe(1);
  });
});

describe("the Edge functions use the shared charge", () => {
  it("charges the split as the text message before its model call", () => {
    const split = readFileSync("supabase/functions/ai-split-items/index.ts", "utf8");
    const gate = split.indexOf('usage.consume(userData.user.id, "text", { id: readTurnId(body?.turn), op: "split" })');
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(split.indexOf("const first = await ask("));
  });

  it("charges the question read on the same turn before its model calls", () => {
    const read = readFileSync("supabase/functions/ai-read-question/index.ts", "utf8");
    const gate = read.indexOf('consume(userData.user.id, "text", { id: readTurnId(body?.turn), op: "question" })');
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(read.indexOf("callModel({"));
    expect(read).not.toContain("consumeCall(");
    expect(read).toContain("if (failedCalls === 2) await usage.release(allowed.usageId);");
  });

  it("charges the classify call on the same turn", () => {
    const classify = readFileSync("supabase/functions/ai-classify-intent/index.ts", "utf8");
    expect(classify).toContain('usage.consume(userData.user.id, "text", { id: readTurnId(body?.turn), op: "intent" })');
  });
});
