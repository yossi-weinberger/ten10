import { describe, expect, it } from "vitest";
import { recurringFromText } from "../../../supabase/functions/_shared/ai/recurring-draft.ts";
import {
  cardFromRecurringDraft,
  currentPeriodDueDate,
  includedMonthDueDate,
  nextRecurringQuestion,
  recurringCancelOpen,
  recurringCardReady,
  recurringShortDate,
  recurringSummarySentence,
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
    expect(upcomingRecurringDates(card())).toEqual(["2026-11-10", "2026-12-10", "2027-01-10"]);
  });

  it("stops when the order has fewer than three charges", () => {
    expect(upcomingRecurringDates(card({ totalOccurrences: 1 }))).toEqual(["2026-11-10"]);
  });

  it("recomputes the charges when the day changes", () => {
    const next = withRecurringDay(card(), 1, "2026-10-29");
    expect(upcomingRecurringDates(next)).toEqual(["2026-11-01", "2026-12-01", "2027-01-01"]);
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

  it("reads a real standing-order sentence into a card that can be saved", () => {
    const today = "2026-10-29";
    const cases: [string, string, number, string | null, boolean][] = [
      ["תגדיר לי הוראת קבע של 200 ש״ח לכולל בכל ראש חודש", "כולל", 200, "monthly", true],
      ["תגדיר לי הוראת קבע של 150 שקל לישיבה כל חודש", "ישיבה", 150, "monthly", true],
      ["הוראת קבע של 100 ש״ח לבית כנסת", "בית כנסת", 100, null, false],
    ];
    for (const [text, description, amount, frequency, ready] of cases) {
      const parsed = recurringFromText(text, today, "gregorian");
      expect(parsed, text).not.toBeNull();
      if (!parsed) continue;
      expect(parsed.draft.description, text).toBe(description);
      expect(parsed.draft.type, text).toBe("donation");
      expect(parsed.draft.amount, text).toBe(amount);
      expect(parsed.draft.frequency, text).toBe(frequency);
      expect(recurringCardReady(cardFromRecurringDraft(parsed.draft), today), text).toBe(ready);
    }
  });

  it("waits for the this-month answer before a save", () => {
    const charged = card({ alreadyCharged: true });
    expect(recurringCardReady(charged, "2026-10-29")).toBe(false);
    expect(recurringCardReady({ ...charged, includeThisMonth: "no" }, "2026-10-29")).toBe(true);
    expect(recurringCardReady(card({ amount: null }), "2026-10-29")).toBe(false);
    expect(recurringCardReady(card({ startDate: null, dayOfMonth: null }), "2026-10-29")).toBe(false);
  });

  const hebrewSummary = {
    type: "תרומה",
    currency: "₪",
    start: "10/11",
    lead: "הוראת קבע: ",
    payeePrefix: " ל",
    monthly: ", כל חודש ב-",
    from: ", החל מ-",
  };

  it("writes one Hebrew summary when the monthly order is complete", () => {
    const complete = card({ amount: 100, dayOfMonth: 10, startDate: "2026-11-10" });
    expect(nextRecurringQuestion(complete)).toBeNull();
    expect(recurringShortDate("2026-11-10", "gregorian")).toBe("10/11");
    expect(recurringSummarySentence(complete, hebrewSummary)).toBe(
      "הוראת קבע: תרומה 100 ₪ לכולל, כל חודש ב-10, החל מ-10/11",
    );
  });

  it("asks one missing field at a time, amount first", () => {
    expect(nextRecurringQuestion(card({ amount: null, type: null }))).toBe("amount");
    expect(nextRecurringQuestion(card({ type: null }))).toBe("type");
    expect(nextRecurringQuestion(card({ frequency: null }))).toBe("frequency");
    expect(nextRecurringQuestion(card({ startDate: null, dayOfMonth: null }))).toBe("day");
    expect(nextRecurringQuestion(card({ alreadyCharged: true }))).toBe("includeThisMonth");
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
    }))).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
    expect(upcomingRecurringDates(card({
      startDate: "2026-03-31",
      dayOfMonth: 31,
    }))).toEqual(["2026-03-31", "2026-04-30", "2026-05-31"]);
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
