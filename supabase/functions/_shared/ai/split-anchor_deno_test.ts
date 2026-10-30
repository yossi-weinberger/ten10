import { anchorSplitItems, digitValue, splitReadContext, type AnchoredSplitItem } from "./split-anchor.ts";
import type { SplitItemInput } from "./split-schema.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const TODAY = "2026-10-19";

function item(overrides: Partial<SplitItemInput> = {}): SplitItemInput {
  return {
    description: "כולל",
    amount: 50,
    amount_text: "50",
    currency: "ILS",
    requested_rate: null,
    date: null,
    date_text: null,
    type: "donation",
    type_question: null,
    recurrence: null,
    payment_method: null,
    category: null,
    rule_id: null,
    ...overrides,
  };
}

function anchor(source: string, items: SplitItemInput[]): { items: AnchoredSplitItem[]; dropped: number } {
  return anchorSplitItems(source, items, splitReadContext(TODAY, {
    rules: [{ id: "rule-1", name: "גן", type: "recognized-expense" }],
    categories: ["מזון"],
  }));
}

Deno.test("one written 50 cannot anchor two items", () => {
  const result = anchor("50 לכולל", [item(), item({ description: "עוד" })]);
  assert(result.items.length === 1, "one item");
  assert(result.items[0]?.description === "כולל", "first item");
  assert(result.items[0]?.date === TODAY, "empty date is today");
  assert(result.dropped === 1, "the extra 50 is dropped");
});

Deno.test("two different amounts both stay and yesterday is computed", () => {
  const result = anchor("50 במכולת ו־120 לישיבה אתמול", [
    item({ description: "מכולת", type: "expense" }),
    item({
      description: "ישיבה",
      amount: 120,
      amount_text: "120",
      date_text: "אתמול",
      date: { kind: "days_ago", n: 1, weekday: null, day: null, month: null, year: null },
    }),
  ]);
  assert(result.dropped === 0, "none dropped");
  assert(result.items.length === 2, "two items");
  assert(result.items[1]?.amount === 120, "second amount");
  assert(result.items[1]?.date === "2026-10-18", "yesterday");
});

Deno.test("a single misread amount is asked, and a word amount is kept", () => {
  const misread = anchor("50 לכולל", [item({ amount: 60 })]);
  assert(misread.items.length === 1 && misread.items[0]?.amount === null, "one item asks for the amount");
  assert(misread.dropped === 0, "the only item is not dropped");
  const words = anchor("חמישים לכולל", [item({ amount_text: "חמישים" })]);
  assert(words.items.length === 1 && words.items[0]?.amount === 50 && words.items[0]?.checkAmount === true, "a word amount stays for review");
  const wrongWords = anchor("חמישים לכולל", [item({ amount: 60, amount_text: "חמישים" })]);
  assert(wrongWords.items[0]?.amount === 60 && wrongWords.items[0]?.checkAmount === true, "words are not re-parsed");
  const inside = anchor("150 לישיבה", [item()]);
  assert(inside.items[0]?.amount === null, "50 is not inside 150");
});

Deno.test("a future date is marked for review and a saved rule overrides the type", () => {
  const dated = anchor("50 לכולל מחר", [item({
    date_text: "מחר",
    date: { kind: "exact", n: null, weekday: null, day: 20, month: 10, year: 2026 },
  })]);
  assert(dated.items[0]?.date === null && dated.items[0]?.checkDate === true, "future date");
  const ruled = anchor("50 לגן", [item({ type: "expense", rule_id: "rule-1", category: "מזון" })]);
  assert(ruled.items[0]?.typeHint === "recognized-expense", "rule type");
  assert(ruled.items[0]?.ruleName === "גן", "rule name");
  assert(ruled.items[0]?.category === "מזון", "known category");
  const unknown = anchor("50 לגן", [item({ category: "לא קיים" })]);
  assert(unknown.items[0]?.category === null, "unknown category");
});

