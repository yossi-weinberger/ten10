import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260923220000_calculate_user_tithe_balance_as_of.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("tithe balance as-of migration", () => {
  it("adds a dated overload without replacing the all-time signature", () => {
    expect(migration).toMatch(
      /create\s+or\s+replace\s+function\s+public\.calculate_user_tithe_balance\s*\(\s*p_user_id\s+uuid\s*,\s*p_as_of_date\s+date\s*\)/i,
    );
    expect(migration).not.toMatch(
      /(?:drop|create\s+or\s+replace)\s+function\s+public\.calculate_user_tithe_balance\s*\(\s*p_user_id\s+uuid\s*\)/i,
    );
    expect(migration).toMatch(/and\s+date\s+<=\s+p_as_of_date/i);
    expect(migration).toMatch(/p_as_of_date is required/i);
  });

  it("keeps the same access guard and grants as the all-time function", () => {
    expect(migration).toMatch(/coalesce\(auth\.role\(\),\s*''\)\s*<>\s*'service_role'/i);
    expect(migration).toMatch(/auth\.uid\(\)\s+is distinct from p_user_id/i);
    expect(migration).toMatch(/grant execute on function public\.calculate_user_tithe_balance\(uuid, date\)/i);
    expect(migration).toMatch(/to authenticated, service_role/i);
    expect(migration).toMatch(/to_regprocedure\('public\.calculate_user_tithe_balance\(uuid\)'\)/i);
  });

  it("does not activate or modify cron", () => {
    expect(migration).not.toMatch(
      /cron\.|schedule\(|unschedule\(|testing\s*=\s*false/i,
    );
  });
});
