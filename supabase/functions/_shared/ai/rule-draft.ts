/**
 * A forward-only user rule, parsed with rules. Nothing is saved here.
 * An ambiguous tithe exemption asks one question before approval.
 */

export const RULE_ACTION_TYPES = [
  "exempt-income",
  "recognized-expense",
  "non_tithe_donation",
] as const;

export type RuleActionType = (typeof RULE_ACTION_TYPES)[number];

export interface ParsedUserRule {
  name: string;
  action: RuleActionType | "ambiguous";
}

export interface ActiveUserRule {
  name: string;
  type: RuleActionType;
}

const NAME_STOP_WORDS = new Set([
  "כל",
  "ההוצאות",
  "הוצאות",
  "ההכנסות",
  "הכנסות",
  "התרומות",
  "תרומות",
  "תשלומים",
  "שלי",
  "שלו",
  "שלה",
  "פטורות",
  "פטורים",
  "פטור",
  "ממעשר",
  "מוכרת",
  "מוכר",
  "הם",
  "היא",
  "זה",
  "אינן",
  "אינם",
  "לא",
  "מעשר",
]);

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/־/g, " ").replace(/\s+/g, " ");
}

function extractName(normalized: string): string | null {
  const prefixed = normalized.match(/\s[למ]([א-תa-z0-9][א-תa-z0-9"']*)/);
  const from = normalized.match(/\bfrom\s+([a-z0-9][a-z0-9' -]{0,40})/);
  const raw = prefixed?.[1] ?? from?.[1] ?? "";
  const words = raw.split(" ").filter((word) => word && !NAME_STOP_WORDS.has(word));
  const name = words.slice(0, 4).join(" ").trim();
  return name.length >= 2 ? name : null;
}

/** Null when the sentence is not a rule we can store. */
export function parseUserRule(text: string): ParsedUserRule | null {
  const normalized = normalize(text);
  const name = extractName(normalized);
  if (!name) return null;

  if (/מוכר/.test(normalized)) return { name, action: "recognized-expense" };
  if (/הכנס/.test(normalized) && /פטור/.test(normalized)) return { name, action: "exempt-income" };
  if (/תרומ/.test(normalized) && /מעשר/.test(normalized)) {
    return { name, action: "non_tithe_donation" };
  }
  if (/פטור/.test(normalized) && /מעשר/.test(normalized)) return { name, action: "ambiguous" };
  return null;
}

export function applyForwardRule<T extends { description: string; type: string }>(
  draft: T,
  rules: readonly ActiveUserRule[],
  sourceText: string,
): { draft: T; ruleName: string | null } {
  const haystack = normalize(`${sourceText} ${draft.description}`);
  const match = rules.find((rule) => haystack.includes(rule.name));
  if (!match) return { draft, ruleName: null };
  return { draft: { ...draft, type: match.type } as T, ruleName: match.name };
}
