import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/20261103100000_ai_intake.sql", "utf8");

/** One statement of the AI migration, as it is in the file. */
function statement(start: string, end: string): string {
  const from = sql.indexOf(start);
  if (from < 0) throw new Error(`not in the migration: ${start}`);
  return sql.slice(from, sql.indexOf(end, from) + end.length);
}

type Scan = { count: number; pairs: unknown[] };

let db: PGlite;

async function scanAs(user: string): Promise<Scan> {
  await db.query("SELECT set_config('test.uid', $1, false)", [user]);
  const { rows } = await db.query<{ r: Scan }>("SELECT public.list_ai_saved_duplicate_pairs() AS r");
  return rows[0].r;
}

async function add(user: string, date: string, amount: number, currency = "ILS"): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    "INSERT INTO public.transactions (user_id, date, amount, currency, type) VALUES ($1, $2, $3, $4, 'donation') RETURNING id",
    [user, date, amount, currency],
  );
  return rows[0].id;
}

/** The real scan from the migration, on an in-memory Postgres with a minimal transactions table. */
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE SCHEMA ai;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT current_setting('test.uid')::uuid $$;
    CREATE TABLE public.transactions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      date date NOT NULL,
      amount numeric,
      currency text,
      description text,
      type text NOT NULL
    );
    ${statement("CREATE TABLE ai.duplicate_dismissals (", "\n);")}
    ${statement("CREATE FUNCTION public.list_ai_saved_duplicate_pairs(", "\n$$;")}
  `);
}, 60_000);

describe("saved duplicate scan", () => {
  it("finds a near-equal pair within three days and skips it once dismissed", async () => {
    const user = randomUUID();
    const a = await add(user, "2026-11-01", 100);
    const b = await add(user, "2026-11-03", 101);
    await add(user, "2026-11-20", 100);
    expect(await scanAs(user)).toMatchObject({ count: 1 });

    await db.query(
      "INSERT INTO ai.duplicate_dismissals (user_id, transaction_a, transaction_b) VALUES ($1, least($2::uuid, $3::uuid), greatest($2::uuid, $3::uuid))",
      [user, a, b],
    );
    expect(await scanAs(user)).toMatchObject({ count: 0, pairs: [] });
  });

  it("bounds the pairs for a flood of equal rows (was n²/2: 1,124,250 for 1500 rows)", async () => {
    const user = randomUUID();
    await db.query(
      "INSERT INTO public.transactions (user_id, date, amount, currency, type) SELECT $1, '2026-11-01', 50, 'ILS', 'donation' FROM generate_series(1, 1500)",
      [user],
    );
    const scan = await scanAs(user);
    expect(scan.count).toBeGreaterThan(0);
    expect(scan.count).toBeLessThanOrEqual(3 * 1000);
    expect(scan.pairs).toHaveLength(5);
  });

  it("scans only the latest 1000 transactions", async () => {
    const user = randomUUID();
    await add(user, "2020-01-01", 10);
    await add(user, "2020-01-02", 10);
    await db.query(
      "INSERT INTO public.transactions (user_id, date, amount, currency, type) SELECT $1, '2026-01-01'::date + g, 50, 'C' || g, 'donation' FROM generate_series(1, 1000) AS g",
      [user],
    );
    expect(await scanAs(user)).toMatchObject({ count: 0 });
  });
});
