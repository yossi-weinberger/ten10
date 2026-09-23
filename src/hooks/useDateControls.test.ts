import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateDateRange,
  type DateRangeSelectionType,
} from "./useDateControls";

const labels = {
  month: "month",
  year: "year",
  all: "all",
  custom: "custom",
} satisfies Record<DateRangeSelectionType, string>;

describe("calculateDateRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const boundaryDates = [
    {
      name: "December 31",
      now: new Date(2026, 11, 31, 12),
      today: "2026-12-31",
      monthStart: "2026-12-01",
      yearStart: "2026-01-01",
    },
    {
      name: "January 1",
      now: new Date(2027, 0, 1, 12),
      today: "2027-01-01",
      monthStart: "2027-01-01",
      yearStart: "2027-01-01",
    },
    {
      name: "February 29",
      now: new Date(2024, 1, 29, 12),
      today: "2024-02-29",
      monthStart: "2024-02-01",
      yearStart: "2024-01-01",
    },
  ];

  for (const boundary of boundaryDates) {
    it(`keeps the month preset Gregorian on ${boundary.name}`, () => {
      vi.setSystemTime(boundary.now);

      expect(
        calculateDateRange(
          "month",
          undefined,
          labels,
          "gregorian",
          "en",
        ),
      ).toEqual({
        startDate: boundary.monthStart,
        endDate: boundary.today,
        label: "month",
      });
    });

    it(`keeps the year preset Gregorian on ${boundary.name}`, () => {
      vi.setSystemTime(boundary.now);

      expect(
        calculateDateRange(
          "year",
          undefined,
          labels,
          "gregorian",
          "en",
        ),
      ).toEqual({
        startDate: boundary.yearStart,
        endDate: boundary.today,
        label: "year",
      });
    });

    it(`keeps the all preset anchored at the Unix epoch on ${boundary.name}`, () => {
      vi.setSystemTime(boundary.now);

      expect(
        calculateDateRange(
          "all",
          undefined,
          labels,
          "gregorian",
          "en",
        ),
      ).toEqual({
        startDate: "1970-01-01",
        endDate: boundary.today,
        label: "all",
      });
    });
  }

  it("treats a custom single day as an inclusive one-day range", () => {
    vi.setSystemTime(new Date(2026, 11, 31, 12));
    const day = new Date(2026, 4, 7);

    expect(
      calculateDateRange(
        "custom",
        { from: day },
        labels,
        "gregorian",
        "en",
      ),
    ).toEqual({
      startDate: "2026-05-07",
      endDate: "2026-05-07",
      label: "custom",
    });
  });

  it("normalizes a reversed custom range into ascending order", () => {
    vi.setSystemTime(new Date(2026, 11, 31, 12));

    expect(
      calculateDateRange(
        "custom",
        {
          from: new Date(2026, 6, 20),
          to: new Date(2026, 6, 3),
        },
        labels,
        "gregorian",
        "en",
      ),
    ).toEqual({
      startDate: "2026-07-03",
      endDate: "2026-07-20",
      label: "custom",
    });
  });

  it("falls back to the current Gregorian month when custom has no start date", () => {
    vi.setSystemTime(new Date(2024, 1, 29, 12));

    expect(
      calculateDateRange(
        "custom",
        { from: undefined },
        labels,
        "gregorian",
        "en",
      ),
    ).toEqual({
      startDate: "2024-02-01",
      endDate: "2024-02-29",
      label: "custom",
    });
  });

  it("starts the Hebrew month and year at their primary-calendar boundaries", () => {
    vi.setSystemTime(new Date(2026, 8, 23, 12));

    expect(
      calculateDateRange("month", undefined, labels, "hebrew", "en"),
    ).toEqual({
      startDate: "2026-09-12",
      endDate: "2026-09-23",
      label: "month (Tishri 5787)",
    });
    expect(
      calculateDateRange("year", undefined, labels, "hebrew", "en"),
    ).toEqual({
      startDate: "2026-09-12",
      endDate: "2026-09-23",
      label: "year (5787)",
    });
  });

  it("keeps all-time and custom storage semantics in Hebrew mode", () => {
    vi.setSystemTime(new Date(2026, 8, 23, 12));

    expect(
      calculateDateRange("all", undefined, labels, "hebrew", "en"),
    ).toEqual({
      startDate: "1970-01-01",
      endDate: "2026-09-23",
      label: "all",
    });
    expect(
      calculateDateRange(
        "custom",
        {
          from: new Date(2026, 8, 10),
          to: new Date(2026, 8, 15),
        },
        labels,
        "hebrew",
        "en",
      ),
    ).toEqual({
      startDate: "2026-09-10",
      endDate: "2026-09-15",
      label: "custom",
    });
  });
});
