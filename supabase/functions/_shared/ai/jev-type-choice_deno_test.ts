import { buildTypeChoiceBody, readTypeChoice } from "./jev-type-choice.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("type choice body sends the amount and the closed type list", () => {
  const body = buildTypeChoiceBody({
    description: "מאפים באליס",
    amount: 15,
    currency: "ils",
    date: "2026-10-19",
  });
  const serialized = JSON.stringify(body);
  assert(body.state.amount === 15, "amount");
  assert(body.state.currency === "ILS", "currency");
  assert(body.questions.transaction_type.criteria.expense.length > 0, "expense criterion");
  assert(!serialized.includes("initial_balance"), "initial balance is not a choice");
  assert(!serialized.includes("user_id"), "user id leaked");
});

Deno.test("type choice reader drops a choice outside the allowed set", () => {
  assert(readTypeChoice({
    answers: { transaction_type: { choice: "expense", confidence: 0.4 } },
  })?.choice === "expense", "expense");
  assert(readTypeChoice({
    answers: { transaction_type: { choice: "initial_balance", confidence: 0.9 } },
  }) === null, "initial balance rejected");
  assert(readTypeChoice({
    answers: { transaction_type: { choice: "donation", confidence: 2 } },
  })?.confidence === null, "confidence out of range");
});
