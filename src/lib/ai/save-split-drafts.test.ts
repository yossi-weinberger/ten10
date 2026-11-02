import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("@/lib/services/exchange-rate.service", () => ({ ExchangeRateService: { fetchExchangeRate: vi.fn() } }));

import { cardsToSave, splitSaveKey } from "./save-split-drafts";
import type { SplitDraft } from "./split-cards";

function card(key: string, overrides: Partial<SplitDraft> = {}): SplitDraft {
  return {
    key,
    description: key,
    amount: 10,
    currency: "ILS",
    date: "2026-11-01",
    type: "expense",
    category: null,
    paymentMethod: null,
    isChomesh: false,
    checked: true,
    transactionId: null,
    itemId: null,
    ...overrides,
  };
}

describe("splitSaveKey", () => {
  it("keeps the key for a retry of the same rows", () => {
    expect(splitSaveKey("list", [card("a"), card("b")], 0)).toBe(splitSaveKey("list", [card("b"), card("a")], 0));
  });

  it("gives other rows, or the same rows after a save or undo, a new key", () => {
    const first = splitSaveKey("list", [card("a"), card("b")], 0);
    expect(splitSaveKey("list", [card("c")], 1)).not.toBe(first);
    expect(splitSaveKey("list", [card("a")], 0)).not.toBe(splitSaveKey("list", [card("a")], 1));
  });
});

describe("cardsToSave", () => {
  it("sends checked rows that were not saved yet", () => {
    const rows = [card("a"), card("b", { checked: false }), card("c", { transactionId: "t1" })];
    expect(cardsToSave(rows).map((row) => row.key)).toEqual(["a"]);
  });
});
