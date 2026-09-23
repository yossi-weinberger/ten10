import { describe, expect, it } from "vitest";
import {
  buildPeriodBoundaries,
  formatCalendarMonthLabel,
  getCalendarMonthKey,
  getCalendarMonthSeparators,
} from "./calendar-period";

describe("calendar period boundaries", () => {
  it("builds six Gregorian months with an exclusive next-period boundary", () => {
    expect(
      buildPeriodBoundaries("2026-09-23", 6, "gregorian"),
    ).toEqual([
      "2026-04-01",
      "2026-05-01",
      "2026-06-01",
      "2026-07-01",
      "2026-08-01",
      "2026-09-01",
      "2026-10-01",
    ]);
  });

  it("builds six Hebrew months across both leap-year Adars", () => {
    expect(buildPeriodBoundaries("2027-03-15", 6, "hebrew")).toEqual([
      "2026-10-12",
      "2026-11-11",
      "2026-12-11",
      "2027-01-09",
      "2027-02-08",
      "2027-03-10",
      "2027-04-08",
    ]);
  });

  it("builds all thirteen months of Hebrew leap year 5787 in order", () => {
    const boundaries = buildPeriodBoundaries(
      "2027-09-20",
      13,
      "hebrew",
    );

    expect(boundaries).toEqual([
      "2026-09-12",
      "2026-10-12",
      "2026-11-11",
      "2026-12-11",
      "2027-01-09",
      "2027-02-08",
      "2027-03-10",
      "2027-04-08",
      "2027-05-08",
      "2027-06-06",
      "2027-07-06",
      "2027-08-04",
      "2027-09-03",
      "2027-10-02",
    ]);
    expect(boundaries).toEqual([...boundaries].sort());
  });
});

describe("calendar month grouping", () => {
  it("keeps Gregorian keys and labels unchanged", () => {
    expect(getCalendarMonthKey("2026-01-31", "gregorian")).toBe(
      "2026-01",
    );
    expect(
      formatCalendarMonthLabel("2026-01", "gregorian", "en"),
    ).toBe("January 2026");
    expect(
      formatCalendarMonthLabel("2026-01", "gregorian", "he"),
    ).toBe("ינואר 2026");
  });

  it("does not split one Hebrew month at a Gregorian boundary", () => {
    const dates = [
      "2026-10-11",
      "2026-10-01",
      "2026-09-30",
      "2026-09-12",
      "2026-09-11",
    ];

    expect(getCalendarMonthSeparators(dates, "hebrew", "en")).toEqual([
      {
        beforeIndex: 4,
        monthKey: "5786-12",
        monthLabel: "Elul תשפ״ו",
      },
    ]);
  });
});
