import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const plansSql = readFileSync("supabase/migrations/20261110100000_ai_plans.sql", "utf8");
const adminSql = readFileSync("supabase/migrations/20261110120000_admin_ai_user_plans.sql", "utf8");
const consentsSql = readFileSync("supabase/migrations/20261112140000_ai_beta_consents.sql", "utf8");
const currentConsentSql = readFileSync(
  "supabase/migrations/20261112140100_ai_has_current_beta_consent.sql",
  "utf8",
);

let db: PGlite;
let adminUserId: string;
let normalUserId: string;

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
  await db.exec(consentsSql);
  await db.exec(currentConsentSql);

  await db.exec(`
    INSERT INTO public.plans (plan, ai_monthly_units, ai_daily_calls, ai_minute_calls, is_default)
    VALUES
      ('beta', 1000, 300, 30, false),
      ('free', 100, 50, 10, true)
    ON CONFLICT (plan) DO NOTHING;
  `);

  adminUserId = randomUUID();
  normalUserId = randomUUID();
  await db.query("INSERT INTO auth.users (id, email) VALUES ($1, $2), ($3, $4)", [
    adminUserId,
    "admin@example.com",
    normalUserId,
    "user@example.com",
  ]);
}, 60_000);

async function setAdmin(): Promise<void> {
  await db.exec(`
    CREATE OR REPLACE FUNCTION public.is_admin_user() RETURNS boolean
    LANGUAGE sql AS $$ SELECT true $$;
  `);
}

async function setAuthUser(userId: string): Promise<void> {
  await db.exec(`
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql AS $$ SELECT '${userId}'::uuid $$;
  `);
}

async function setAnon(): Promise<void> {
  await db.exec(`
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql AS $$ SELECT NULL::uuid $$;
    CREATE OR REPLACE FUNCTION auth.role() RETURNS text
    LANGUAGE sql AS $$ SELECT 'anon' $$;
  `);
}

describe("ai.current_beta_terms_version", () => {
  it("returns beta-v1", async () => {
    const { rows } = await db.query<{ current_beta_terms_version: string }>(
      "SELECT ai.current_beta_terms_version()",
    );
    expect(rows[0].current_beta_terms_version).toBe("beta-v1");
  });
});

describe("user_plans table changes", () => {
  it("has beta_terms_version column with length check", async () => {
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, beta_terms_version) VALUES ($1, 'beta', 'test-v1')",
      [normalUserId],
    );
    const { rows } = await db.query<{ beta_terms_version: string }>(
      "SELECT beta_terms_version FROM public.user_plans WHERE user_id = $1",
      [normalUserId],
    );
    expect(rows[0].beta_terms_version).toBe("test-v1");
    await db.query("DELETE FROM public.user_plans WHERE user_id = $1", [normalUserId]);
  });

  it("rejects beta_terms_version longer than 20 chars", async () => {
    await expect(
      db.query(
        "INSERT INTO public.user_plans (user_id, plan, beta_terms_version) VALUES ($1, 'beta', $2)",
        [normalUserId, "a".repeat(21)],
      ),
    ).rejects.toThrow(/violates check constraint/);
  });

  it("has is_active column defaulting to true", async () => {
    await db.query("INSERT INTO public.user_plans (user_id, plan) VALUES ($1, 'beta')", [
      normalUserId,
    ]);
    const { rows } = await db.query<{ is_active: boolean }>(
      "SELECT is_active FROM public.user_plans WHERE user_id = $1",
      [normalUserId],
    );
    expect(rows[0].is_active).toBe(true);
    await db.query("DELETE FROM public.user_plans WHERE user_id = $1", [normalUserId]);
  });
});

