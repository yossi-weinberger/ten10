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
