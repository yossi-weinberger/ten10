import { applyForwardRule, parseUserRule } from "./rule-draft.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("an expense that is merely tithe-exempt stays ambiguous", () => {
  const rule = parseUserRule("מהיום כל ההוצאות שלי לחברה פטורות ממעשר");
  assert(rule !== null, "parsed");
  assert(rule.name === "חברה", "name");
  assert(rule.action === "ambiguous", "asks which meaning");
});

Deno.test("explicit income, expense, and donation rules are not questions", () => {
  assert(parseUserRule("מהיום הכנסות מחברה פטורות ממעשר")?.action === "exempt-income", "income");
  assert(parseUserRule("מהיום תשלומים לחברה הם הוצאה מוכרת")?.action === "recognized-expense", "expense");
  assert(parseUserRule("מהיום תרומות לחברה אינן ממעשר")?.action === "non_tithe_donation", "donation");
});

Deno.test("the same rule phrases work in English", () => {
  const ambiguous = parseUserRule("from now on expenses to acme are exempt from tithe");
  assert(ambiguous?.name === "acme", "english name");
  assert(ambiguous?.action === "ambiguous", "english question");
  assert(
    parseUserRule("from now on income from acme is tithe exempt")?.action === "exempt-income",
    "english income",
  );
  assert(
    parseUserRule("from now on payments to acme are a recognized expense")?.action ===
      "recognized-expense",
    "english expense",
  );
});

Deno.test("a recognized expense on a place keeps that place as the name", () => {
  const rule = parseUserRule("מהיום כל הוצאה על גן היא הוצאה מוכרת");
  assert(rule?.name === "גן", "name");
  assert(rule?.action === "recognized-expense", "recognized");
});

Deno.test("an active rule changes only a later draft that names it", () => {
  const rules = [{ name: "חברה", type: "recognized-expense" as const }];
  const hit = applyForwardRule(
    { description: "חברה", type: "expense" },
    rules,
    "שילמתי לחברה 40",
  );
  assert(hit.ruleName === "חברה", "matched");
  assert(hit.draft.type === "recognized-expense", "type");

  const miss = applyForwardRule(
    { description: "מאפים", type: "expense" },
    rules,
    "קניתי מאפים ב-15",
  );
  assert(miss.ruleName === null, "other text is unchanged");
  assert(miss.draft.type === "expense", "original type");
});
