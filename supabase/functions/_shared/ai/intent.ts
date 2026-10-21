/**
 * Closed intent labels for free text. Classification returns a label only.
 * It does not write, call a provider, or follow instructions inside the text.
 */

import { selectHalachaPage } from "./halacha-page.ts";
import { clarificationField } from "./text-draft.ts";
import {
  CURRENCY_MARKERS,
  DUPLICATE_MARKERS,
  HELP_PHRASES,
  QUESTION_MARKERS,
  RULE_START_MARKERS,
  TRANSACTION_VERBS,
  includesAlias,
} from "./phrase-aliases.ts";

export const INTAKE_INTENTS = [
  "add_transaction",
  "create_rule",
  "ask_data",
  "find_duplicates",
  "help",
  "domain_adjacent",
  "out_of_scope",
] as const;

export type IntakeIntent = (typeof INTAKE_INTENTS)[number];

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/־/g, " ")
    .replace(/\s+/g, " ");
}

function hasMoneyAmount(text: string): boolean {
  return /\d/.test(text) || includesAlias(text, CURRENCY_MARKERS);
}

const CAPABILITY_PATTERNS = [
  /^can you\b/,
  /^could you\b/,
  /^are you able\b/,
  /^do you know\b/,
  /^אתה יכול(?:\s|$)/,
  /^את יכולה(?:\s|$)/,
  /^אתם יכולים(?:\s|$)/,
  /^אתה יודע(?:\s|$)/,
  /^את יודעת(?:\s|$)/,
  /^האם אפשר(?:\s|$)/,
  /^אפשר ל/,
  /^האם אתה(?:\s|$)/,
  /^האם את(?:\s|$)/,
];

/** A question about whether the assistant can do something, not a request to do it now. */
export function isCapabilityQuestion(text: string): boolean {
  const normalized = normalize(text);
  return CAPABILITY_PATTERNS.some((pattern) => pattern.test(normalized));
}

/** First matching rule wins. Unrecognized text is out of scope, not a guess. */
export function classifyIntent(text: string): IntakeIntent {
  const normalized = normalize(text);

  if (normalized.length === 0) {
    return "out_of_scope";
  }

  if (isCapabilityQuestion(normalized)) {
    return "help";
  }

  if (HELP_PHRASES.some((phrase) => normalized === phrase || normalized.startsWith(`${phrase} `))) {
    return "help";
  }

  if (includesAlias(normalized, DUPLICATE_MARKERS)) {
    return "find_duplicates";
  }

  if (includesAlias(normalized, RULE_START_MARKERS)) {
    return "create_rule";
  }

  if (includesAlias(normalized, QUESTION_MARKERS)) {
    return "ask_data";
  }

  if (includesAlias(normalized, TRANSACTION_VERBS) || hasMoneyAmount(normalized)) {
    return "add_transaction";
  }

  if (selectHalachaPage(normalized)) {
    return "domain_adjacent";
  }

  return "out_of_scope";
}

/**
 * Used only when Jev does not answer. A transaction needs an explicit verb.
 * A bare amount is not enough, because the rules cannot tell a year from money.
 */
export function fallbackIntent(text: string, today: string): IntakeIntent {
  const ruled = classifyIntent(text);
  if (ruled === "add_transaction" && clarificationField(text, today) === "type") {
    return "out_of_scope";
  }
  return ruled;
}
