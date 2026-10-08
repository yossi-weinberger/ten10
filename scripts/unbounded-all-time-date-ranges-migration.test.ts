import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20261008120000_unbounded_all_time_date_ranges.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("unbounded all-time date range migration", () => {
  it("skips the start bound when the start parameter is null", () => {
    expect(migration).toContain("p_start_date IS NULL OR date >= p_start_date::date");
    expect(migration).toContain("get_analytics_range_stats");
    expect(migration).toContain("get_analytics_breakdowns");
    expect(migration).toContain("get_category_breakdown");
    expect(migration).toContain("get_daily_transaction_heatmap");
    expect(migration).toContain("get_donation_recipients_breakdown");
    expect(migration).toContain("get_payment_method_breakdown");
    expect(migration).toContain("get_total_income_and_chomesh_for_user");
    expect(migration).not.toContain("date BETWEEN p_start_date");
    expect(migration).not.toMatch(/CHECK\s*\(/i);
  });

  it("keeps existing range-stats signatures", () => {
    expect(migration).toContain("get_analytics_range_stats(\n  p_start_date text");
    expect(migration).toContain("titheable_income");
  });
});