describe("ai.effective_plan with is_active", () => {
  it("returns plan when is_active=true", async () => {
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, is_active) VALUES ($1, 'beta', true)",
      [normalUserId],
    );
    const { rows } = await db.query<{ effective_plan: string }>(
      "SELECT ai.effective_plan($1) as effective_plan",
      [normalUserId],
    );
    expect(rows[0].effective_plan).toBe("beta");
    await db.query("DELETE FROM public.user_plans WHERE user_id = $1", [normalUserId]);
  });

  it("returns default plan when is_active=false", async () => {
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, is_active) VALUES ($1, 'beta', false)",
      [normalUserId],
    );
    const { rows } = await db.query<{ effective_plan: string }>(
      "SELECT ai.effective_plan($1) as effective_plan",
      [normalUserId],
    );
    expect(rows[0].effective_plan).toBe("free"); // default plan
    await db.query("DELETE FROM public.user_plans WHERE user_id = $1", [normalUserId]);
  });

  it("returns default plan when no user_plans row exists", async () => {
    const testUserId = randomUUID();
    const { rows } = await db.query<{ effective_plan: string }>(
      "SELECT ai.effective_plan($1) as effective_plan",
      [testUserId],
    );
    expect(rows[0].effective_plan).toBe("free");
  });
});

describe("accept_ai_beta_terms", () => {
  it("requires authentication", async () => {
    await setAnon();
    await expect(
      db.query("SELECT public.accept_ai_beta_terms('beta-v1')"),
    ).rejects.toThrow(/AUTH_REQUIRED/);
  });

  it("rejects version mismatch", async () => {
    await setAuthUser(normalUserId);
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, is_active) VALUES ($1, 'beta', true)",
      [normalUserId],
    );
    await expect(
      db.query("SELECT public.accept_ai_beta_terms('wrong-version')"),
    ).rejects.toThrow(/VERSION_MISMATCH/);
    await db.query("DELETE FROM public.user_plans WHERE user_id = $1", [normalUserId]);
  });

  it("rejects if user has no active plan", async () => {
    const testUserId = randomUUID();
    await db.query("INSERT INTO auth.users (id, email) VALUES ($1, $2)", [
      testUserId,
      "noplan@example.com",
    ]);
    await setAuthUser(testUserId);
    await expect(
      db.query("SELECT public.accept_ai_beta_terms('beta-v1')"),
    ).rejects.toThrow(/NO_ACTIVE_PLAN/);
  });

  it("rejects if user has inactive plan", async () => {
    await setAuthUser(normalUserId);
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, is_active) VALUES ($1, 'beta', false)",
      [normalUserId],
    );
    await expect(
      db.query("SELECT public.accept_ai_beta_terms('beta-v1')"),
    ).rejects.toThrow(/NO_ACTIVE_PLAN/);
    await db.query("DELETE FROM public.user_plans WHERE user_id = $1", [normalUserId]);
  });

  it("accepts valid version with active plan", async () => {
    await setAuthUser(normalUserId);
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, is_active) VALUES ($1, 'beta', true)",
      [normalUserId],
    );
    const { rows } = await db.query<{ accept_ai_beta_terms: { success: boolean; version: string } }>(
      "SELECT public.accept_ai_beta_terms('beta-v1')",
    );
    expect(rows[0].accept_ai_beta_terms.success).toBe(true);
    expect(rows[0].accept_ai_beta_terms.version).toBe("beta-v1");

    // Verify columns were set
    const { rows: planRows } = await db.query<{
      beta_terms_version: string;
      beta_terms_accepted_at: string;
    }>("SELECT beta_terms_version, beta_terms_accepted_at FROM public.user_plans WHERE user_id = $1", [
      normalUserId,
    ]);
    expect(planRows[0].beta_terms_version).toBe("beta-v1");
    expect(planRows[0].beta_terms_accepted_at).toBeTruthy();
    await db.query("DELETE FROM public.user_plans WHERE user_id = $1", [normalUserId]);
  });

  it("accepts metadata param but ignores it (compatibility)", async () => {
    await setAuthUser(normalUserId);
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, is_active) VALUES ($1, 'beta', true)",
      [normalUserId],
    );
    const { rows } = await db.query<{ accept_ai_beta_terms: { success: boolean } }>(
      "SELECT public.accept_ai_beta_terms('beta-v1', '{\"platform\":\"web\"}'::jsonb)",
    );
    expect(rows[0].accept_ai_beta_terms.success).toBe(true);
    await db.query("DELETE FROM public.user_plans WHERE user_id = $1", [normalUserId]);
  });

  it("is idempotent (can accept same version multiple times)", async () => {
    await setAuthUser(normalUserId);
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, is_active) VALUES ($1, 'beta', true)",
      [normalUserId],
    );
    await db.query("SELECT public.accept_ai_beta_terms('beta-v1')");
    const { rows } = await db.query<{ accept_ai_beta_terms: { success: boolean } }>(
      "SELECT public.accept_ai_beta_terms('beta-v1')",
    );
    expect(rows[0].accept_ai_beta_terms.success).toBe(true);
    await db.query("DELETE FROM public.user_plans WHERE user_id = $1", [normalUserId]);
  });
});

