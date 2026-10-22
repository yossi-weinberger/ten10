import { clarificationField, draftFromText } from "./text-draft.ts";

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

Deno.test("the description keeps the purchase, not the command or the amount", () => {
  const draft = draftFromText("קניתי מאפים באליס ב-15 שח", TODAY);
  assert(draft !== null, "expected a draft");
  assert(draft.description === "מאפים באליס", "description");
  assert(draft.amount === 15, "amount");
  assert(draft.category === "food", "bakery is food");
});

Deno.test("shekel abbreviations leave the description", () => {
  for (const text of ["קניתי מאפים ב-15 ש\"ח", "קניתי מאפים ב-15 ש״ח", "קניתי מאפים ב-15 שח"]) {
    const draft = draftFromText(text, TODAY);
    assert(draft?.description === "מאפים", text);
    assert(draft?.amount === 15, "amount");
    assert(draft?.currency === "ILS", "shekel");
  }
});

Deno.test("text without an amount is not a draft", () => {
  assert(draftFromText("מה אפשר לעשות", TODAY) === null, "help has no amount");
});

Deno.test("a clear purchase does not need a question", () => {
  assert(clarificationField("קניתי מאפים ב-15 שח", TODAY) === null, "complete");
});

Deno.test("an amount without a verb asks for the type first", () => {
  assert(clarificationField("מאפים ב-15 שח", TODAY) === "type", "type before amount");
});

Deno.test("a verb without an amount asks for the amount", () => {
  assert(clarificationField("קניתי מאפים", TODAY) === "amount", "amount");
});

Deno.test("an English grocery purchase uses the same alias lists", () => {
  const draft = draftFromText("day before yesterday I bought groceries for 15 dollars", TODAY);
  assert(draft !== null, "expected a draft");
  assert(draft.amount === 15, "amount");
  assert(draft.currency === "USD", "dollars");
  assert(draft.type === "expense", "bought");
  assert(draft.category === "food", "groceries");
  assert(draft.date === "2026-10-17", "day before yesterday");
  assert(draft.description.includes("groceries"), "keeps the item");
  assert(!draft.description.includes("bought"), "drops the verb");
  assert(!draft.description.includes("15"), "drops the amount");
});

Deno.test("an English sentence keeps the purchase, not the command", () => {
  const draft = draftFromText("I bought pastries at Alice for 15 shekels", TODAY);
  assert(draft !== null && draft.description === "pastries at Alice", "description");
  assert(draft?.currency === "ILS", "shekels");
});

Deno.test("a donation to charity does not keep the prefix letter", () => {
  const draft = draftFromText("תרמתי לצדקה 100", TODAY);
  assert(draft?.type === "donation", "donation");
  assert(draft?.amount === 100, "amount");
  assert(draft?.description === "", "ל from לצדקה is not a description");
});

Deno.test("a bare amount is not stored as the description", () => {
  assert(draftFromText("שילמתי 5000", TODAY)?.description === "", "bare number");
  assert(draftFromText("קניתי 100 ל", TODAY)?.description === "", "stray letter");
});

Deno.test("donated is a donation and does not ask for the type", () => {
  const text = "last friday I donated 50 dollars";
  assert(clarificationField(text, TODAY) === null, "type is known");
  const draft = draftFromText(text, TODAY);
  assert(draft?.type === "donation", "donation");
  assert(draft?.amount === 50, "amount");
  assert(draft?.currency === "USD", "dollars");
  assert(draft?.date === "2026-10-16", "last friday");
});

Deno.test("last weekday is the previous one, and today rolls back a week", () => {
  const sunday = draftFromText("ביום ראשון שעבר קניתי לחם ב-10", TODAY);
  const monday = draftFromText("last monday I bought bread for 10", TODAY);
  assert(sunday !== null && sunday.date === "2026-10-18", "last Sunday before Monday");
  assert(monday !== null && monday.date === "2026-10-12", "last Monday is a week ago");
  assert(sunday !== null && !sunday.description.includes("ראשון"), "date phrase leaves the description");
});
