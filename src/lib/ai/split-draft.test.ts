import { describe, expect, it } from "vitest";
import type { AnchoredSplitItem } from "../../../supabase/functions/_shared/ai/split-anchor.ts";
import { heldFromItem, recurringCardFromItem } from "./split-draft";

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
});
