import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20261112100000_stable_get_user_transactions_order.sql",
  "utf8",
);

const userId = "11111111-1111-1111-1111-111111111111";
const nullUserId = "22222222-2222-2222-2222-222222222222";

let db: PGlite;

function rowIds(transactions: unknown): string[] {
  const value =
    typeof transactions === "string" ? JSON.parse(transactions) : transactions;
  if (!Array.isArray(value)) {
    throw new Error(`expected a transaction array, got ${typeof value}`);
  }
  return value.map((row) => {
    if (!row || typeof row !== "object" || !("id" in row)) {
      throw new Error("transaction row is missing id");
    }
    const id = (row as { id: unknown }).id;
    if (typeof id !== "string") {
      throw new Error("transaction id is not text");
    }
    return id;
  });
}

async function page(
  offset: number,
  limit: number,
  field: string,
  direction: string,
  ownerId = userId,
): Promise<{ ids: string[]; total: number }> {
  const { rows } = await db.query<{
    transactions: unknown;
    total_count: number | string;
  }>(
    `SELECT transactions, total_count
     FROM public.get_user_transactions(
       $1::uuid, $2, $3,
       NULL, NULL, NULL, NULL,
       $4, $5,
       NULL, NULL, NULL, NULL, NULL
     )`,
    [ownerId, offset, limit, field, direction],
  );
  const row = rows[0];
  return {
    ids: rowIds(row.transactions),
    total: Number(row.total_count),
  };
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE SCHEMA ai;
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;

    CREATE TABLE public.transactions (
      id text PRIMARY KEY,
      user_id uuid NOT NULL,
      date date NOT NULL,
      amount numeric NOT NULL,
      currency text NOT NULL,
      description text,
      type text NOT NULL,
      category text,
      is_chomesh boolean,
      recipient text,
      payment_method text,
      created_at timestamptz,
      updated_at timestamptz,
      source_recurring_id text,
      origin text
    );

    CREATE TABLE public.recurring_transactions (
      id text PRIMARY KEY,
      status text,
      frequency text,
      execution_count integer,
      total_occurrences integer,
      day_of_month integer,
      start_date date,
      next_due_date date
    );

    CREATE TABLE ai.transaction_source_links (
      transaction_id text,
      source_artifact_id text
    );

    CREATE TABLE ai.source_artifacts (
      id text PRIMARY KEY,
      expires_at timestamptz,
      deleted_at timestamptz
    );
  `);
  await db.exec(migration);

  for (let n = 1; n <= 25; n += 1) {
    const id = `p-${String(n).padStart(2, "0")}`;
    await db.query(
      `INSERT INTO public.transactions
        (id, user_id, date, amount, currency, description, type, category, payment_method, created_at)
       VALUES ($1, $2::uuid, '2024-06-01', 10, 'ILS', 'PAGE', 'expense', 'food', 'cash', '2024-06-01T00:00:00Z')`,
      [id, userId],
    );
  }
}, 60_000);

describe("get_user_transactions stable order", () => {
  it("does not add a NULLS clause to the page sort", () => {
    const paged = migration.slice(
      migration.indexOf("paged AS"),
      migration.indexOf("OFFSET $10"),
    );
    expect(paged).toContain("ORDER BY %s %s, created_at DESC, id DESC");
    expect(paged).not.toMatch(/NULLS/i);
    expect(migration).toContain(
      "ORDER BY artifact.expires_at DESC NULLS LAST",
    );
  });

  it("pages a 25-row tie across the 20-row boundary without gaps", async () => {
    const expected = Array.from({ length: 25 }, (_, index) => {
      return `p-${String(25 - index).padStart(2, "0")}`;
    });

    for (const [field, direction] of [
      ["date", "asc"],
      ["date", "desc"],
      ["type", "asc"],
      ["amount", "desc"],
    ] as const) {
      const page1 = await page(0, 20, field, direction);
      const page2 = await page(20, 20, field, direction);
      const seen = [...page1.ids, ...page2.ids];
      const unique = [...new Set(seen)].sort();

      expect(page1.total, `${field} ${direction}`).toBe(25);
      expect(page2.total, `${field} ${direction}`).toBe(25);
      expect(page1.ids, `${field} ${direction} page 1`).toEqual(expected.slice(0, 20));
      expect(page2.ids, `${field} ${direction} page 2`).toEqual(expected.slice(20));
      expect(seen, `${field} ${direction}`).toHaveLength(25);
      expect(unique, `${field} ${direction}`).toEqual([...expected].sort());
    }
  });

  it("sorts a null created_at first on DESC, which is Postgres default", async () => {
    await db.query(
      `INSERT INTO public.transactions
        (id, user_id, date, amount, currency, description, type, category, payment_method, created_at)
       VALUES ('p-null', $1::uuid, '2024-06-01', 10, 'ILS', 'NULLTIE', 'expense', 'food', 'cash', NULL)`,
      [nullUserId],
    );
    await db.query(
      `INSERT INTO public.transactions
        (id, user_id, date, amount, currency, description, type, category, payment_method, created_at)
       VALUES ('p-set', $1::uuid, '2024-06-01', 10, 'ILS', 'NULLTIE', 'expense', 'food', 'cash', '2024-06-01T00:00:00Z')`,
      [nullUserId],
    );

    const desc = await page(0, 10, "date", "desc", nullUserId);
    expect(desc.ids).toEqual(["p-null", "p-set"]);
    const asc = await page(0, 10, "date", "asc", nullUserId);
    expect(asc.ids).toEqual(["p-null", "p-set"]);
  });
});
