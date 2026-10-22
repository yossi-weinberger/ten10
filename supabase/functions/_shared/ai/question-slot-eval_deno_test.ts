import holdout from "./fixtures/question-slot-eval-holdout.json" with { type: "json" };
import inbox from "./fixtures/question-slot-eval-inbox.json" with { type: "json" };
import { readSlotEvalFixture, scoreSlotEval, type SlotEvalCase } from "./question-slot-eval.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("slot eval lists are read from the fixture", () => {
  assert(readSlotEvalFixture(inbox) !== null, "inbox shape");
  assert(readSlotEvalFixture([{ id: "x" }]) === null, "bare array");
  const fixture = readSlotEvalFixture(inbox);
  assert(fixture !== null, "fixture");
  assert(fixture.lists.recipients.includes("כולל ערב"), "recipient list");
  assert(fixture.lists.categories.includes("food"), "food key");
  assert(fixture.lists.categories.includes("גן"), "custom category");
  assert(fixture.cases.length === 120, "inbox size");
  for (const item of fixture.cases) {
    const recipient = item.expected.recipient;
    const category = item.expected.category;
    if (recipient && recipient !== "none") {
      assert(fixture.lists.recipients.includes(recipient), item.id);
    }
    if (category && category !== "none") {
      assert(fixture.lists.categories.includes(category), item.id);
    }
  }
});

const FAMILIES = new Set(["donation", "income", "expense", null]);
const MEASURES = new Set(["sum", "count", "average", "max", null]);
const PAYMENTS = new Set([
  "cash",
  "credit_card",
  "debit_card",
  "bank_transfer",
  "check",
  "bit_paybox",
  "paypal",
  "other",
  "none",
]);

Deno.test("holdout slot eval fixture is a fresh set", () => {
  const fixture = readSlotEvalFixture(holdout);
  assert(fixture !== null, "holdout shape");
  assert(fixture.cases.length >= 50 && fixture.cases.length <= 70, `size ${fixture.cases.length}`);
  const inboxFixture = readSlotEvalFixture(inbox);
  assert(inboxFixture !== null, "inbox");
  const inboxTexts = new Set(inboxFixture.cases.map((item) => item.text.trim().toLowerCase()));
  const ids = new Set<string>();
  for (const item of fixture.cases) {
    assert(item.id.startsWith("slot-hold-") && !ids.has(item.id), item.id);
    ids.add(item.id);
    assert(FAMILIES.has(item.expected.family), `${item.id} family ${item.expected.family}`);
    assert(MEASURES.has(item.expected.measure), `${item.id} measure ${item.expected.measure}`);
    const recipient = item.expected.recipient;
    assert(
      recipient === "none" || (recipient !== null && fixture.lists.recipients.includes(recipient)),
      `${item.id} recipient ${recipient}`,
    );
    const category = item.expected.category;
    assert(
      category === "none" || (category !== null && fixture.lists.categories.includes(category)),
      `${item.id} category ${category}`,
    );
    const payment = item.expected.payment_method;
    assert(payment !== null && PAYMENTS.has(payment), `${item.id} payment_method ${payment}`);
    assert(!inboxTexts.has(item.text.trim().toLowerCase()), `${item.id} duplicates inbox`);
  }
});

Deno.test("a confident wrong field is separate from a low-confidence miss", () => {
  const cases: SlotEvalCase[] = [{
    id: "one",
    text: "כמה הוצאתי על אוכל",
    expected: {
      family: "expense",
      measure: "sum",
      recipient: "none",
      category: "food",
      payment_method: "cash",
    },
  }];
  const score = scoreSlotEval(cases, {
    one: {
      family: { choice: "income", confidence: 0.25 },
      measure: { choice: "sum", confidence: 0.9 },
      recipient: { choice: "none", confidence: 1 },
      category: { choice: "shopping", confidence: 0.91 },
      payment_method: { choice: "none", confidence: 0.4 },
    },
  });
  assert(score.correct === 0 && score.missed === 1 && score.confidentWrong === 1, "row");
  assert(score.byField.family.missed === 1, "low family");
  assert(score.byField.measure.correct === 1, "measure");
  assert(score.byField.category.confidentWrong === 1, "category");
  assert(score.byField.payment_method.missed === 1, "payment below the floor");
  assert(score.byField.recipient.correct === 1, "no recipient");
});
