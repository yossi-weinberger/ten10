import { draftFromText } from "./text-draft.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const TODAY = "2026-10-19";

Deno.test("a shekel purchase becomes an expense dated today", () => {
  const draft = draftFromText("קניתי ספרים ב-120 שקל", TODAY);
  assert(draft !== null, "expected a draft");
  assert(draft.amount === 120, "amount");
  assert(draft.currency === "ILS", "currency");
  assert(draft.type === "expense", "type");
  assert(draft.date === TODAY, "date");
  assert(draft.requestedRate === null, "no manual rate");
});

Deno.test("yesterday and a manual dollar rate stay on the draft", () => {
  const draft = draftFromText("אתמול קיבלתי 200 דולר לפי שער 3.5", TODAY);
  assert(draft !== null, "expected a draft");
  assert(draft.amount === 200, "amount is the dollars, not the rate");
  assert(draft.currency === "USD", "currency");
  assert(draft.type === "income", "received is income");
  assert(draft.date === "2026-10-18", "yesterday");
  assert(draft.requestedRate === 3.5, "manual rate");
});

Deno.test("text without an amount is not a draft", () => {
  assert(draftFromText("מה אפשר לעשות", TODAY) === null, "help has no amount");
});
