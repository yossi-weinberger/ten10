import { describe, it, expect } from "vitest";
import {
  formatCompactAmount,
  formatTrendBucketLabel,
  isPresentChartValue,
} from "./trend-chart.utils";

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
