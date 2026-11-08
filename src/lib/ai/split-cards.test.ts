import { describe, expect, it } from "vitest";
import { cardsFromSplit } from "./split-cards";

describe("cardsFromSplit", () => {
  it("checks a complete item and leaves a missing type or date unchecked", () => {
    const cards = cardsFromSplit([
      { description: "מכולת", amount: 50, currency: "ILS", date: "2026-10-29", typeHint: "expense" },
      { description: "ישיבה", amount: 120, currency: "ILS", date: "2026-10-29", typeHint: "" },
      { description: "חב״ד", amount: 100, currency: "USD", date: null, typeHint: "donation" },
    ]);
    expect(cards.map((card) => card.checked)).toEqual([true, false, false]);
    expect(cards[1]?.type).toBeNull();
    expect(cards[2]?.date).toBeNull();
  });

  it("keeps a special type the message stated, and not one the model guessed", () => {
    const cards = cardsFromSplit([
      { description: "ביטוח לאומי", amount: 250, currency: "ILS", date: "2026-11-01", typeHint: "income", typeQuestion: "exempt-income", specialStated: true },
      { description: "ההורים", amount: 500, currency: "ILS", date: "2026-11-01", typeHint: "income", typeQuestion: "exempt-income", specialStated: false },
    ]);
    expect(cards.map((card) => card.type)).toEqual(["exempt-income", "income"]);
  });

  it("keeps the category and payment method the reader anchored", () => {
    const [card] = cardsFromSplit([
      { description: "מכולת", amount: 50, currency: "ILS", date: "2026-10-29", typeHint: "expense", category: "food", paymentMethod: "credit_card" },
    ]);
    expect(card?.category).toBe("food");
    expect(card?.paymentMethod).toBe("credit_card");
  });

  it("uses the profile currency when the message named none, and chomesh only on income", () => {
    const cards = cardsFromSplit([
      { description: "משכורת", amount: 9000, currency: "", date: "2026-10-29", typeHint: "income" },
      { description: "מכולת", amount: 20, currency: "", date: "2026-10-29", typeHint: "expense" },
    ], { defaultCurrency: "GBP", autoCalcChomesh: true });
    expect(cards.map((card) => card.currency)).toEqual(["GBP", "GBP"]);
    expect(cards.map((card) => card.isChomesh)).toEqual([true, false]);
  });

  it("marks chomesh on an income row when the message asked, whatever the setting", () => {
    const [asked, unsaid] = cardsFromSplit([
      { description: "משכורת", amount: 8000, currency: "ILS", date: "2026-11-01", typeHint: "income", chomesh: true },
      { description: "בונוס", amount: 500, currency: "ILS", date: "2026-11-01", typeHint: "income" },
    ], { autoCalcChomesh: false });
    expect(asked?.isChomesh).toBe(true);
    expect(unsaid?.isChomesh).toBe(false);
  });
});
