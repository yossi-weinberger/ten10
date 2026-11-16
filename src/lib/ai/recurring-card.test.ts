import { describe, expect, it } from "vitest";
import {
  currentPeriodDueDate,
  includedMonthDueDate,
  nextRecurringQuestion,
  recurringCancelOpen,
  recurringCardReady,
  saveStartDate,
  unsupportedRecurringFrequency,
  upcomingRecurringDates,
  withRecurringDay,
  type RecurringCard,
} from "./recurring-card";

function card(overrides: Partial<RecurringCard> = {}): RecurringCard {
  return {
    amount: 200,
    currency: "ILS",
    type: "donation",
    description: "כולל",
    category: null,
    paymentMethod: null,
    recipient: "",
    frequency: "monthly",
    calendarType: "gregorian",
    startDate: "2026-11-10",
    dayOfMonth: 10,
    anchorMonthCode: null,
    totalOccurrences: null,
    alreadyCharged: false,
    includeThisMonth: null,
    monthDuplicate: false,
    saved: false,
    savedId: null,
    savedCreatedAt: null,
    executionCount: 0,
    cancelled: false,
    ...overrides,
  };
}

describe("recurring card dates", () => {
  it("lists the next three monthly charges", () => {
    expect(upcomingRecurringDates(card(), "2026-10-29")).toEqual(["2026-11-10", "2026-12-10", "2027-01-10"]);
  });

  it("stops when the order has fewer than three charges", () => {
    expect(upcomingRecurringDates(card({ totalOccurrences: 1 }), "2026-10-29")).toEqual(["2026-11-10"]);
  });

  it("recomputes the charges when the day changes", () => {
    const next = withRecurringDay(card(), 1, "2026-10-29");
    expect(upcomingRecurringDates(next, "2026-10-29")).toEqual(["2026-11-01", "2026-12-01", "2027-01-01"]);
  });

  it("uses this month's due date when the charge already happened", () => {
    const charged = card({ alreadyCharged: true, includeThisMonth: "yes" });
    expect(currentPeriodDueDate(charged, "2026-10-29")).toBe("2026-10-10");
    expect(saveStartDate(charged, "2026-10-29")).toBe("2026-10-10");
    expect(saveStartDate({ ...charged, includeThisMonth: "no" }, "2026-10-29")).toBe("2026-11-10");
  });

  it("includes this month's later day instead of last month", () => {
    const charged = card({ alreadyCharged: true, includeThisMonth: "yes", startDate: "2026-10-10" });
    expect(currentPeriodDueDate(charged, "2026-10-03")).toBe("2026-09-10");
    expect(includedMonthDueDate(charged, "2026-10-03")).toBe("2026-10-10");
    expect(saveStartDate(charged, "2026-10-03")).toBe("2026-10-10");
    expect(saveStartDate({ ...charged, includeThisMonth: "no" }, "2026-10-03")).toBe("2026-11-10");
  });

  it("shows the same first charge the save writes", () => {
    const today = "2026-10-29";
    const day30 = card({
      alreadyCharged: true,
      dayOfMonth: 30,
      startDate: "2026-10-30",
      includeThisMonth: "no",
    });
    expect(saveStartDate(day30, today)).toBe("2026-11-30");
    expect(upcomingRecurringDates(day30, today).slice(0, 1)).toEqual(["2026-11-30"]);

    const day10 = card({ alreadyCharged: true, includeThisMonth: "yes" });
    expect(saveStartDate(day10, today)).toBe("2026-10-10");
    expect(upcomingRecurringDates(day10, today).slice(0, 1)).toEqual(["2026-10-10"]);

    const day30Yes = card({
      alreadyCharged: true,
      dayOfMonth: 30,
      startDate: "2026-10-30",
      includeThisMonth: "yes",
    });
    expect(saveStartDate(day30Yes, today)).toBe("2026-10-30");
    expect(upcomingRecurringDates(day30Yes, today).slice(0, 1)).toEqual(["2026-10-30"]);
  });

  it("waits for the this-month answer before a save", () => {
    const charged = card({ alreadyCharged: true });
    expect(recurringCardReady(charged, "2026-10-29")).toBe(false);
    expect(recurringCardReady({ ...charged, includeThisMonth: "no" }, "2026-10-29")).toBe(true);
    expect(recurringCardReady(card({ amount: null }), "2026-10-29")).toBe(false);
    expect(recurringCardReady(card({ startDate: null, dayOfMonth: null }), "2026-10-29")).toBe(false);
  });

  it("has no question left when the monthly order is complete", () => {
    expect(nextRecurringQuestion(card({ amount: 100, dayOfMonth: 10, startDate: "2026-11-10" }))).toBeNull();
  });

  it("uses the start date's day when the monthly day is empty", () => {
    expect(nextRecurringQuestion(card({ amount: 200, dayOfMonth: null, startDate: "2026-10-30" }))).toBeNull();
    expect(nextRecurringQuestion(card({ startDate: null, dayOfMonth: null }))).toBe("day");
  });

  it("asks one missing field at a time, amount first", () => {
    expect(nextRecurringQuestion(card({ amount: null, type: null }))).toBe("amount");
    expect(nextRecurringQuestion(card({ type: null }))).toBe("type");
    expect(nextRecurringQuestion(card({ frequency: null }))).toBe("frequency");
    expect(nextRecurringQuestion(card({ startDate: null, dayOfMonth: null }))).toBe("day");
    expect(nextRecurringQuestion(card({ alreadyCharged: true }))).toBe("includeThisMonth");
  });

  it("asks about a guessed special type after the type and blocks the save until answered", () => {
    const guessed = card({ type: "income", typeQuestion: "exempt-income" });
    expect(nextRecurringQuestion(guessed)).toBe("special");
    expect(recurringCardReady(guessed, "2026-11-01")).toBe(false);
    expect(nextRecurringQuestion(card({ type: null, typeQuestion: "exempt-income" }))).toBe("type");
    expect(recurringCardReady(card({ type: "exempt-income", typeQuestion: null }), "2026-11-01")).toBe(true);
  });

  it("refuses a weekly or yearly order instead of saving it as monthly", () => {
    expect(unsupportedRecurringFrequency("weekly")).toBe(true);
    expect(unsupportedRecurringFrequency("yearly")).toBe(true);
    expect(unsupportedRecurringFrequency("daily")).toBe(true);
    expect(unsupportedRecurringFrequency("monthly")).toBe(false);
    expect(unsupportedRecurringFrequency(null)).toBe(false);
    expect(nextRecurringQuestion(card({ frequency: "weekly" }))).toBeNull();
    expect(recurringCardReady(card({ frequency: "weekly" }), "2026-10-29")).toBe(false);
    expect(recurringCardReady(card({ frequency: "yearly" }), "2026-10-29")).toBe(false);
  });

  it("clamps day 31 in February and in a 30-day month", () => {
    expect(upcomingRecurringDates(card({
      startDate: "2026-01-31",
      dayOfMonth: 31,
    }), "2026-01-31")).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
    expect(upcomingRecurringDates(card({
      startDate: "2026-03-31",
      dayOfMonth: 31,
    }), "2026-03-31")).toEqual(["2026-03-31", "2026-04-30", "2026-05-31"]);
  });

  it("offers cancel for 7 days and hides it after the first charge", () => {
    const created = "2026-10-29T09:00:00.000Z";
    const createdAt = new Date(created);
    expect(recurringCancelOpen(created, 0, createdAt)).toBe(true);
    expect(recurringCancelOpen(created, 0, new Date(createdAt.getTime() + 6 * 24 * 60 * 60 * 1000))).toBe(true);
    expect(recurringCancelOpen(created, 0, new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000))).toBe(false);
    expect(recurringCancelOpen(created, 1, createdAt)).toBe(false);
  });
});

describe("withRecurringDay on the Hebrew calendar", () => {
  it("never keeps day 31, which a Hebrew month does not have", () => {
    const next = withRecurringDay(card({ calendarType: "hebrew" }), 31, "2026-11-02");
    expect(next.dayOfMonth).toBe(30);
  });

  it("keeps day 31 on the Gregorian calendar", () => {
    expect(withRecurringDay(card(), 31, "2026-11-02").dayOfMonth).toBe(31);
  });
});
