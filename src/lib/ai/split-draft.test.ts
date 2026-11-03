import { describe, expect, it } from "vitest";
import type { AnchoredSplitItem } from "../../../supabase/functions/_shared/ai/split-anchor.ts";
import { resolveRecurrence } from "../../../supabase/functions/_shared/ai/split-recurrence.ts";
import { buildRecurringDefinition } from "../../../supabase/functions/_shared/transaction-domain/recurring-definition.ts";
import { nextRecurringQuestion, recurringTotalOccurrences, saveStartDate, upcomingRecurringDates } from "./recurring-card";
import { digitsOnlyAmount, heldFromItem, recurringCardFromItem } from "./split-draft";

const MONTHLY: AnchoredSplitItem["recurrence"] = {
  frequency: "monthly",
  calendarType: "gregorian",
  startDate: "2026-11-10",
  dayOfMonth: 10,
  weekday: null,
  totalOccurrences: null,
  alreadyCharged: false,
};

function item(partial: Partial<AnchoredSplitItem>): AnchoredSplitItem {
  return {
    description: "ביטוח לאומי",
    amount: 250,
    currency: "ILS",
    date: "2026-11-01",
    checkDate: false,
    checkAmount: false,
    typeHint: "income",
    typeQuestion: "exempt-income",
    requestedRate: null,
    paymentMethod: null,
    category: null,
    ruleId: null,
    ruleName: null,
    recurrence: null,
    unsupportedFrequency: false,
    ...partial,
  };
}

describe("special types on cards", () => {
  it("puts a stated special type on the draft without asking", () => {
    const held = heldFromItem(item({ specialStated: true }), "ILS");
    expect(held.type).toBe("exempt-income");
    expect(held.typeQuestion).toBeNull();
  });

  it("keeps the question for a special type the model guessed", () => {
    const held = heldFromItem(item({ specialStated: false }), "ILS");
    expect(held.type).toBe("income");
    expect(held.typeQuestion).toBe("exempt-income");
  });

  it("carries a stated type onto a standing order and asks about a guessed one", () => {
    expect(recurringCardFromItem(item({ specialStated: true, recurrence: MONTHLY }), "ILS")).toMatchObject({
      type: "exempt-income",
      typeQuestion: null,
    });
    expect(recurringCardFromItem(item({ specialStated: false, recurrence: MONTHLY }), "ILS")).toMatchObject({
      type: "income",
      typeQuestion: "exempt-income",
    });
  });

  it("starts a standing order with no frequency when none was read, and asks for it", () => {
    const card = recurringCardFromItem(item({ specialStated: true, recurrence: null }), "ILS");
    expect(card).toMatchObject({ amount: 250, frequency: null, dayOfMonth: null, startDate: null });
    expect(nextRecurringQuestion(card)).toBe("frequency");
  });
});

describe("standing orders save what the card shows", () => {
  const today = "2026-11-03";

  it("saves the Hebrew day the card shows when no day was read", () => {
    const hebrew = { ...MONTHLY!, calendarType: "hebrew" as const, startDate: today, dayOfMonth: null };
    const card = recurringCardFromItem(item({ recurrence: hebrew }), "ILS");
    expect(card.dayOfMonth).toBe(23);
    const saved = buildRecurringDefinition({
      start_date: saveStartDate(card, today)!,
      frequency: "monthly",
      calendar_type: card.calendarType,
      day_of_month: card.dayOfMonth,
      amount: 100,
      currency: "ILS",
      type: "donation",
    });
    expect(saved.day_of_month).toBe(23);
    expect(saved.next_due_date).toBe(upcomingRecurringDates(card, today)[0]);
  });

  it("keeps the end of the year when this month's charge is included", () => {
    const rent = resolveRecurrence({
      frequency: "monthly",
      calendar: "gregorian",
      day_of_month: 1,
      weekday: null,
      start_kind: null,
      start: null,
      end_kind: "end_of_year",
      end_count: null,
      end: null,
      already_charged: true,
    }, today);
    const card = recurringCardFromItem(item({ recurrence: rent }), "ILS");
    const yes = { ...card, includeThisMonth: "yes" as const };
    expect(recurringTotalOccurrences(yes, today)).toBe(2);
    expect(upcomingRecurringDates(yes, today, 12)).toEqual(["2026-11-01", "2026-12-01"]);
    expect(upcomingRecurringDates({ ...card, includeThisMonth: "no" }, today, 12)).toEqual(["2026-12-01"]);
  });
});

describe("digitsOnlyAmount", () => {
  it("reads an amount reply like the card field", () => {
    expect(digitsOnlyAmount("12,50")).toBe(12.5);
    expect(digitsOnlyAmount("1,250")).toBe(1250);
    expect(digitsOnlyAmount("50$")).toBeNull();
  });
});
