import { describe, expect, it } from "vitest";
import {
  advanceMonthly,
  firstDueDate,
  rescheduleBillingDayInMonth,
} from "./recurring-date.utils";

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

describe("firstDueDate", () => {
  it("uses the first clamped billing day on or after the start across days 1-31 and all months", () => {
    for (let month = 1; month <= 12; month += 1) {
      const monthLength = daysInMonth(2026, month);
      const startDay = Math.min(15, monthLength);
      const startDate = isoDate(2026, month, startDay);

      for (let billingDay = 1; billingDay <= 31; billingDay += 1) {
        const candidateDay = Math.min(billingDay, monthLength);
        if (candidateDay >= startDay) {
          expect(firstDueDate(startDate, billingDay)).toBe(
            isoDate(2026, month, candidateDay),
          );
          continue;
        }

        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? 2027 : 2026;
        expect(firstDueDate(startDate, billingDay)).toBe(
          isoDate(
            nextYear,
            nextMonth,
            Math.min(billingDay, daysInMonth(nextYear, nextMonth)),
          ),
        );
      }
    }
  });
});

describe("rescheduleBillingDayInMonth", () => {
  it("keeps the Gregorian month and clamps days 1-31 across leap and non-leap years", () => {
    for (const year of [2024, 2026]) {
      for (let month = 1; month <= 12; month += 1) {
        for (let billingDay = 1; billingDay <= 31; billingDay += 1) {
          expect(
            rescheduleBillingDayInMonth(
              isoDate(year, month, Math.min(20, daysInMonth(year, month))),
              billingDay,
            ),
          ).toBe(
            isoDate(
              year,
              month,
              Math.min(billingDay, daysInMonth(year, month)),
            ),
          );
        }
      }
    }
  });
});

describe("advanceMonthly", () => {
  it("advances exactly one Gregorian month for days 1-31 across every month", () => {
    for (const year of [2024, 2026]) {
      for (let month = 1; month <= 12; month += 1) {
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;

        for (let billingDay = 1; billingDay <= 31; billingDay += 1) {
          expect(
            advanceMonthly(
              isoDate(year, month, daysInMonth(year, month)),
              billingDay,
            ),
          ).toBe(
            isoDate(
              nextYear,
              nextMonth,
              Math.min(billingDay, daysInMonth(nextYear, nextMonth)),
            ),
          );
        }
      }
    }
  });

  it("clamps February differently in leap and non-leap years", () => {
    expect(advanceMonthly("2024-01-31", 31)).toBe("2024-02-29");
    expect(advanceMonthly("2026-01-31", 31)).toBe("2026-02-28");
  });

  it("rolls December into January of the next year", () => {
    expect(advanceMonthly("2026-12-31", 31)).toBe("2027-01-31");
  });

  it("repeated catch-up preserves the requested billing day and clamps each month independently", () => {
    const actual: string[] = [];
    let dueDate = "2023-12-31";

    for (let index = 0; index < 15; index += 1) {
      dueDate = advanceMonthly(dueDate, 31);
      actual.push(dueDate);
    }

    expect(actual).toEqual([
      "2024-01-31",
      "2024-02-29",
      "2024-03-31",
      "2024-04-30",
      "2024-05-31",
      "2024-06-30",
      "2024-07-31",
      "2024-08-31",
      "2024-09-30",
      "2024-10-31",
      "2024-11-30",
      "2024-12-31",
      "2025-01-31",
      "2025-02-28",
      "2025-03-31",
    ]);
  });
});
