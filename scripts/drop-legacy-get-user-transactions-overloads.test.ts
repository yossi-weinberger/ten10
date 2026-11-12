import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const dropSql = readFileSync(
  "supabase/migrations/20261112110000_drop_legacy_get_user_transactions_overloads.sql",
  "utf8",
);
const rollbackSql = readFileSync(
  "supabase/migrations/rollback/20261112110000_drop_legacy_get_user_transactions_overloads_down.sql",
  "utf8",
);

const legacy9 = "public.get_user_transactions(uuid,integer,integer,date,date,text[],text,text,text)";
const legacy12 =
  "public.get_user_transactions(uuid,integer,integer,text,text,text[],text,text,text,boolean,text[],text[])";
const current14 =
  "public.get_user_transactions(uuid,integer,integer,text,text,text[],text,text,text,boolean,text[],text[],text[],text)";

const currentStub = `
  CREATE FUNCTION public.get_user_transactions(
    p_user_id uuid,
    p_offset integer,
    p_limit integer,
    p_date_from text,
    p_date_to text,
    p_types text[],
    p_search text,
    p_sort_field text,
    p_sort_direction text,
    p_is_recurring boolean,
    p_recurring_statuses text[],
    p_recurring_frequencies text[],
    p_payment_methods text[],
    p_origin text DEFAULT NULL::text
  ) RETURNS TABLE(transactions jsonb, total_count bigint)
  LANGUAGE sql
  AS $$ SELECT NULL::jsonb, 0::bigint $$;
`;

type OverloadRow = {
  pronargs: number;
  pronargdefaults: number;
  prosecdef: boolean;
  proconfig: string[] | null;
  args: string;
};

let db: PGlite;

async function databaseWithLegacyOverloads(): Promise<{ database: PGlite; currentDefinition: string }> {
  const database = new PGlite();
  await database.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
  `);
  await database.exec(currentStub);
  const { rows } = await database.query<{ definition: string }>(
    "SELECT pg_get_functiondef($1::regprocedure) AS definition",
    [current14],
  );
  await database.exec(rollbackSql);
  return { database, currentDefinition: rows[0].definition };
}

async function overload(signature: string): Promise<OverloadRow | undefined> {
  const { rows } = await db.query<OverloadRow>(
    `SELECT p.pronargs,
            p.pronargdefaults,
            p.prosecdef,
            p.proconfig,
            pg_get_function_arguments(p.oid) AS args
     FROM pg_proc AS p
     WHERE p.oid = to_regprocedure($1)`,
    [signature],
  );
  return rows[0];
}

async function executePrivileges(signature: string): Promise<{
  anon: boolean;
  authenticated: boolean;
  serviceRole: boolean;
  publicRole: boolean;
}> {
  const { rows } = await db.query<{
    anon: boolean;
    authenticated: boolean;
    service_role: boolean;
    public_role: boolean;
  }>(
    `SELECT has_function_privilege('anon', $1::regprocedure, 'EXECUTE') AS anon,
            has_function_privilege('authenticated', $1::regprocedure, 'EXECUTE') AS authenticated,
            has_function_privilege('service_role', $1::regprocedure, 'EXECUTE') AS service_role,
            has_function_privilege('public', $1::regprocedure, 'EXECUTE') AS public_role`,
    [signature],
  );
  const row = rows[0];
  return {
    anon: row.anon,
    authenticated: row.authenticated,
    serviceRole: row.service_role,
    publicRole: row.public_role,
  };
}

beforeAll(async () => {
  db = (await databaseWithLegacyOverloads()).database;
}, 30_000);

describe("legacy get_user_transactions overloads", () => {
  it("drops only the 9-argument and 12-argument signatures", () => {
    const drops = [...dropSql.matchAll(/^DROP FUNCTION IF EXISTS ([^;]+);/gm)].map((match) =>
      match[1].replace(/\s+/g, ""),
    );
    expect(drops).toEqual([
      "public.get_user_transactions(uuid,integer,integer,date,date,text[],text,text,text)",
      "public.get_user_transactions(uuid,integer,integer,text,text,text[],text,text,text,boolean,text[],text[])",
    ]);
  });

  it("recreates both legacy overloads as security invoker with the captured defaults and search_path", async () => {
    const nine = await overload(legacy9);
    const twelve = await overload(legacy12);

    expect(nine).toMatchObject({
      pronargs: 9,
      pronargdefaults: 8,
      prosecdef: false,
      args: "p_user_id uuid, p_offset integer DEFAULT 0, p_limit integer DEFAULT 20, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date, p_types text[] DEFAULT NULL::text[], p_search text DEFAULT NULL::text, p_sort_field text DEFAULT 'created_at'::text, p_sort_direction text DEFAULT 'desc'::text",
    });
    expect(nine?.proconfig?.join(",")).toContain("search_path=public");

    expect(twelve).toMatchObject({
      pronargs: 12,
      pronargdefaults: 0,
      prosecdef: false,
      args: "p_user_id uuid, p_offset integer, p_limit integer, p_date_from text, p_date_to text, p_types text[], p_search text, p_sort_field text, p_sort_direction text, p_is_recurring boolean, p_recurring_statuses text[], p_recurring_frequencies text[]",
    });
    expect(twelve?.proconfig?.join(",")).toContain("search_path=public");
  });

  it("grants execute on the recreated overloads to authenticated and service_role only", async () => {
    expect(await executePrivileges(legacy9)).toEqual({
      anon: false,
      authenticated: true,
      serviceRole: true,
      publicRole: false,
    });
    expect(await executePrivileges(legacy12)).toEqual({
      anon: false,
      authenticated: true,
      serviceRole: true,
      publicRole: false,
    });
  });

  it("removes the legacy overloads and leaves the current overload unchanged", async () => {
    const dropped = await databaseWithLegacyOverloads();
    await dropped.database.exec(dropSql);

    const legacy9Result = await dropped.database.query<{ present: string | null }>(
      "SELECT to_regprocedure($1)::text AS present",
      [legacy9],
    );
    const legacy12Result = await dropped.database.query<{ present: string | null }>(
      "SELECT to_regprocedure($1)::text AS present",
      [legacy12],
    );
    const { rows } = await dropped.database.query<{ definition: string; remaining: number }>(
      `SELECT pg_get_functiondef($1::regprocedure) AS definition,
              (SELECT count(*)
               FROM pg_proc
               WHERE proname = 'get_user_transactions'
                 AND pronamespace = 'public'::regnamespace) AS remaining`,
      [current14],
    );

    expect(legacy9Result.rows[0].present).toBeNull();
    expect(legacy12Result.rows[0].present).toBeNull();
    expect(rows[0].definition).toBe(dropped.currentDefinition);
    expect(Number(rows[0].remaining)).toBe(1);
  });
});
