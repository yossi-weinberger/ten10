/**
 * Closed intent labels for free text. Classification returns a label only.
 * It does not write, call a provider, or follow instructions inside the text.
 */

export const INTAKE_INTENTS = [
  "add_transaction",
  "create_rule",
  "ask_data",
  "find_duplicates",
  "help",
  "out_of_scope",
] as const;

export type IntakeIntent = (typeof INTAKE_INTENTS)[number];

const HELP_PHRASES = [
  "מה אפשר לעשות",
  "מה אפשר",
  "עזרה",
  "what can i do",
  "what can you do",
  "help",
];

const DUPLICATE_MARKERS = ["כפילות", "כפילויות", "duplicate", "duplicates"];

const RULE_MARKERS = [
  "מהיום",
  "מעכשיו",
  "תמיד כש",
  "from now on",
  "always categorize",
  "every time",
];

const QUESTION_MARKERS = ["כמה", "ממוצע", "how much", "how many", "average"];

const TRANSACTION_VERBS = [
  "קניתי",
  "שילמתי",
  "קיבלתי",
  "תרמתי",
  "bought",
  "paid",
  "spent",
  "received",
];

const CURRENCY_MARKERS = ["שקל", "שקלים", "דולר", "shekel", "dollar", "₪", "$"];

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/־/g, " ")
    .replace(/\s+/g, " ");
}

function includesAny(text: string, markers: readonly string[]): boolean {
  return markers.some((marker) => text.includes(marker));
}

function hasMoneyAmount(text: string): boolean {
  return /\d/.test(text) || includesAny(text, CURRENCY_MARKERS);
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

  if (includesAny(normalized, DUPLICATE_MARKERS)) {
    return "find_duplicates";
  }

  if (includesAny(normalized, RULE_MARKERS)) {
    return "create_rule";
  }

  const asksAboutData = includesAny(normalized, QUESTION_MARKERS);
  const statesATransaction = includesAny(normalized, TRANSACTION_VERBS);
  if (asksAboutData && !hasMoneyAmount(normalized)) {
    return "ask_data";
  }

  if (statesATransaction || hasMoneyAmount(normalized)) {
    return "add_transaction";
  }

  return "out_of_scope";
}
