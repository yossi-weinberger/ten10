import { effectiveIntakeCount, recordsOneAtATime } from "./intake-count.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const TWO = "50 במכולת ו־120 לישיבה";

Deno.test("two amounts are several whatever Jev answered", () => {
  assert(effectiveIntakeCount(TWO, "one", 0.95) === "several", "confident one");
  assert(effectiveIntakeCount(TWO, "one", 0.5) === "several", "unsure one");
  assert(effectiveIntakeCount(TWO, null, null) === "several", "no answer");
  assert(effectiveIntakeCount(TWO, "list", 0.9) === "list", "a confident list stays a list");
  assert(recordsOneAtATime("add_transaction", TWO, "one", 0.95), "never a single draft");
});

Deno.test("one amount follows Jev only when confident", () => {
  assert(effectiveIntakeCount("50 לכולל", "one", 0.9) === "one", "one");
  assert(effectiveIntakeCount("50 לכולל", null, null) === "one", "no answer is one");
  assert(effectiveIntakeCount("1,234.56 בסופר", "several", 0.69) === "one", "below the floor is one");
  assert(effectiveIntakeCount("Donated 100 ILS to the kollel", "several", 0.7) === "several", "at the floor");
  assert(effectiveIntakeCount("paid 37.5 euro for software", "one", 0.99) === "one", "english one");
  assert(effectiveIntakeCount("$50 groceries and $120 yeshiva", null, null) === "several", "english two");
});

Deno.test("a rule with a day and an amount is one, because the day is read as the price", () => {
  const rule = "מעכשיו כל חודש ב־10 תרשום 1,500 שכר דירה";
  assert(effectiveIntakeCount(rule, null, null) === "one", "one amount");
});

Deno.test("count is ignored outside a transaction", () => {
  assert(!recordsOneAtATime("ask_data", TWO, "several", 0.95), "data question");
  assert(!recordsOneAtATime("create_rule", TWO, "list", 0.95), "rule");
  assert(!recordsOneAtATime("add_transaction", "50 לכולל", "one", 0.95), "single transaction");
});