Deno.test("a word that is not an amount is kept and marked for review", () => {
  const result = anchor("שילמתי בסופר באשראי", [item({
    description: "סופר",
    amount: 250,
    amount_text: "בסופר",
    type: "expense",
  })]);
  assert(result.items.length === 1, "kept");
  assert(result.items[0]?.amount === 250 && result.items[0]?.checkAmount === true, "not anchored");
});

Deno.test("a thousand word scales the digits", () => {
  const hebrew = anchor("שילמתי 5 אלף", [item({ amount: 5000, amount_text: "5 אלף", type: "expense" })]);
  assert(hebrew.items[0]?.amount === 5000 && hebrew.items[0]?.checkAmount === false, "5 אלף");
  const kilo = anchor("paid 2.5K", [item({ amount: 2500, amount_text: "2.5K", type: "expense" })]);
  assert(kilo.items[0]?.amount === 2500 && kilo.items[0]?.checkAmount === false, "2.5K");
  const dual = anchor("שילמתי אלפיים", [item({ amount: 2000, amount_text: "אלפיים", type: "expense" })]);
  assert(dual.items[0]?.checkAmount === true, "אלפיים has no digits");
});

Deno.test("a date structure without its words is marked, and a rule clears the special question", () => {
  const dated = anchor("50 לכולל", [item({
    date: { kind: "days_ago", n: 1, weekday: null, day: null, month: null, year: null },
    date_text: null,
  })]);
  assert(dated.items[0]?.date === null && dated.items[0]?.checkDate === true, "missing date text");
  const ruled = anchor("50 לגן", [item({
    type: "expense",
    type_question: "exempt-income",
    rule_id: "rule-1",
  })]);
  assert(ruled.items[0]?.typeHint === "recognized-expense", "rule type");
  assert(ruled.items[0]?.typeQuestion === null, "no extra question");
});

Deno.test("the amount is anchored by its number, not by the written string", () => {
  const sign = anchor("קניתי בסופר ב־250 שקל", [item({
    amount: 250,
    amount_text: "₪250",
    description: "סופר",
    type: "expense",
  })]);
  assert(sign.items[0]?.amount === 250 && sign.items[0]?.checkAmount === false, "currency sign");
  const cents = anchor("Paid 75 NIS", [item({
    amount: 75,
    amount_text: "75.00",
    description: "parking",
    type: "expense",
  })]);
  assert(cents.items[0]?.amount === 75 && cents.items[0]?.checkAmount === false, "trailing zeroes");
  const stated = anchor("הוצאה מוכרת למעשר 220", [item({
    amount: 220,
    amount_text: "220",
    type: "recognized-expense",
    type_question: "recognized-expense",
  })]);
  assert(stated.items[0]?.typeQuestion === null, "a stated special type is not asked again");
});

Deno.test("digits in the message anchor when the currency word was left out of the evidence", () => {
  const standing = anchor("הוראת קבע 200 שקל לצדקה כל חודש", [item({
    amount: 200,
    amount_text: null,
    description: "צדקה",
  })]);
  assert(standing.items[0]?.amount === 200 && standing.items[0]?.checkAmount === false, "200 שקל");
  const dated = anchor("ב-12/10 שילמתי 80 שקל חשמל", [item({
    amount: 80,
    amount_text: null,
    description: "חשמל",
    type: "expense",
  })]);
  assert(dated.items[0]?.amount === 80 && dated.items[0]?.checkAmount === false, "80 שקל");
  const missing = anchor("תרמתי לצדקה", [item({ amount: 100, amount_text: null })]);
  assert(missing.items[0]?.amount === null, "a number that was not said is still asked");
});

Deno.test("digit evidence ignores thousand separators", () => {
  assert(digitValue("1,250") === 1250, "comma");
  assert(digitValue("חמישים") === null, "words");
  const result = anchor("שילמתי 1,250", [item({ amount: 1250, amount_text: "1,250" })]);
  assert(result.items[0]?.amount === 1250, "anchored");
});
