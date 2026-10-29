import { effectiveIntakeCount, recordsOneAtATime } from "./intake-count.ts";
import { draftFromText } from "./text-draft.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const TODAY = "2026-10-28";
const TWO = "50 במכולת ו־120 לישיבה";

Deno.test("two amounts are several unless Jev is confident", () => {
  assert(effectiveIntakeCount(TWO, "one", 0.5) === "several", "unsure one");
  assert(effectiveIntakeCount(TWO, null, null) === "several", "no answer");
  assert(effectiveIntakeCount(TWO, "list", 0.9) === "list", "a confident list stays a list");
  assert(recordsOneAtATime("add_transaction", TWO, "one", 0.5), "never a single draft when unsure");
});

Deno.test("a confident one wins over numbers that are not amounts", () => {
  for (const text of [
    "קניתי מקרר ב־3 תשלומים של 900 שקל",
    "קיבלתי משכורת 12,500 והפרשתי ממנה 10 אחוז במחשבה, עדיין לא תרמתי",
    "שילמתי 180 על ארוחת ערב ל־5 אנשים",
    "Paid 320 euros for a family room for 4 nights",
  ]) {
    assert(effectiveIntakeCount(text, "one", 0.9) === "one", text);
  }
});

Deno.test("the parser alone finds several transactions", () => {
  for (const text of [
    TWO,
    "50 ש\"ח במכולת ו־120 לישיבה",
    "spent 40 on lunch and 25 on coffee",
    "20 לקפה, 35 לאוטובוס",
  ]) {
    assert(effectiveIntakeCount(text, null, null) === "several", text);
  }
});

Deno.test("the parser alone keeps one transaction with its amount", () => {
  const cases: [string, number][] = [
    ["ב־15 לחודש קניתי 200 שקל", 200],
    ["קניתי חלב ב־10:30 ב־12 שקל", 12],
    ["בשנת 2025 תרמתי 300", 300],
    ["קניתי 2 חולצות ב־100", 100],
    ["50 לכולל", 50],
    ["1,234.56 בסופר", 1234.56],
    ["תרמתי 2000 לישיבה", 2000],
    ["מעכשיו כל חודש ב־10 תרשום 1,500 שכר דירה", 1500],
    ["on the 15th I paid 200 for rent", 200],
  ];
  for (const [text, amount] of cases) {
    assert(effectiveIntakeCount(text, null, null) === "one", `${text}: count`);
    assert(draftFromText(text, TODAY)?.amount === amount, `${text}: amount`);
  }
});

Deno.test("an unsure several or list is kept", () => {
  assert(effectiveIntakeCount("50 לכולל", "one", 0.9) === "one", "one");
  assert(effectiveIntakeCount("1,234.56 בסופר", "several", 0.69) === "several", "unsure several");
  assert(effectiveIntakeCount("חלב 8 לחם 12 סה״כ 20 שקל", "list", 0.3) === "list", "unsure list");
  assert(effectiveIntakeCount("50 לכולל", "one", 0.4) === "one", "unsure one with one amount");
  assert(effectiveIntakeCount("Donated 100 ILS to the kollel", "several", 0.7) === "several", "at the floor");
});

Deno.test("count is ignored outside a transaction", () => {
  assert(!recordsOneAtATime("ask_data", TWO, "several", 0.95), "data question");
  assert(!recordsOneAtATime("create_rule", TWO, "list", 0.95), "rule");
  assert(!recordsOneAtATime("add_transaction", "50 לכולל", "one", 0.95), "single transaction");
});

Deno.test("two currency amounts are several even when Jev is sure it is one", () => {
  assert(effectiveIntakeCount("50 שקל במכולת ו־120 שקל לישיבה", "one", 0.95) === "several", "two currencies");
  assert(effectiveIntakeCount("קניתי מקרר ב-3000 שקל ב-3 תשלומים", "one", 1) === "one", "installments");
  assert(effectiveIntakeCount("Paid $250 for the hotel, $100 cash and $150 by credit card", "one", 0.91) === "one", "split payment");
  assert(effectiveIntakeCount("50, 50 ו־100", null, null) === "several", "total without a payment word");
  assert(effectiveIntakeCount("שילמתי 100 דולר שזה 370 שקל", "one", 0.95) === "one", "conversion");
  assert(effectiveIntakeCount("ארוחה ל-5 אנשים ב-400 שקל", "one", 0.9) === "one", "head count");
});