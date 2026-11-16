import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const rollbackSql = readFileSync("supabase/migrations/rollback/20261110110000_drop_shadow_rpcs_down.sql", "utf8");
const dropShadowSql = readFileSync("supabase/migrations/20261110110000_drop_shadow_rpcs.sql", "utf8");

let db: PGlite;

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
    CREATE TABLE ai.intake_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      normalized_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
      quality_signals jsonb,
      status text NOT NULL DEFAULT 'draft'
    );
    CREATE TABLE public.transactions (
      user_id uuid NOT NULL,
      type text NOT NULL,
      category text
    );
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT USAGE ON SCHEMA ai TO anon, authenticated, service_role;
  `);
  
  // Create the shadow RPCs using the rollback file
  await db.exec(rollbackSql);
  
  // Apply drop migration
  await db.exec(dropShadowSql);
}, 30_000);

describe("Shadow RPCs dropped", () => {
  it("read_ai_shadow_type_context does not exist", async () => {
    try {
      await db.query("SELECT pg_get_functiondef('public.read_ai_shadow_type_context(uuid)'::regprocedure)");
      throw new Error("Function should not exist");
    } catch (error: unknown) {
      expect(error).toBeDefined();
      expect((error as Error).message).toMatch(/function.*does not exist/i);
    }
  });

  it("record_ai_shadow_category does not exist", async () => {
    try {
      await db.query("SELECT pg_get_functiondef('public.record_ai_shadow_category(uuid,uuid,text,numeric)'::regprocedure)");
      throw new Error("Function should not exist");
    } catch (error: unknown) {
      expect(error).toBeDefined();
      expect((error as Error).message).toMatch(/function.*does not exist/i);
    }
  });

  it("record_ai_shadow_type does not exist", async () => {
    try {
      await db.query("SELECT pg_get_functiondef('public.record_ai_shadow_type(uuid,uuid,text,numeric)'::regprocedure)");
      throw new Error("Function should not exist");
    } catch (error: unknown) {
      expect(error).toBeDefined();
      expect((error as Error).message).toMatch(/function.*does not exist/i);
    }
  });
});
