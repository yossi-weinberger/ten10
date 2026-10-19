/**
 * A forward-only user rule, parsed with rules. Nothing is saved here.
 * Phrases live in phrase-aliases.ts. An ambiguous tithe exemption asks one question.
 */

import {
  ENGLISH_NAME_MARKERS,
  HEBREW_NAME_PREFIXES,
  RULE_DONATION_MARKERS,
  RULE_EXEMPT_MARKERS,
  RULE_INCOME_MARKERS,
  RULE_NAME_STOP_WORDS,
  RULE_RECOGNIZED_MARKERS,
  RULE_TITHE_MARKERS,
  includesAlias,
} from "./phrase-aliases.ts";

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

const NAME_STOP_WORDS = new Set<string>(RULE_NAME_STOP_WORDS);

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/־/g, " ").replace(/\s+/g, " ");
}

function nameFromWords(rest: string): string | null {
  const words = rest.split(" ").filter((word) => word && !NAME_STOP_WORDS.has(word));
  const name = words.slice(0, 4).join(" ").trim();
  return name.length >= 2 ? name : null;
}

function extractName(normalized: string): string | null {
  for (const marker of ENGLISH_NAME_MARKERS) {
    let searchFrom = 0;
    while (searchFrom < normalized.length) {
      const index = normalized.indexOf(marker, searchFrom);
      if (index < 0) break;
      const name = nameFromWords(normalized.slice(index + marker.length));
      if (name) return name;
      searchFrom = index + marker.length;
    }
  }

  const prefixes = HEBREW_NAME_PREFIXES.join("");
  const prefixed = normalized.match(new RegExp(`\\s[${prefixes}]([א-תa-z0-9][א-תa-z0-9"']*)`));
  return prefixed?.[1] ? nameFromWords(prefixed[1]) : null;
}

/** Null when the sentence is not a rule we can store. */
export function parseUserRule(text: string): ParsedUserRule | null {
  const normalized = normalize(text);
  const name = extractName(normalized);
  if (!name) return null;

  const recognized = includesAlias(normalized, RULE_RECOGNIZED_MARKERS);
  const income = includesAlias(normalized, RULE_INCOME_MARKERS);
  const donation = includesAlias(normalized, RULE_DONATION_MARKERS);
  const exempt = includesAlias(normalized, RULE_EXEMPT_MARKERS);
  const tithe = includesAlias(normalized, RULE_TITHE_MARKERS);

  if (recognized) return { name, action: "recognized-expense" };
  if (income && exempt) return { name, action: "exempt-income" };
  if (donation && tithe) return { name, action: "non_tithe_donation" };
  if (exempt && tithe) return { name, action: "ambiguous" };
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
