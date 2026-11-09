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
      email text UNIQUE NOT NULL,
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

  it("cannot set plan for unknown email", async () => {
    const userId = await createUser("admin@example.com");
    await setAdmin(userId);
    await expect(
      db.query("SELECT public.admin_set_user_plan($1, $2)", ["unknown@example.com", "beta"]),
    ).rejects.toThrow(/User not found/);
  });

  it("cannot set unknown plan", async () => {
    const userId = await createUser("user2@example.com");
    await setAdmin(userId);
    await expect(
      db.query("SELECT public.admin_set_user_plan($1, $2)", ["user2@example.com", "unknown"]),
    ).rejects.toThrow(/Plan not found/);
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
    ).rejects.toThrow(/Cannot overwrite billing assignment/);
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
    ).rejects.toThrow(/Cannot remove billing assignment/);
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