describe("ai_beta_consent_status", () => {
  it("requires authentication", async () => {
    await setAnon();
    await expect(db.query("SELECT public.ai_beta_consent_status()")).rejects.toThrow(/AUTH_REQUIRED/);
  });

  it("returns accepted=false when no plan exists", async () => {
    const testUserId = randomUUID();
    await db.query("INSERT INTO auth.users (id, email) VALUES ($1, $2)", [
      testUserId,
      "noplan2@example.com",
    ]);
    await setAuthUser(testUserId);
    const { rows } = await db.query<{
      ai_beta_consent_status: { accepted: boolean; version: string | null; current: string };
    }>("SELECT public.ai_beta_consent_status()");
    expect(rows[0].ai_beta_consent_status.accepted).toBe(false);
    expect(rows[0].ai_beta_consent_status.version).toBeNull();
    expect(rows[0].ai_beta_consent_status.current).toBe("beta-v1");
  });

  it("returns accepted=false when plan is inactive", async () => {
    await setAuthUser(normalUserId);
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, is_active, beta_terms_version) VALUES ($1, 'beta', false, 'beta-v1')",
      [normalUserId],
    );
    const { rows } = await db.query<{
      ai_beta_consent_status: { accepted: boolean; version: string | null; current: string };
    }>("SELECT public.ai_beta_consent_status()");
    expect(rows[0].ai_beta_consent_status.accepted).toBe(false);
    await db.query("DELETE FROM public.user_plans WHERE user_id = $1", [normalUserId]);
  });

  it("returns accepted=false when version not accepted", async () => {
    await setAuthUser(normalUserId);
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, is_active) VALUES ($1, 'beta', true)",
      [normalUserId],
    );
    const { rows } = await db.query<{
      ai_beta_consent_status: { accepted: boolean; version: string | null; current: string };
    }>("SELECT public.ai_beta_consent_status()");
    expect(rows[0].ai_beta_consent_status.accepted).toBe(false);
    expect(rows[0].ai_beta_consent_status.version).toBeNull();
    expect(rows[0].ai_beta_consent_status.current).toBe("beta-v1");
    await db.query("DELETE FROM public.user_plans WHERE user_id = $1", [normalUserId]);
  });

  it("returns accepted=true when current version accepted and active", async () => {
    await setAuthUser(normalUserId);
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, is_active, beta_terms_version) VALUES ($1, 'beta', true, 'beta-v1')",
      [normalUserId],
    );
    const { rows } = await db.query<{
      ai_beta_consent_status: { accepted: boolean; version: string; current: string };
    }>("SELECT public.ai_beta_consent_status()");
    expect(rows[0].ai_beta_consent_status.accepted).toBe(true);
    expect(rows[0].ai_beta_consent_status.version).toBe("beta-v1");
    expect(rows[0].ai_beta_consent_status.current).toBe("beta-v1");
    await db.query("DELETE FROM public.user_plans WHERE user_id = $1", [normalUserId]);
  });
});

