import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260923140714_get_period_financial_summary.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("get_period_financial_summary migration", () => {
  it("defines an additive calendar-neutral boundary RPC", () => {
    expect(migration).toContain(
      "get_period_financial_summary(uuid, date[])",
    );
    expect(migration).toContain("p_boundaries date[]");
    expect(migration).toContain("WITH ORDINALITY");
    expect(migration).toContain("LEAD(");
    expect(migration).toContain("t.date >= p.period_start");
    expect(migration).toContain("t.date < p.period_end");
    expect(migration).not.toMatch(/hebrew|date_trunc/i);
    expect(migration).not.toContain(
      "DROP FUNCTION get_monthly_financial_summary",
    );
    expect(migration).not.toContain("SECURITY DEFINER");
  });

  it("pins search_path and grants only authenticated execution", () => {
    expect(migration).toContain(
      "SET search_path = pg_catalog, public",
    );
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION get_period_financial_summary(uuid, date[]) FROM PUBLIC",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION get_period_financial_summary(uuid, date[]) TO authenticated",
    );
  });
});
