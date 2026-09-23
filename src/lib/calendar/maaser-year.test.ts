import { describe, expect, it } from "vitest";
import {
  clampMaaserYearReportEnd,
  getCurrentMaaserYear,
  getErevRoshHashanah,
  getHebrewYear,
  getMaaserYearRange,
  isErevRoshHashanah,
  isMaaserYearCloseWindow,
} from "../../../supabase/functions/_shared/calendar/maaser-year.ts";

describe("maaser year range", () => {
  it("uses 1 Tishrei through 29 Elul for 5787", () => {
    const range = getMaaserYearRange(5787);

    expect(range).toEqual({
      hebrewYear: 5787,
      startDate: "2026-09-12",
      endDate: "2027-10-01",
      openingAsOfDate: "2026-09-11",
    });
    expect(getHebrewYear(range.startDate)).toBe(5787);
    expect(getHebrewYear(range.endDate)).toBe(5787);
    expect(getHebrewYear(range.openingAsOfDate)).toBe(5786);
  });

  it("keeps a non-leap year at 353-355 days", () => {
    const range = getMaaserYearRange(5786);
    const start = Date.parse(`${range.startDate}T00:00:00Z`);
    const end = Date.parse(`${range.endDate}T00:00:00Z`);
    const days = (end - start) / 86_400_000 + 1;

    expect(range.startDate).toBe("2025-09-23");
    expect(days).toBeGreaterThanOrEqual(353);
    expect(days).toBeLessThanOrEqual(355);
  });

  it("rejects non-positive years", () => {
    expect(() => getMaaserYearRange(0)).toThrow(/Invalid Hebrew year/);
  });
});

describe("maaser year close window", () => {
  it("treats 29 Elul as Erev Rosh Hashanah", () => {
    expect(getErevRoshHashanah(5786)).toBe("2026-09-11");
    expect(isErevRoshHashanah("2026-09-11")).toBe(true);
    expect(isErevRoshHashanah("2026-09-12")).toBe(false);
    expect(isErevRoshHashanah("2026-09-10")).toBe(false);
  });

  it("opens the close-year banner in late Elul and early Tishrei", () => {
    expect(isMaaserYearCloseWindow("2026-09-03")).toBe(true);
    expect(isMaaserYearCloseWindow("2026-09-11")).toBe(true);
    expect(isMaaserYearCloseWindow("2026-09-12")).toBe(true);
    expect(isMaaserYearCloseWindow("2026-09-18")).toBe(true);
    expect(isMaaserYearCloseWindow("2026-09-19")).toBe(false);
    expect(isMaaserYearCloseWindow("2026-08-20")).toBe(false);
  });
});

describe("current maaser year", () => {
  it("reads the Hebrew year of today and clamps unfinished years to today", () => {
    expect(getCurrentMaaserYear("2026-09-23")).toBe(5787);

    const range = getMaaserYearRange(5787);
    expect(clampMaaserYearReportEnd(range, "2026-09-23")).toBe("2026-09-23");
    expect(clampMaaserYearReportEnd(range, "2027-10-02")).toBe("2027-10-01");
    expect(clampMaaserYearReportEnd(range, "2026-09-01")).toBe("2026-09-12");
  });
});
