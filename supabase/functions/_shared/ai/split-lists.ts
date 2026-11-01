import type { SupabaseClient } from "npm:@supabase/supabase-js@2.116.0";
import type { SplitRuleRef } from "./split-anchor.ts";
import type { SplitPromptContext } from "./split-prompt.ts";

const SPECIAL = new Set(["exempt-income", "recognized-expense", "non_tithe_donation"]);

function categoryNames(data: unknown): string[] {
  if (!Array.isArray(data)) return [];
  const names: string[] = [];
  for (const row of data) {
    if (typeof row === "string" && row.trim()) names.push(row.trim());
    else if (row && typeof row === "object" && typeof (row as { category?: unknown }).category === "string") {
      const name = (row as { category: string }).category.trim();
      if (name) names.push(name);
    }
  }
  return names;
}

function ruleRefs(data: unknown): SplitRuleRef[] {
  if (!Array.isArray(data)) return [];
  const rules: SplitRuleRef[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const id = (row as { id?: unknown }).id;
    const match = (row as { match?: unknown }).match;
    const action = (row as { action?: unknown }).action;
    const name = match && typeof match === "object" ? (match as { name?: unknown }).name : null;
    const type = action && typeof action === "object" ? (action as { type?: unknown }).type : null;
    if (typeof id !== "string" || typeof name !== "string" || typeof type !== "string") continue;
    if (!SPECIAL.has(type)) continue;
    rules.push({ id, name, type: type as SplitRuleRef["type"] });
  }
  return rules.slice(0, 40);
}

/** Categories, recipients, and saved rules for one read. The same lists the text path uses. */
export async function loadSplitLists(
  userClient: SupabaseClient,
  admin: SupabaseClient,
  userId: string,
): Promise<{ context: SplitPromptContext; rules: SplitRuleRef[] }> {
  const [income, expense, recipients, rules] = await Promise.all([
    userClient.rpc("get_user_categories", { p_type: "income" }),
    userClient.rpc("get_user_categories", { p_type: "expense" }),
    userClient.rpc("list_ai_recipients"),
    admin.schema("ai").from("user_rules").select("id, match, action").eq("user_id", userId).eq("status", "active").limit(40),
  ]);
  const categories = [...new Set([...categoryNames(income.data), ...categoryNames(expense.data)])].slice(0, 80);
  const recipientNames = Array.isArray(recipients.data)
    ? recipients.data.filter((name): name is string => typeof name === "string" && name.trim().length > 0).slice(0, 40)
    : [];
  const saved = ruleRefs(rules.data);
  return {
    rules: saved,
    context: {
      categories,
      recipients: recipientNames,
      rules: saved.map((rule) => ({ id: rule.id, name: rule.name })),
    },
  };
}
