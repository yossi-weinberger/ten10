/**
 * Words a person might type, in Hebrew and English.
 * This is matching data, not UI copy. Shared modules cannot import i18n.
 * The visible question and buttons stay in public/locales.
 */

export const HELP_PHRASES = [
  "מה אפשר לעשות",
  "מה אפשר",
  "עזרה",
  "what can i do",
  "what can you do",
  "help",
] as const;

export const DUPLICATE_MARKERS = ["כפילות", "כפילויות", "duplicate", "duplicates"] as const;

export const RULE_START_MARKERS = [
  "מהיום",
  "מעכשיו",
  "תמיד כש",
  "from now on",
  "always categorize",
  "every time",
] as const;

export const QUESTION_MARKERS = ["כמה", "ממוצע", "how much", "how many", "average"] as const;

export const TRANSACTION_VERBS = [
  "קניתי",
  "שילמתי",
  "קיבלתי",
  "תרמתי",
  "bought",
  "paid",
  "spent",
  "received",
] as const;

export const CURRENCY_MARKERS = ["שקל", "שקלים", "דולר", "shekel", "dollar", "₪", "$"] as const;

export const RULE_RECOGNIZED_MARKERS = ["מוכר", "recognized"] as const;
export const RULE_INCOME_MARKERS = ["הכנס", "income"] as const;
export const RULE_DONATION_MARKERS = ["תרומ", "donation"] as const;
export const RULE_EXEMPT_MARKERS = ["פטור", "exempt"] as const;
export const RULE_TITHE_MARKERS = ["מעשר", "tithe", "maaser"] as const;

/** Hebrew attaches ל/מ to the name: לחברה, מחברה. */
export const HEBREW_NAME_PREFIXES = ["ל", "מ"] as const;

export const ENGLISH_NAME_MARKERS = [" to ", " from "] as const;

export const RULE_NAME_STOP_WORDS = [
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
  "the",
  "a",
  "an",
  "my",
  "our",
  "expenses",
  "expense",
  "income",
  "incomes",
  "donations",
  "donation",
  "payments",
  "payment",
  "are",
  "is",
  "exempt",
  "from",
  "tithe",
  "maaser",
  "recognized",
  "not",
  "now",
  "on",
  "to",
] as const;

export function includesAlias(text: string, aliases: readonly string[]): boolean {
  return aliases.some((alias) => text.includes(alias));
}
