import { describe, expect, it } from "vitest";
import {
  formatGregorianMonthLabel,
  getGregorianMonthKey,
  getGregorianMonthSeparators,
} from "./gregorian-month";

describe("Gregorian month grouping", () => {
  it("uses stable zero-padded Gregorian year-month keys", () => {
    expect(getGregorianMonthKey("2026-01-31")).toBe("2026-01");
    expect(getGregorianMonthKey("2026-12-01")).toBe("2026-12");
    expect(getGregorianMonthKey("0002-01-19")).toBe("0002-01");
  });

  it("formats full Gregorian month labels in English and Hebrew", () => {
    expect(formatGregorianMonthLabel("2026-01", "en")).toBe("January 2026");
    expect(formatGregorianMonthLabel("2026-01", "he")).toBe("ינואר 2026");
  });

  it("returns semantic separators only after Gregorian month transitions", () => {
    const dates = [
      "2026-03-31",
      "2026-03-01",
      "2026-02-28",
      "2026-02-01",
      "2026-01-31",
    ];

    expect(getGregorianMonthSeparators(dates, "en")).toEqual([
      { beforeIndex: 2, monthKey: "2026-02", monthLabel: "February 2026" },
      { beforeIndex: 4, monthKey: "2026-01", monthLabel: "January 2026" },
    ]);
    expect(getGregorianMonthSeparators(dates, "he")).toEqual([
      { beforeIndex: 2, monthKey: "2026-02", monthLabel: "פברואר 2026" },
      { beforeIndex: 4, monthKey: "2026-01", monthLabel: "ינואר 2026" },
    ]);
  });
});
