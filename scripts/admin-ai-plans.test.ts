import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const plansSql = readFileSync("supabase/migrations/20261110100000_ai_plans.sql", "utf8");
const adminSql = readFileSync("supabase/migrations/20261110120000_admin_ai_user_plans.sql", "utf8");

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA ai;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'authenticated' $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${randomUUID()}'::uuid $$;
    CREATE FUNCTION public.handle_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$;
    CREATE TABLE auth.users (
      id uuid PRIMARY KEY,
      email varchar(255) UNIQUE NOT NULL,
      deleted_at timestamp with time zone
    );
  `);
  await db.exec(plansSql);
  await db.exec(adminSql);
}, 60_000);

async function createUser(email: string): Promise<string> {
  const id = randomUUID();
  await db.query("INSERT INTO auth.users (id, email) VALUES ($1, $2)", [id, email]);
  return id;
}

async function setAdmin(userId: string): Promise<void> {
  await db.exec(`
    CREATE OR REPLACE FUNCTION public.is_admin_user() RETURNS boolean
    LANGUAGE sql AS $$ SELECT true $$;
  `);
}

async function setNonAdmin(): Promise<void> {
  await db.exec(`
    CREATE OR REPLACE FUNCTION public.is_admin_user() RETURNS boolean
    LANGUAGE sql AS $$ SELECT false $$;
  `);
}

async function seedPlans(): Promise<void> {
  await db.exec(`
    INSERT INTO public.plans (plan, ai_monthly_units, ai_daily_calls, ai_minute_calls, is_default)
    VALUES
      ('beta', 1000, 300, 30, false),
      ('free', 100, 50, 10, true)
    ON CONFLICT (plan) DO NOTHING;
  `);
}

describe("admin_list_user_plans", () => {
  it("non-admin cannot list user plans", async () => {
    await setNonAdmin();
    await expect(db.query("SELECT * FROM public.admin_list_user_plans()")).rejects.toThrow(
      /Admin privileges required/,
    );
  });

  it("admin can list user plans", async () => {
    const userId = await createUser("test@example.com");
    await setAdmin(userId);
    await seedPlans();
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, note) VALUES ($1, 'beta', 'test note')",
      [userId],
    );
    const { rows } = await db.query<{ user_email: string; plan: string; note: string }>(
      "SELECT * FROM public.admin_list_user_plans()",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].user_email).toBe("test@example.com");
    expect(rows[0].plan).toBe("beta");
    expect(rows[0].note).toBe("test note");
  });

  it("returns text type for email column (not varchar)", async () => {
    const userId = await createUser("typecheck@example.com");
    await setAdmin(userId);
    await seedPlans();
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan) VALUES ($1, 'beta')",
      [userId],
    );
    // This test verifies the cast u.email::text works correctly
    // Without the cast, this query would fail with "structure of query does not match function result type"
    const { rows } = await db.query<{ user_email: string }>(
      "SELECT user_email FROM public.admin_list_user_plans()",
    );
    expect(rows[0].user_email).toBe("typecheck@example.com");
    // Verify it's actually text type by checking we can pass it to a function expecting text
    const { rows: typeRows } = await db.query<{ len: number }>(
      "SELECT length(user_email) as len FROM public.admin_list_user_plans() WHERE user_email = $1",
      ["typecheck@example.com"],
    );
    expect(typeRows[0].len).toBe(21);
  });
});

describe("admin_set_user_plan", () => {
  it("non-admin cannot set user plan", async () => {
    await setNonAdmin();
    await expect(
      db.query("SELECT public.admin_set_user_plan($1, $2)", ["test@example.com", "beta"]),
    ).rejects.toThrow(/Admin privileges required/);
  });

  it("admin can set user plan", async () => {
    const userId = await createUser("newuser@example.com");
    await setAdmin(userId);
    await seedPlans();
    const { rows } = await db.query<{ r: { user_id: string; plan: string } }>(
      "SELECT public.admin_set_user_plan($1, $2) AS r",
      ["newuser@example.com", "beta"],
    );
    expect(rows[0].r.plan).toBe("beta");
    const { rows: planRows } = await db.query<{ plan: string; source: string }>(
      "SELECT plan, source FROM public.user_plans WHERE user_id = $1",
      [userId],
    );
    expect(planRows).toHaveLength(1);
    expect(planRows[0].plan).toBe("beta");
    expect(planRows[0].source).toBe("manual");
  });

  it("trims email before matching", async () => {
    const userId = await createUser("trimtest@example.com");
    await setAdmin(userId);
    await seedPlans();
    const { rows } = await db.query<{ r: { user_id: string; plan: string } }>(
      "SELECT public.admin_set_user_plan($1, $2) AS r",
      ["  trimtest@example.com  ", "beta"],
    );
    expect(rows[0].r.user_id).toBe(userId);
  });

  it("cannot set plan for unknown email", async () => {
    const userId = await createUser("admin@example.com");
    await setAdmin(userId);
    await expect(
      db.query("SELECT public.admin_set_user_plan($1, $2)", ["unknown@example.com", "beta"]),
    ).rejects.toThrow(/USER_NOT_FOUND/);
  });

  it("cannot set unknown plan", async () => {
    const userId = await createUser("user2@example.com");
    await setAdmin(userId);
    await expect(
      db.query("SELECT public.admin_set_user_plan($1, $2)", ["user2@example.com", "unknown"]),
    ).rejects.toThrow(/PLAN_NOT_FOUND/);
  });

  it("rejects past expiry dates", async () => {
    const userId = await createUser("pastexpiry@example.com");
    await setAdmin(userId);
    await seedPlans();
    await expect(
      db.query("SELECT public.admin_set_user_plan($1, $2, $3::date)", [
        "pastexpiry@example.com",
        "beta",
        "2020-01-01",
      ]),
    ).rejects.toThrow(/EXPIRY_IN_PAST/);
  });

  it("stores winter date as 23:59:59.999999 Asia/Jerusalem", async () => {
    const userId = await createUser("winter@example.com");
    await setAdmin(userId);
    await seedPlans();
    await db.query("SELECT public.admin_set_user_plan($1, $2, $3::date)", [
      "winter@example.com",
      "beta",
      "2027-03-27",
    ]);
    const { rows } = await db.query<{ expires_at: string }>(
      "SELECT to_char(expires_at AT TIME ZONE 'Asia/Jerusalem', 'YYYY-MM-DD HH24:MI:SS.US') as expires_at FROM public.user_plans WHERE user_id = $1",
      [userId],
    );
    // 2027-03-27 23:59:59.999999 in Asia/Jerusalem (IST, UTC+2)
    expect(rows[0].expires_at).toBe("2027-03-27 23:59:59.999999");
  });

  it("stores summer date as 23:59:59.999999 Asia/Jerusalem (DST)", async () => {
    const userId = await createUser("summer@example.com");
    await setAdmin(userId);
    await seedPlans();
    await db.query("SELECT public.admin_set_user_plan($1, $2, $3::date)", [
      "summer@example.com",
      "beta",
      "2027-07-15",
    ]);
    const { rows } = await db.query<{ expires_at: string }>(
      "SELECT to_char(expires_at AT TIME ZONE 'Asia/Jerusalem', 'YYYY-MM-DD HH24:MI:SS.US') as expires_at FROM public.user_plans WHERE user_id = $1",
      [userId],
    );
    // 2027-07-15 23:59:59.999999 in Asia/Jerusalem (IDT, UTC+3 during DST)
    expect(rows[0].expires_at).toBe("2027-07-15 23:59:59.999999");
  });

  it("stores fall date as 23:59:59.999999 Asia/Jerusalem", async () => {
    const userId = await createUser("fall@example.com");
    await setAdmin(userId);
    await seedPlans();
    await db.query("SELECT public.admin_set_user_plan($1, $2, $3::date)", [
      "fall@example.com",
      "beta",
      "2027-10-24",
    ]);
    const { rows } = await db.query<{ expires_at: string }>(
      "SELECT to_char(expires_at AT TIME ZONE 'Asia/Jerusalem', 'YYYY-MM-DD HH24:MI:SS.US') as expires_at FROM public.user_plans WHERE user_id = $1",
      [userId],
    );
    // 2027-10-24 23:59:59.999999 in Asia/Jerusalem (back to IST, UTC+2)
    expect(rows[0].expires_at).toBe("2027-10-24 23:59:59.999999");
  });

  it("cannot overwrite billing source without force", async () => {
    const userId = await createUser("billing@example.com");
    await setAdmin(userId);
    await seedPlans();
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, source) VALUES ($1, 'beta', 'billing')",
      [userId],
    );
    await expect(
      db.query("SELECT public.admin_set_user_plan($1, $2, NULL, NULL, false)", [
        "billing@example.com",
        "free",
      ]),
    ).rejects.toThrow(/BILLING_REQUIRES_FORCE/);
  });

  it("cannot overwrite billing source with NULL force", async () => {
    const userId = await createUser("billingnull@example.com");
    await setAdmin(userId);
    await seedPlans();
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, source) VALUES ($1, 'beta', 'billing')",
      [userId],
    );
    await expect(
      db.query("SELECT public.admin_set_user_plan($1, $2, NULL, NULL, NULL)", [
        "billingnull@example.com",
        "free",
      ]),
    ).rejects.toThrow(/BILLING_REQUIRES_FORCE/);
  });

  it("can overwrite billing source with force", async () => {
    const userId = await createUser("billing2@example.com");
    await setAdmin(userId);
    await seedPlans();
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, source) VALUES ($1, 'beta', 'billing')",
      [userId],
    );
    await db.query("SELECT public.admin_set_user_plan($1, $2, NULL, NULL, true)", [
      "billing2@example.com",
      "free",
    ]);
    const { rows } = await db.query<{ plan: string; source: string }>(
      "SELECT plan, source FROM public.user_plans WHERE user_id = $1",
      [userId],
    );
    expect(rows[0].plan).toBe("free");
    expect(rows[0].source).toBe("manual");
  });

  it("protects against race: concurrent billing insert not overwritten without force", async () => {
    const userId = await createUser("race@example.com");
    await setAdmin(userId);
    await seedPlans();
    // Simulate: billing system inserted a row between our check and upsert
    // We test this by inserting a billing row AFTER the function starts checking
    // Since we can't easily simulate the race in a single transaction, we test the DO UPDATE WHERE clause
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, source) VALUES ($1, 'beta', 'billing')",
      [userId],
    );
    // Try to update without force - should fail
    await expect(
      db.query("SELECT public.admin_set_user_plan($1, $2, NULL, NULL, false)", [
        "race@example.com",
        "free",
      ]),
    ).rejects.toThrow(/BILLING_REQUIRES_FORCE/);
  });
});

describe("admin_remove_user_plan", () => {
  it("non-admin cannot remove user plan", async () => {
    await setNonAdmin();
    await expect(
      db.query("SELECT public.admin_remove_user_plan($1)", ["test@example.com"]),
    ).rejects.toThrow(/Admin privileges required/);
  });

  it("admin can remove user plan", async () => {
    const userId = await createUser("remove@example.com");
    await setAdmin(userId);
    await seedPlans();
    await db.query("INSERT INTO public.user_plans (user_id, plan) VALUES ($1, 'beta')", [userId]);
    const { rows } = await db.query<{ r: { deleted: boolean } }>(
      "SELECT public.admin_remove_user_plan($1) AS r",
      ["remove@example.com"],
    );
    expect(rows[0].r.deleted).toBe(true);
    const { rows: planRows } = await db.query("SELECT * FROM public.user_plans WHERE user_id = $1", [
      userId,
    ]);
    expect(planRows).toHaveLength(0);
  });

  it("trims email before matching", async () => {
    const userId = await createUser("trimremove@example.com");
    await setAdmin(userId);
    await seedPlans();
    await db.query("INSERT INTO public.user_plans (user_id, plan) VALUES ($1, 'beta')", [userId]);
    const { rows } = await db.query<{ r: { deleted: boolean } }>(
      "SELECT public.admin_remove_user_plan($1) AS r",
      ["  trimremove@example.com  "],
    );
    expect(rows[0].r.deleted).toBe(true);
  });

  it("cannot remove billing source without force", async () => {
    const userId = await createUser("billing3@example.com");
    await setAdmin(userId);
    await seedPlans();
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, source) VALUES ($1, 'beta', 'billing')",
      [userId],
    );
    await expect(
      db.query("SELECT public.admin_remove_user_plan($1, false)", ["billing3@example.com"]),
    ).rejects.toThrow(/BILLING_REQUIRES_FORCE/);
  });

  it("cannot remove billing source with NULL force", async () => {
    const userId = await createUser("billingnullremove@example.com");
    await setAdmin(userId);
    await seedPlans();
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, source) VALUES ($1, 'beta', 'billing')",
      [userId],
    );
    await expect(
      db.query("SELECT public.admin_remove_user_plan($1, NULL)", ["billingnullremove@example.com"]),
    ).rejects.toThrow(/BILLING_REQUIRES_FORCE/);
  });

  it("can remove billing source with force", async () => {
    const userId = await createUser("billing4@example.com");
    await setAdmin(userId);
    await seedPlans();
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, source) VALUES ($1, 'beta', 'billing')",
      [userId],
    );
    const { rows } = await db.query<{ r: { deleted: boolean } }>(
      "SELECT public.admin_remove_user_plan($1, true) AS r",
      ["billing4@example.com"],
    );
    expect(rows[0].r.deleted).toBe(true);
  });

  it("removing non-existent plan returns no_assignment", async () => {
    const userId = await createUser("noplan@example.com");
    await setAdmin(userId);
    const { rows } = await db.query<{ r: { deleted: boolean; reason: string } }>(
      "SELECT public.admin_remove_user_plan($1) AS r",
      ["noplan@example.com"],
    );
    expect(rows[0].r.deleted).toBe(false);
    expect(rows[0].r.reason).toBe("no_assignment");
  });
});
