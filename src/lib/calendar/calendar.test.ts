import { describe, expect, it } from "vitest";
import {
  getCalendarAdapter,
  type CalendarDateInput,
} from "@/lib/calendar";
import {
  CALENDAR_PARITY_EXPECTED,
  CALENDAR_PARITY_FIXTURES,
  evaluateCalendarFixtures,
} from "../../../supabase/functions/_shared/calendar/parity-fixtures.ts";
import {
  getCalendarAdapter as getSharedCalendarAdapter,
} from "../../../supabase/functions/_shared/calendar/index.ts";
import {
  formatGregorianMonthLabel,
  getGregorianMonthKey,
} from "@/lib/utils/gregorian-month";

const gregorian = getCalendarAdapter("gregorian");
const hebrew = getCalendarAdapter("hebrew");

describe("calendar adapters", () => {
  it("round-trips Gregorian ISO dates through their representation", () => {
    for (const isoDate of ["1900-01-01", "2024-02-29", "2100-12-31"]) {
      const representation = gregorian.fromIsoDate(isoDate);
      expect(gregorian.toIsoDate(representation, "reject")).toBe(isoDate);
    }
  });

  it.each([
    ["2026-09-12", 5787, 1, "M01", 1],
    ["2026-09-11", 5786, 12, "M12", 29],
    ["2027-03-10", 5787, 7, "M06", 1],
    ["2026-12-10", 5787, 3, "M03", 30],
  ] as const)(
    "converts known truth %s to its Hebrew date",
    (isoDate, year, month, monthCode, day) => {
      expect(hebrew.fromIsoDate(isoDate)).toMatchObject({
        isoDate,
        year,
        month,
        monthCode,
        day,
      });
    },
  );

  it("round-trips every civil day from 1900 through 2100", () => {
    const date = new Date("1900-01-01T00:00:00Z");
    const end = new Date("2100-12-31T00:00:00Z");
    let count = 0;
    let mismatch: { expected: string; received: string } | null = null;

    while (date <= end) {
      const isoDate = date.toISOString().slice(0, 10);
      const converted = hebrew.fromIsoDate(isoDate);
      const roundTripped = hebrew.toIsoDate(converted);
      if (roundTripped !== isoDate) {
        mismatch = { expected: isoDate, received: roundTripped };
        break;
      }
      date.setUTCDate(date.getUTCDate() + 1);
      count += 1;
    }

    expect(mismatch).toBeNull();
    expect(count).toBe(73_414);
  });

  it("exposes leap-year Adars as distinct months", () => {
    const adarI = hebrew.fromIsoDate("2027-02-10");
    const adarII = hebrew.fromIsoDate("2027-03-10");

    expect(adarI).toMatchObject({
      year: 5787,
      month: 6,
      monthCode: "M05L",
      inLeapYear: true,
      monthsInYear: 13,
    });
    expect(adarII).toMatchObject({
      year: 5787,
      month: 7,
      monthCode: "M06",
    });
  });

  it("normalizes or rejects Adar I in a simple year by overflow policy", () => {
    const adarIInSimpleYear: CalendarDateInput = {
      year: 5788,
      monthCode: "M05L",
      day: 9,
    };

    expect(
      hebrew.fromIsoDate(
        hebrew.toIsoDate(adarIInSimpleYear, "constrain"),
      ).monthCode,
    ).toBe("M06");
    expect(() =>
      hebrew.toIsoDate(adarIInSimpleYear, "reject"),
    ).toThrow(RangeError);
  });

  it("clamps day 30 to 29 in every short month of simple and leap years", () => {
    for (const year of [5787, 5788]) {
      const monthsInYear = hebrew.fromIsoDate(
        hebrew.toIsoDate({ year, month: 1, day: 1 }),
      ).monthsInYear;

      for (let month = 1; month <= monthsInYear; month += 1) {
        if (hebrew.daysInMonth(year, month) === 29) {
          expect(hebrew.clampDay(year, month, 30)).toBe(29);
          expect(
            hebrew.fromIsoDate(
              hebrew.toIsoDate({ year, month, day: 30 }, "constrain"),
            ).day,
          ).toBe(29);
        }
      }
    }
  });

  it("sorts Hebrew month keys lexically in civil order through both Adars", () => {
    const starts = Array.from({ length: 13 }, (_, index) =>
      hebrew.toIsoDate({ year: 5787, month: index + 1, day: 1 }),
    );
    const keys = starts.map((date) => hebrew.monthKey(date));

    expect(keys).toEqual([
      "5787-01",
      "5787-02",
      "5787-03",
      "5787-04",
      "5787-05",
      "5787-06",
      "5787-07",
      "5787-08",
      "5787-09",
      "5787-10",
      "5787-11",
      "5787-12",
      "5787-13",
    ]);
    expect([...keys].sort()).toEqual(keys);
    expect(hebrew.fromIsoDate(starts[5]).monthCode).toBe("M05L");
    expect(hebrew.fromIsoDate(starts[6]).monthCode).toBe("M06");
  });

  it("handles Hebrew month and year boundaries", () => {
    expect(hebrew.startOfMonth("2026-12-10")).toBe("2026-11-11");
    expect(hebrew.endOfMonth("2026-12-10")).toBe("2026-12-10");
    expect(hebrew.startOfYear("2027-08-31")).toBe("2026-09-12");
    expect(hebrew.addMonths("2027-02-28", 1)).toBe("2027-03-30");
    expect(hebrew.addMonths("2027-03-30", -1)).toBe("2027-02-28");
    expect(hebrew.addMonths("2027-09-01", 1)).toBe("2027-10-01");
  });

  it("handles Gregorian month and year boundaries", () => {
    expect(gregorian.startOfMonth("2024-02-29")).toBe("2024-02-01");
    expect(gregorian.endOfMonth("2024-02-01")).toBe("2024-02-29");
    expect(gregorian.startOfYear("2024-12-31")).toBe("2024-01-01");
    expect(gregorian.addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(gregorian.addMonths("2024-12-31", 1)).toBe("2025-01-31");
  });

  it("preserves Gregorian P4 month keys and labels", () => {
    for (const isoDate of ["2024-02-29", "2026-09-12", "2100-12-31"]) {
      expect(gregorian.monthKey(isoDate)).toBe(
        getGregorianMonthKey(isoDate),
      );
    }

    for (const language of ["he", "en"] as const) {
      expect(gregorian.monthLabel("2026-09", language)).toBe(
        formatGregorianMonthLabel("2026-09", language),
      );
    }
  });

  it("formats numeric and long dates with Intl in Hebrew and English", () => {
    expect(gregorian.formatDate("2026-09-12", "he", "numeric")).toBe(
      new Intl.DateTimeFormat("he", {
        calendar: "gregory",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date("2026-09-12T00:00:00Z")),
    );
    expect(hebrew.formatDate("2026-09-12", "en", "long")).toContain(
      "Tishri",
    );
    expect(hebrew.formatDate("2026-09-12", "he", "long")).toContain(
      "תשרי",
    );
  });

  it("returns localized Hebrew month labels", () => {
    expect(hebrew.monthLabel("5787-01", "he")).toContain("תשרי");
    expect(hebrew.monthLabel("5787-07", "en")).toContain("Adar II");
  });

  it("produces identical fixture output through app and shared Edge paths", () => {
    const sharedOutputs = evaluateCalendarFixtures(CALENDAR_PARITY_FIXTURES);
    expect(sharedOutputs).toEqual(CALENDAR_PARITY_EXPECTED);
    expect(sharedOutputs).toEqual(
      CALENDAR_PARITY_FIXTURES.map((fixture) => {
        const adapter = getSharedCalendarAdapter(fixture.calendarType);
        return {
          representation: adapter.fromIsoDate(fixture.isoDate),
          monthKey: adapter.monthKey(fixture.isoDate),
          monthLabel: adapter.monthLabel(
            adapter.monthKey(fixture.isoDate),
            fixture.language,
          ),
          formatted: adapter.formatDate(
            fixture.isoDate,
            fixture.language,
            fixture.style,
          ),
        };
      }),
    );

    expect(
      CALENDAR_PARITY_FIXTURES.map((fixture) => {
        const adapter = getCalendarAdapter(fixture.calendarType);
        return {
          representation: adapter.fromIsoDate(fixture.isoDate),
          monthKey: adapter.monthKey(fixture.isoDate),
          monthLabel: adapter.monthLabel(
            adapter.monthKey(fixture.isoDate),
            fixture.language,
          ),
          formatted: adapter.formatDate(
            fixture.isoDate,
            fixture.language,
            fixture.style,
          ),
        };
      }),
    ).toEqual(sharedOutputs);
  });
});
