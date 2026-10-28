import { effectiveIntakeCount, recordsOneAtATime } from "./intake-count.ts";
import { draftFromText } from "./text-draft.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const TODAY = "2026-10-28";
const TWO = "50 במכולת ו־120 לישיבה";

Deno.test("two amounts are several whatever Jev answered", () => {
  assert(effectiveIntakeCount(TWO, "one", 0.95) === "several", "confident one");
  assert(effectiveIntakeCount(TWO, "one", 0.5) === "several", "unsure one");
  assert(effectiveIntakeCount(TWO, null, null) === "several", "no answer");
  assert(effectiveIntakeCount(TWO, "list", 0.9) === "list", "a confident list stays a list");
  assert(recordsOneAtATime("add_transaction", TWO, "one", 0.95), "never a single draft");
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

Deno.test("one amount follows Jev only when confident", () => {
  assert(effectiveIntakeCount("50 לכולל", "one", 0.9) === "one", "one");
  assert(effectiveIntakeCount("1,234.56 בסופר", "several", 0.69) === "one", "below the floor is one");
  assert(effectiveIntakeCount("Donated 100 ILS to the kollel", "several", 0.7) === "several", "at the floor");
});

Deno.test("count is ignored outside a transaction", () => {
  assert(!recordsOneAtATime("ask_data", TWO, "several", 0.95), "data question");
  assert(!recordsOneAtATime("create_rule", TWO, "list", 0.95), "rule");
  assert(!recordsOneAtATime("add_transaction", "50 לכולל", "one", 0.95), "single transaction");
});
