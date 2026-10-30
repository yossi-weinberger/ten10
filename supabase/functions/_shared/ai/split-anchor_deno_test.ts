import { anchorSplitItems, type SplitProposal } from "./split-anchor.ts";
import { resolveDatePhrase } from "./text-draft.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const TODAY = "2026-10-19";

function proposal(overrides: Partial<SplitProposal> = {}): SplitProposal {
  return {
    description: "כולל",
    amount: 50,
    amount_text: "50",
    currency: "ILS",
    date_phrase: "",
    type_hint: "donation",
    ...overrides,
  };
}

Deno.test("one written 50 cannot anchor two items", () => {
  const result = anchorSplitItems("50 לכולל", [proposal(), proposal({ description: "עוד" })], TODAY);
  assert(result.items.length === 1, "one item");
  assert(result.items[0]?.description === "כולל", "first item");
  assert(result.items[0]?.date === TODAY, "empty date is today");
  assert(result.dropped === 1, "the extra 50 is dropped");
});

Deno.test("two different amounts both stay", () => {
  const result = anchorSplitItems("50 במכולת ו־120 לישיבה", [
    proposal({ description: "מכולת", type_hint: "expense" }),
    proposal({ description: "ישיבה", amount: 120, amount_text: "120", date_phrase: "אתמול" }),
  ], TODAY);
  assert(result.dropped === 0, "none dropped");
  assert(result.items.length === 2, "two items");
  assert(result.items[1]?.amount === 120, "second amount");
  assert(result.items[1]?.date === "2026-10-18", "yesterday");
});

Deno.test("a misread amount and an unknown date do not invent a transaction", () => {
  const misread = anchorSplitItems("50 לכולל", [proposal({ amount: 60 })], TODAY);
  assert(misread.items.length === 0 && misread.dropped === 1, "parser read 50, not 60");
  const words = anchorSplitItems("חמישים לכולל", [proposal({ amount_text: "חמישים" })], TODAY);
  assert(words.items.length === 1 && words.items[0]?.amount === 50, "a word amount is kept");
  const wrongWords = anchorSplitItems("חמישים לכולל", [proposal({ amount: 60, amount_text: "חמישים" })], TODAY);
  assert(wrongWords.items.length === 0 && wrongWords.dropped === 1, "a misread word amount is dropped");
  const dated = anchorSplitItems("50 לכולל", [proposal({ date_phrase: "מחר" })], TODAY);
  assert(dated.items.length === 1 && dated.items[0]?.date === null, "unknown date stays null");
  const inside = anchorSplitItems("150 לישיבה", [proposal()], TODAY);
  assert(inside.items.length === 0 && inside.dropped === 1, "50 is not inside 150");
});

Deno.test("a date phrase the lists do not know is null", () => {
  assert(resolveDatePhrase("", TODAY) === TODAY, "empty");
  assert(resolveDatePhrase("   ", TODAY) === TODAY, "blank");
  assert(resolveDatePhrase("אתמול", TODAY) === "2026-10-18", "yesterday");
  assert(resolveDatePhrase("מחר", TODAY) === null, "unknown");
});
