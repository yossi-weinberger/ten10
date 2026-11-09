import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const baseSql = readFileSync("supabase/migrations/20261103100000_ai_intake.sql", "utf8");
const newSql = readFileSync("supabase/migrations/20261110130000_configurable_usage_weights.sql", "utf8");

/** One statement from a migration file. */
function statement(sql: string, start: string, end: string): string {
  const from = sql.indexOf(start);
  if (from < 0) throw new Error(`not in the migration: ${start}`);
  return sql.slice(from, sql.indexOf(end, from) + end.length);
}

let db: PGlite;

async function getWeight(kind: string): Promise<number | null> {
  const { rows } = await db.query<{ weight: number | null }>("SELECT ai.usage_weight($1) AS weight", [kind]);
  return rows[0].weight;
}

/** The usage_weight function from both migrations, on an in-memory Postgres. */
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE SCHEMA ai;
    
    -- Updated_at trigger handler (assumed to exist)
    CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS trigger
      LANGUAGE plpgsql
      AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$;
    
    -- Create the table and new function from the migration
    ${statement(newSql, "CREATE TABLE public.ai_usage_weights (", "\n);")}
    ${statement(newSql, "INSERT INTO public.ai_usage_weights", ";")}
    ${statement(newSql, "CREATE OR REPLACE FUNCTION ai.usage_weight(", "\n$$;")}
  `);
}, 60_000);

describe("configurable usage weights", () => {
  it("returns the hardcoded values from the seeded table", async () => {
    expect(await getWeight("receipt")).toBe(5);
    expect(await getWeight("speech")).toBe(3);
    expect(await getWeight("text")).toBe(1);
  });

  it("falls back to hardcoded values for missing kinds", async () => {
    // Delete one kind and verify fallback
    await db.exec("DELETE FROM public.ai_usage_weights WHERE kind = 'speech'");
    expect(await getWeight("speech")).toBe(3);
    
    // Unknown kind returns null (same as before)
    expect(await getWeight("unknown")).toBeNull();
  });

  it("returns updated values after changing a row", async () => {
    await db.exec("UPDATE public.ai_usage_weights SET units = 10 WHERE kind = 'receipt'");
    expect(await getWeight("receipt")).toBe(10);
    
    await db.exec("UPDATE public.ai_usage_weights SET units = 7 WHERE kind = 'text'");
    expect(await getWeight("text")).toBe(7);
  });

  it("enforces the non-negative constraint", async () => {
    await expect(
      db.exec("UPDATE public.ai_usage_weights SET units = -1 WHERE kind = 'receipt'")
    ).rejects.toThrow(/violates check constraint/);
  });

  it("allows inserting new kinds", async () => {
    await db.exec("INSERT INTO public.ai_usage_weights (kind, units) VALUES ('new_kind', 15)");
    expect(await getWeight("new_kind")).toBe(15);
  });
});
