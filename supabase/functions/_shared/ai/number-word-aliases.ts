/**
 * Number words in Hebrew and English, for rewriting them as digits.
 * Matching data, not UI copy.
 */

export const HEBREW_UNITS: Readonly<Record<string, number>> = {
  אחת: 1,
  אחד: 1,
  שתיים: 2,
  שתים: 2,
  שניים: 2,
  שתי: 2,
  שני: 2,
  שלוש: 3,
  שלושה: 3,
  ארבע: 4,
  ארבעה: 4,
  חמש: 5,
  חמישה: 5,
  חמשה: 5,
  שש: 6,
  שישה: 6,
  ששה: 6,
  שבע: 7,
  שבעה: 7,
  שמונה: 8,
  תשע: 9,
  תשעה: 9,
};

/** Only before עשר or עשרה: «שנים עשר». On its own it means years. */
export const HEBREW_TEEN_ONLY_UNITS: Readonly<Record<string, number>> = { שנים: 2 };

export const HEBREW_TEN: Readonly<Record<string, number>> = { עשר: 10, עשרה: 10 };

export const HEBREW_TENS: Readonly<Record<string, number>> = {
  עשרים: 20,
  שלושים: 30,
  ארבעים: 40,
  חמישים: 50,
  שישים: 60,
  ששים: 60,
  שבעים: 70,
  שמונים: 80,
  תשעים: 90,
};

export const HEBREW_HUNDREDS: Readonly<Record<string, number>> = { מאה: 100, מאתיים: 200 };

/** After a unit: «שלוש מאות». */
export const HEBREW_HUNDREDS_PLURAL = "מאות";

export const HEBREW_THOUSANDS: Readonly<Record<string, number>> = { אלף: 1000, אלפיים: 2000 };

/** After a group: «שלושת אלפים», «עשרים אלף». */
export const HEBREW_THOUSANDS_MULTIPLIERS = ["אלף", "אלפים"] as const;

/** Only before אלפים or אלף. */
export const HEBREW_THOUSANDS_CONSTRUCT: Readonly<Record<string, number>> = {
  שלושת: 3,
  ארבעת: 4,
  חמשת: 5,
  ששת: 6,
  שבעת: 7,
  שמונת: 8,
  תשעת: 9,
  עשרת: 10,
};

/** «אלף וחצי», «מאה וחצי». */
export const HEBREW_AND_HALF = "וחצי";

export const HEBREW_CONJUNCTION = "ו";

/** Kept in the output: «בשלוש מאות» -> «ב־300». */
export const HEBREW_NUMBER_PREFIXES = ["ב", "ל", "מ", "ו", "ה"] as const;

/** «יום שני» is Monday. «היום» is not a day name, so ה is not here. */
export const HEBREW_DAY_WORDS = ["יום", "ביום", "ליום", "מיום", "ויום"] as const;
export const HEBREW_WEEKDAY_NUMBER_WORDS = ["שני"] as const;

export const ENGLISH_UNITS: Readonly<Record<string, number>> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
};

export const ENGLISH_TEENS: Readonly<Record<string, number>> = {
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

export const ENGLISH_TENS: Readonly<Record<string, number>> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

export const ENGLISH_HUNDRED = "hundred";
export const ENGLISH_THOUSAND = "thousand";
/** Only before hundred or thousand: "a hundred". */
export const ENGLISH_ONE_ARTICLE = "a";
export const ENGLISH_AND = "and";

/** A number below 20 becomes digits only before one of these. */
export const NUMBER_CURRENCY_WORDS = [
  "ש\"ח",
  "ש״ח",
  "ש''ח",
  "שח",
  "שקלים",
  "שקל",
  "₪",
  "דולרים",
  "דולר",
  "יורו",
  "אירו",
  "dollars",
  "dollar",
  "euros",
  "euro",
  "shekels",
  "shekel",
  "nis",
] as const;
