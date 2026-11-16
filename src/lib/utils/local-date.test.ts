import { describe, expect, it } from "vitest";
import { calculateDateRange } from "@/hooks/useDateControls";
import {
  formatLocalDate,
  getCurrentLocalDate,
  parseLocalDate,
} from "./local-date";

describe("local date-only values", () => {
  it("keeps the local day shortly after midnight", () => {
    const date = new Date(2026, 8, 23, 0, 30);

    expect(getCurrentLocalDate(date)).toBe("2026-09-23");
  });

  it("keeps the local day shortly before midnight", () => {
    const date = new Date(2026, 8, 23, 23, 30);

    expect(getCurrentLocalDate(date)).toBe("2026-09-23");
  });

  it("round-trips date-only strings through local calendar fields", () => {
    const date = parseLocalDate("2026-09-23");

    expect(formatLocalDate(date)).toBe("2026-09-23");
    expect(date.getHours()).toBe(0);
  });

  it("pads years below 1000 to four digits", () => {
    expect(formatLocalDate(new Date(999, 0, 1))).toBe("0999-01-01");
  });

  it("rejects years below 100 so they never become 1900-based dates", () => {
    const parsed = parseLocalDate("0026-01-01");
    const twoDigitYear = new Date(2000, 0, 1);
    twoDigitYear.setFullYear(26);

    expect(Number.isNaN(parsed.getTime())).toBe(true);
    expect(formatLocalDate(twoDigitYear)).toBe("");
    expect(formatLocalDate(new Date(Number.NaN))).toBe("");
  });

  it("does not throw from render paths when the year is below 100", () => {
    const twoDigitYear = new Date(2000, 0, 1);
    twoDigitYear.setFullYear(26);

    expect(() => formatLocalDate(twoDigitYear)).not.toThrow();
    expect(() =>
      calculateDateRange(
        "all",
        { from: twoDigitYear, to: twoDigitYear },
        { month: "month", year: "year", all: "all", custom: "custom" },
        "gregorian",
      ),
    ).not.toThrow();
    expect(() =>
      calculateDateRange(
        "custom",
        { from: twoDigitYear, to: twoDigitYear },
        { month: "month", year: "year", all: "all", custom: "custom" },
        "gregorian",
      ),
    ).not.toThrow();
  });
});
