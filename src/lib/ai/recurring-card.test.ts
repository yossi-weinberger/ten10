import { describe, expect, it } from "vitest";
import { recurringFromText } from "../../../supabase/functions/_shared/ai/recurring-draft.ts";
import {
  cardFromRecurringDraft,
  currentPeriodDueDate,
  recurringCardReady,
  saveStartDate,
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
});
