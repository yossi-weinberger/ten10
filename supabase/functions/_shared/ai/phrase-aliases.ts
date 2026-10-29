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

/** A request to define a repeating transaction. A repeat word alone is not enough. */
export const RECURRING_REQUEST_MARKERS = [
  "תגדיר",
  "תקבע",
  "set up",
  "make it recurring",
] as const;

/** The repetition. Without a request marker, the sentence stays a normal transaction or a rule. */
export const RECURRING_REPEAT_MARKERS = [
  "הוראת קבע",
  "הוראת הקבע",
  "כל חודש",
  "כל שבוע",
  "כל שנה",
  "כל יום",
  "every month",
  "every week",
  "every year",
  "every day",
  "monthly",
  "weekly",
  "yearly",
  "daily",
  "standing order",
  "recurring",
] as const;

export const RULE_START_MARKERS = [
  "מהיום",
  "מעכשיו",
  "תמיד כש",
  "from now on",
  "always categorize",
  "every time",
] as const;

export const MAX_MARKERS = [
  "הכי גדול",
  "הכי גבוה",
  "גדולה ביותר",
  "גדול ביותר",
  "גבוהה ביותר",
  "גבוה ביותר",
  "מקסימום",
  "maximum",
  "largest",
  "highest",
] as const;

export const QUESTION_MARKERS = ["כמה", "ממוצע", "how much", "how many", "average", ...MAX_MARKERS] as const;

export const TRANSACTION_VERBS = [
  "קניתי",
  "שילמתי",
  "קיבלתי",
  "תרמתי",
  "bought",
  "paid",
  "spent",
  "received",
  "donated",
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

export const DATE_MINUS_TWO = ["שלשום", "day before yesterday"] as const;
export const DATE_MINUS_ONE = ["אתמול", "yesterday"] as const;
/** weekday: 0 is Sunday. The phrase means the previous such day, never today. */
export const LAST_WEEKDAYS = [
  { weekday: 0, phrases: ["ביום ראשון שעבר", "יום ראשון שעבר", "last sunday"] },
  { weekday: 1, phrases: ["ביום שני שעבר", "יום שני שעבר", "last monday"] },
  { weekday: 2, phrases: ["ביום שלישי שעבר", "יום שלישי שעבר", "last tuesday"] },
  { weekday: 3, phrases: ["ביום רביעי שעבר", "יום רביעי שעבר", "last wednesday"] },
  { weekday: 4, phrases: ["ביום חמישי שעבר", "יום חמישי שעבר", "last thursday"] },
  { weekday: 5, phrases: ["ביום שישי שעבר", "יום שישי שעבר", "last friday"] },
  { weekday: 6, phrases: ["בשבת שעברה", "שבת שעברה", "last saturday"] },
] as const;
export const DATE_WORDS = [
  "שלשום",
  "אתמול",
  "היום",
  "day before yesterday",
  "yesterday",
  "today",
  ...LAST_WEEKDAYS.flatMap((entry) => entry.phrases),
] as const;

export const USD_MARKERS = ["דולר", "dollar", "usd", "$"] as const;
export const EUR_MARKERS = ["אירו", "יורו", "euros", "euro", "eur", "€"] as const;
export const AMOUNT_CURRENCY_WORDS = [
  "ש\"ח",
  "שח",
  "שקלים",
  "שקל",
  "shekels",
  "shekel",
  "דולר",
  "dollars",
  "dollar",
  "usd",
  "eur",
  "אירו",
  "יורו",
  "euros",
  "euro",
  "₪",
  "$",
] as const;

export const RATE_MARKERS = ["שער", "rate"] as const;

/** Context that makes a number a date part, not an amount. */
export const YEAR_MARKERS = ["בשנת", "שנת", "in", "year"] as const;
export const DAY_OF_MONTH_SUFFIXES = ["לחודש", "בחודש"] as const;
export const MONTHLY_MARKERS = ["כל חודש", "every month", "monthly"] as const;
/** After a number, these make it a count, a share, or a quantity, not an amount. */
export const AMOUNT_UNIT_WORDS = [
  "תשלומים", "תשלום", "אחוזים", "אחוז", "אנשים", "איש", "פעמים", "חודשים", "ימים", "שנים", "יחידות", "לילות", "שעות",
  "installments", "installment", "payments", "percent", "people", "persons", "times", "months", "days", "years",
  "units", "nights", "hours",
] as const;
export const PERCENT_WORDS = ["אחוזים", "אחוז", "percent"] as const;
/** "10 אחוז מ־500": the share is taken of the number that follows. */
export const PERCENT_OF_WORDS = ["מתוך", "of"] as const;
/** Before a bare number, these start another item. */
export const ITEM_SEPARATORS = ["וגם", "ו", "and", "plus"] as const;
export const MONTH_NAMES = [
  "ינואר", "פברואר", "מרץ", "מרס", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
  "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november",
  "december",
] as const;

export const FOOD_MARKERS = ["מאפ", "אוכל", "סופר", "מסעד", "food", "grocery", "groceries", "bakery"] as const;
export const TRANSPORT_MARKERS = ["מונית", "דלק", "רכבת", "אוטובוס", "taxi", "fuel", "train", "bus"] as const;

export const DONATION_TYPE_MARKERS = ["תרמתי", "צדקה", "donated", "donation", "tzedaka", "tzedakah"] as const;
export const INCOME_TYPE_MARKERS = ["קיבלתי", "משכורת", "salary", "received"] as const;
export const EXPENSE_TYPE_MARKERS = ["קניתי", "שילמתי", "bought", "paid", "spent"] as const;

export const CREDIT_MARKERS = ["באשראי", "אשראי", "credit"] as const;
export const CASH_MARKERS = ["במזומן", "מזומן", "cash"] as const;
export const TRANSFER_MARKERS = ["העברה בנקאית", "בהעברה", "העברה", "transfer"] as const;
export const BIT_MARKERS = ["בביט", "ביט", "פייבוקס", "paybox", " bit"] as const;
export const CHECK_MARKERS = ["צ'ק", "צ׳ק", "צק", "check", "cheque"] as const;

export const PERSONAL_PSAK_MARKERS = [
  "מותר לי",
  "במקרה שלי",
  "אצלי",
  "for me",
  "in my case",
] as const;

export const HALACHA_EXPENSES_MARKERS = [
  "הוצאה מוכרת",
  "הוצאות מוכרות",
  "recognized expense",
] as const;

export const HALACHA_CHOMESH_MARKERS = ["חומש", "chomesh"] as const;

export const HALACHA_INCOME_MARKERS = ["הכנסה פטורה", "exempt income"] as const;

export const HALACHA_TITHE_MARKERS = ["מעשר", "maaser", "tithe"] as const;

export function includesAlias(text: string, aliases: readonly string[]): boolean {
  return aliases.some((alias) => text.includes(alias));
}