describe("ai.has_beta_consent", () => {
  it("returns false when no plan exists", async () => {
    const testUserId = randomUUID();
    const { rows } = await db.query<{ has_beta_consent: boolean }>(
      "SELECT ai.has_beta_consent($1, 'beta-v1') as has_beta_consent",
      [testUserId],
    );
    expect(rows[0].has_beta_consent).toBe(false);
  });

  it("returns false when plan is inactive", async () => {
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, is_active, beta_terms_version) VALUES ($1, 'beta', false, 'beta-v1')",
      [normalUserId],
    );
    const { rows } = await db.query<{ has_beta_consent: boolean }>(
      "SELECT ai.has_beta_consent($1, 'beta-v1') as has_beta_consent",
      [normalUserId],
    );
    expect(rows[0].has_beta_consent).toBe(false);
    await db.query("DELETE FROM public.user_plans WHERE user_id = $1", [normalUserId]);
  });

  it("returns false when version not matched", async () => {
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, is_active, beta_terms_version) VALUES ($1, 'beta', true, 'beta-v1')",
      [normalUserId],
    );
    const { rows } = await db.query<{ has_beta_consent: boolean }>(
      "SELECT ai.has_beta_consent($1, 'beta-v2') as has_beta_consent",
      [normalUserId],
    );
    expect(rows[0].has_beta_consent).toBe(false);
    await db.query("DELETE FROM public.user_plans WHERE user_id = $1", [normalUserId]);
  });

  it("returns true when version matched and active", async () => {
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, is_active, beta_terms_version) VALUES ($1, 'beta', true, 'beta-v1')",
      [normalUserId],
    );
    const { rows } = await db.query<{ has_beta_consent: boolean }>(
      "SELECT ai.has_beta_consent($1, 'beta-v1') as has_beta_consent",
      [normalUserId],
    );
    expect(rows[0].has_beta_consent).toBe(true);
    await db.query("DELETE FROM public.user_plans WHERE user_id = $1", [normalUserId]);
  });
});

