/**
 * Closed intent labels for free text. Classification returns a label only.
 * It does not write, call a provider, or follow instructions inside the text.
 */

import { selectHalachaPage } from "./halacha-page.ts";
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

/** First matching rule wins. Unrecognized text is out of scope, not a guess. */
export function classifyIntent(text: string): IntakeIntent {
  const normalized = normalize(text);

  if (normalized.length === 0) {
    return "out_of_scope";
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

  const asksAboutData = includesAlias(normalized, QUESTION_MARKERS);
  const statesATransaction = includesAlias(normalized, TRANSACTION_VERBS);
  if (asksAboutData && !hasMoneyAmount(normalized)) {
    return "ask_data";
  }

  if (statesATransaction || hasMoneyAmount(normalized)) {
    return "add_transaction";
  }

  if (selectHalachaPage(normalized)) {
    return "domain_adjacent";
  }

  return "out_of_scope";
}
