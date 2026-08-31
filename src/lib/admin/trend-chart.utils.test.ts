import { describe, it, expect } from "vitest";
import {
  formatAdminMixedAmount,
  sortAdminCurrencies,
  sumSelectedCurrencyTotals,
} from "./admin-currency.utils";
import {
  formatCompactAmount,
  formatTrendBucketLabel,
  isPresentChartValue,
} from "./trend-chart.utils";

const sampleByCurrency = {
  ILS: {
    income: 200000,
    expenses: 48000,
    donations: 29000,
    exempt_income: 100,
    recognized_expenses: 200,
    non_tithe_donation: 50,
  },
  GBP: {
    income: 15249.55,
    expenses: 56.57,
    donations: 634.19,
  },
};

describe("isPresentChartValue", () => {
  it("treats 0 as present", () => {
    expect(isPresentChartValue(0)).toBe(true);
  });

  it("treats positive numbers as present", () => {
    expect(isPresentChartValue(215249.55)).toBe(true);
  });

  it("rejects null, undefined, and empty string", () => {
    expect(isPresentChartValue(null)).toBe(false);
    expect(isPresentChartValue(undefined)).toBe(false);
    expect(isPresentChartValue("")).toBe(false);
  });
});

describe("formatTrendBucketLabel", () => {
  it("formats a daily bucket in he-IL without the raw ISO date", () => {
    const label = formatTrendBucketLabel("2026-08-10", "he-IL", true);
    expect(label).not.toBe("2026-08-10");
    expect(label).toMatch(/10/);
    expect(label.toLowerCase()).toMatch(/אוג|aug/);
  });

  it("formats a monthly bucket as month and year, not YYYY-MM", () => {
    const label = formatTrendBucketLabel("2026-08", "he-IL", false);
    expect(label).not.toBe("2026-08");
    expect(label).toMatch(/2026/);
    expect(label.toLowerCase()).toMatch(/אוג|aug/);
  });

  it("returns the original value when the date is invalid", () => {
    expect(formatTrendBucketLabel("not-a-date", "en-US", true)).toBe(
      "not-a-date"
    );
    expect(formatTrendBucketLabel("2026-13", "en-US", false)).toBe("2026-13");
  });
});

describe("formatCompactAmount", () => {
  it("formats a finite number without a shekel sign", () => {
    const label = formatCompactAmount(215000, "en-US");
    expect(label).toMatch(/215/);
    expect(label).not.toContain("₪");
  });

  it("returns an empty string for NaN", () => {
    expect(formatCompactAmount(Number.NaN, "en-US")).toBe("");
  });
});

describe("sortAdminCurrencies", () => {
  it("puts ILS first, USD second, then alphabetical", () => {
    expect(sortAdminCurrencies(["GBP", "USD", "CAD", "ILS"])).toEqual([
      "ILS",
      "USD",
      "CAD",
      "GBP",
    ]);
  });
});

describe("sumSelectedCurrencyTotals", () => {
  it("sums ILS and GBP primary types and related fields", () => {
    const totals = sumSelectedCurrencyTotals(sampleByCurrency, ["ILS", "GBP"]);
    expect(totals.income).toBeCloseTo(215249.55);
    expect(totals.expenses).toBeCloseTo(48056.57);
    expect(totals.donations).toBeCloseTo(29634.19);
    expect(totals.exempt_income).toBe(100);
    expect(totals.recognized_expenses).toBe(200);
    expect(totals.non_tithe_donation).toBe(50);
    expect(totals.total_managed).toBeCloseTo(215249.55 + 48056.57 + 29634.19);
  });

  it("drops GBP when it is not selected", () => {
    const totals = sumSelectedCurrencyTotals(sampleByCurrency, ["ILS"]);
    expect(totals.income).toBe(200000);
    expect(totals.expenses).toBe(48000);
    expect(totals.donations).toBe(29000);
  });

  it("returns zeros when nothing is selected", () => {
    const totals = sumSelectedCurrencyTotals(sampleByCurrency, []);
    expect(totals).toEqual({
      income: 0,
      expenses: 0,
      donations: 0,
      exempt_income: 0,
      recognized_expenses: 0,
      non_tithe_donation: 0,
      total_managed: 0,
    });
  });
});

describe("formatAdminMixedAmount", () => {
  it("uses a currency style for a single selected currency", () => {
    const label = formatAdminMixedAmount(200000, ["ILS"], "he-IL");
    expect(label).toMatch(/200/);
    expect(label).toMatch(/₪|ILS/);
  });

  it("omits a currency glyph when multiple currencies are selected", () => {
    const label = formatAdminMixedAmount(215000, ["ILS", "GBP"], "en-US");
    expect(label).toMatch(/215/);
    expect(label).not.toContain("₪");
    expect(label).not.toContain("£");
  });

  it("omits a currency glyph when nothing is selected", () => {
    const label = formatAdminMixedAmount(0, [], "en-US");
    expect(label).not.toContain("₪");
  });
});