describe("public.ai_has_current_beta_consent", () => {
  it("calls the current SQL version from an empty search_path", async () => {
    const { rows } = await db.query<{ def: string; config: string[] | null }>(`
      SELECT pg_get_functiondef('public.ai_has_current_beta_consent(uuid)'::regprocedure) AS def,
             proconfig AS config
        FROM pg_proc
       WHERE proname = 'ai_has_current_beta_consent'
    `);
    expect(rows[0].def).toContain("ai.has_beta_consent(p_user_id, ai.current_beta_terms_version())");
    expect(rows[0].config).toEqual(["search_path=\"\""]);
  });

  it("returns true after the current version is accepted on an active plan", async () => {
    await db.query("INSERT INTO public.user_plans (user_id, plan, is_active) VALUES ($1, 'beta', true)", [
      normalUserId,
    ]);
    await setAuthUser(normalUserId);
    await db.query("SELECT public.accept_ai_beta_terms('beta-v1')");
    const { rows } = await db.query<{ ai_has_current_beta_consent: boolean }>(
      "SELECT public.ai_has_current_beta_consent($1)",
      [normalUserId],
    );
    expect(rows[0].ai_has_current_beta_consent).toBe(true);
    await db.query("DELETE FROM public.user_plans WHERE user_id = $1", [normalUserId]);
  });

  it("returns false without consent", async () => {
    const testUserId = randomUUID();
    const { rows } = await db.query<{ ai_has_current_beta_consent: boolean }>(
      "SELECT public.ai_has_current_beta_consent($1)",
      [testUserId],
    );
    expect(rows[0].ai_has_current_beta_consent).toBe(false);
  });

  it("returns false when the accepted version is not current", async () => {
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, is_active, beta_terms_version) VALUES ($1, 'beta', true, 'beta-v0')",
      [normalUserId],
    );
    const { rows } = await db.query<{ ai_has_current_beta_consent: boolean }>(
      "SELECT public.ai_has_current_beta_consent($1)",
      [normalUserId],
    );
    expect(rows[0].ai_has_current_beta_consent).toBe(false);
    await db.query("DELETE FROM public.user_plans WHERE user_id = $1", [normalUserId]);
  });

  it("returns false when the plan is inactive", async () => {
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, is_active, beta_terms_version) VALUES ($1, 'beta', false, 'beta-v1')",
      [normalUserId],
    );
    const { rows } = await db.query<{ ai_has_current_beta_consent: boolean }>(
      "SELECT public.ai_has_current_beta_consent($1)",
      [normalUserId],
    );
    expect(rows[0].ai_has_current_beta_consent).toBe(false);
    await db.query("DELETE FROM public.user_plans WHERE user_id = $1", [normalUserId]);
  });

  it("denies anon and authenticated, and allows service_role", async () => {
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, is_active, beta_terms_version) VALUES ($1, 'beta', true, 'beta-v1')",
      [normalUserId],
    );
    await db.exec("SET ROLE anon");
    try {
      await expect(
        db.query("SELECT public.ai_has_current_beta_consent($1)", [normalUserId]),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec("RESET ROLE");
    }
    await db.exec("SET ROLE authenticated");
    try {
      await expect(
        db.query("SELECT public.ai_has_current_beta_consent($1)", [normalUserId]),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec("RESET ROLE");
    }
    await db.exec("SET ROLE service_role");
    try {
      const { rows } = await db.query<{ ai_has_current_beta_consent: boolean }>(
        "SELECT public.ai_has_current_beta_consent($1)",
        [normalUserId],
      );
      expect(rows[0].ai_has_current_beta_consent).toBe(true);
    } finally {
      await db.exec("RESET ROLE");
    }
    await db.query("DELETE FROM public.user_plans WHERE user_id = $1", [normalUserId]);
  });
});

describe("admin_remove_user_plan with is_active", () => {
  it("sets is_active=false instead of DELETE", async () => {
    await setAdmin();
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, is_active, beta_terms_version) VALUES ($1, 'beta', true, 'beta-v1')",
      [normalUserId],
    );
    const { rows } = await db.query<{ admin_remove_user_plan: { deleted: boolean } }>(
      "SELECT public.admin_remove_user_plan('user@example.com', false)",
    );
    expect(rows[0].admin_remove_user_plan.deleted).toBe(true);

    // Verify row still exists but is_active=false
    const { rows: planRows } = await db.query<{
      is_active: boolean;
      beta_terms_version: string;
      plan: string;
    }>("SELECT is_active, beta_terms_version, plan FROM public.user_plans WHERE user_id = $1", [
      normalUserId,
    ]);
    expect(planRows).toHaveLength(1);
    expect(planRows[0].is_active).toBe(false);
    expect(planRows[0].beta_terms_version).toBe("beta-v1"); // beta columns kept
    expect(planRows[0].plan).toBe("beta"); // plan kept
    await db.query("DELETE FROM public.user_plans WHERE user_id = $1", [normalUserId]);
  });

  it("effective_plan returns default after deactivation", async () => {
    await setAdmin();
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, is_active) VALUES ($1, 'beta', true)",
      [normalUserId],
    );
    await db.query("SELECT public.admin_remove_user_plan('user@example.com', false)");
    const { rows } = await db.query<{ effective_plan: string }>(
      "SELECT ai.effective_plan($1) as effective_plan",
      [normalUserId],
    );
    expect(rows[0].effective_plan).toBe("free"); // default plan
    await db.query("DELETE FROM public.user_plans WHERE user_id = $1", [normalUserId]);
  });

  it("accept_ai_beta_terms rejects after deactivation", async () => {
    await setAdmin();
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, is_active, beta_terms_version) VALUES ($1, 'beta', true, 'beta-v1')",
      [normalUserId],
    );
    await db.query("SELECT public.admin_remove_user_plan('user@example.com', false)");

    await setAuthUser(normalUserId);
    await expect(
      db.query("SELECT public.accept_ai_beta_terms('beta-v1')"),
    ).rejects.toThrow(/NO_ACTIVE_PLAN/);
    await db.query("DELETE FROM public.user_plans WHERE user_id = $1", [normalUserId]);
  });
});

