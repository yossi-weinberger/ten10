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
