import { describe, expect, it } from "vitest";
import {
  advanceMonthlyRecurringDate,
  advanceRecurringDate,
  advanceYearlyRecurringDate,
  firstRecurringDueDate,
  generateRecurringCatchUpDates,
  getCalendarAdapter,
  rescheduleRecurringBillingDay,
} from "./index";

describe("shared recurring calendar engine", () => {
  it("advances Hebrew monthly schedules through both Adars in leap year 5787", () => {
    const hebrew = getCalendarAdapter("hebrew");
    const adarOne = hebrew.toIsoDate({
      year: 5787,
      monthCode: "M05L",
      day: 30,
    });
    const adarTwo = hebrew.toIsoDate({
      year: 5787,
      monthCode: "M06",
      day: 29,
    });

    expect(advanceMonthlyRecurringDate(adarOne, "hebrew", 30)).toBe(adarTwo);
  });

  it("clamps Hebrew day 30 independently in every short month", () => {
    const hebrew = getCalendarAdapter("hebrew");
    let dueDate = hebrew.toIsoDate({ year: 5787, month: 1, day: 30 });

    for (let index = 0; index < 24; index += 1) {
      dueDate = advanceMonthlyRecurringDate(dueDate, "hebrew", 30);
      const representation = hebrew.fromIsoDate(dueDate);
      expect(representation.day).toBe(
        Math.min(
          30,
          hebrew.daysInMonth(representation.year, representation.month),
        ),
      );
    }
  });

  it("keeps daily and weekly schedules as Gregorian day intervals", () => {
    expect(
      advanceRecurringDate("2027-03-08", {
        calendarType: "hebrew",
        frequency: "daily",
        dayOfMonth: 30,
      }),
    ).toBe("2027-03-09");
    expect(
      advanceRecurringDate("2027-03-08", {
        calendarType: "hebrew",
        frequency: "weekly",
        dayOfMonth: 30,
      }),
    ).toBe("2027-03-15");
  });

  it("preserves M05L and M06 yearly intent across leap and simple years", () => {
    const hebrew = getCalendarAdapter("hebrew");
    const adarOne5787 = hebrew.toIsoDate({
      year: 5787,
      monthCode: "M05L",
      day: 15,
    });
    const adarTwo5787 = hebrew.toIsoDate({
      year: 5787,
      monthCode: "M06",
      day: 15,
    });

    const normalizedAdar = advanceYearlyRecurringDate(
      adarOne5787,
      "hebrew",
      15,
      "M05L",
      "constrain",
    );
    const adar = advanceYearlyRecurringDate(
      adarTwo5787,
      "hebrew",
      15,
      "M06",
      "constrain",
    );

    expect(hebrew.fromIsoDate(normalizedAdar)).toMatchObject({
      year: 5788,
      monthCode: "M06",
      day: 15,
    });
    expect(hebrew.fromIsoDate(adar)).toMatchObject({
      year: 5788,
      monthCode: "M06",
      day: 15,
    });
    const normalizedAdar5789 = advanceYearlyRecurringDate(
      normalizedAdar,
      "hebrew",
      15,
      "M05L",
      "constrain",
    );
    expect(hebrew.fromIsoDate(normalizedAdar5789)).toMatchObject({
      year: 5789,
      monthCode: "M06",
      day: 15,
    });
    expect(
      hebrew.fromIsoDate(
        advanceYearlyRecurringDate(
          normalizedAdar5789,
          "hebrew",
          15,
          "M05L",
          "constrain",
        ),
      ),
    ).toMatchObject({ year: 5790, monthCode: "M05L", day: 15 });
  });

  it("finds first due, reschedules, and catches up in the selected calendar", () => {
    const hebrew = getCalendarAdapter("hebrew");
    const start = hebrew.toIsoDate({ year: 5787, month: 5, day: 20 });
    const first = firstRecurringDueDate(start, "hebrew", 30);

    expect(hebrew.fromIsoDate(first)).toMatchObject({
      year: 5787,
      month: 5,
      day: 30,
    });
    expect(
      hebrew.fromIsoDate(
        rescheduleRecurringBillingDay(first, "hebrew", 12),
      ),
    ).toMatchObject({ year: 5787, month: 5, day: 12 });

    const catchUp = generateRecurringCatchUpDates(
      first,
      hebrew.toIsoDate({ year: 5787, month: 8, day: 30 }),
      {
        calendarType: "hebrew",
        frequency: "monthly",
        dayOfMonth: 30,
      },
    );
    expect(catchUp).toHaveLength(4);
    expect(catchUp[0]).toBe(first);
  });

  it("keeps Gregorian month-end behavior unchanged", () => {
    expect(firstRecurringDueDate("2024-01-31", "gregorian", 31)).toBe(
      "2024-01-31",
    );
    expect(advanceMonthlyRecurringDate("2024-01-31", "gregorian", 31)).toBe(
      "2024-02-29",
    );
    expect(advanceMonthlyRecurringDate("2026-01-31", "gregorian", 31)).toBe(
      "2026-02-28",
    );
    expect(
      rescheduleRecurringBillingDay("2026-02-15", "gregorian", 31),
    ).toBe("2026-02-28");
  });
});