describe("admin_set_user_plan with is_active", () => {
  it("sets is_active=true when assigning new plan", async () => {
    await setAdmin();
    await db.query("SELECT public.admin_set_user_plan('user@example.com', 'beta', NULL, NULL, false)");
    const { rows } = await db.query<{ is_active: boolean }>(
      "SELECT is_active FROM public.user_plans WHERE user_id = $1",
      [normalUserId],
    );
    expect(rows[0].is_active).toBe(true);
    await db.query("DELETE FROM public.user_plans WHERE user_id = $1", [normalUserId]);
  });

  it("reactivates plan when re-assigning after removal", async () => {
    await setAdmin();
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, is_active) VALUES ($1, 'beta', false)",
      [normalUserId],
    );
    await db.query("SELECT public.admin_set_user_plan('user@example.com', 'beta', NULL, 'reactivated', false)");
    const { rows } = await db.query<{ is_active: boolean; note: string }>(
      "SELECT is_active, note FROM public.user_plans WHERE user_id = $1",
      [normalUserId],
    );
    expect(rows[0].is_active).toBe(true);
    expect(rows[0].note).toBe("reactivated");
    await db.query("DELETE FROM public.user_plans WHERE user_id = $1", [normalUserId]);
  });
});

describe("admin_list_user_plans with is_active", () => {
  it("returns is_active column", async () => {
    await setAdmin();
    await db.query(
      "INSERT INTO public.user_plans (user_id, plan, is_active) VALUES ($1, 'beta', true), ($2, 'beta', false)",
      [normalUserId, adminUserId],
    );
    const { rows } = await db.query<{ user_email: string; is_active: boolean }>(
      "SELECT * FROM public.admin_list_user_plans()",
    );
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const normalUser = rows.find((r) => r.user_email === "user@example.com");
    const adminUser = rows.find((r) => r.user_email === "admin@example.com");
    expect(normalUser?.is_active).toBe(true);
    expect(adminUser?.is_active).toBe(false);
    await db.query("DELETE FROM public.user_plans WHERE user_id IN ($1, $2)", [normalUserId, adminUserId]);
  });
});

describe("RLS and grants", () => {
  it("anon cannot call accept_ai_beta_terms", async () => {
    await setAnon();
    await expect(
      db.query("SELECT public.accept_ai_beta_terms('beta-v1')"),
    ).rejects.toThrow(/AUTH_REQUIRED/);
  });

  it("anon cannot call ai_beta_consent_status", async () => {
    await setAnon();
    await expect(db.query("SELECT public.ai_beta_consent_status()")).rejects.toThrow(/AUTH_REQUIRED/);
  });

  it("anon has no EXECUTE on admin_list_user_plans", async () => {
    await setAnon();
    const { rows } = await db.query<{ has_privilege: boolean }>(
      "SELECT has_function_privilege('anon', 'public.admin_list_user_plans()', 'EXECUTE') as has_privilege",
    );
    expect(rows[0].has_privilege).toBe(false);
  });

  it("authenticated role has EXECUTE on admin_list_user_plans", async () => {
    const { rows } = await db.query<{ has_privilege: boolean }>(
      "SELECT has_function_privilege('authenticated', 'public.admin_list_user_plans()', 'EXECUTE') as has_privilege",
    );
    expect(rows[0].has_privilege).toBe(true);
  });
});
