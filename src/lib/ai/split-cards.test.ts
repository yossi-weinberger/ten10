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
});
