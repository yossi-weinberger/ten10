/**
 * Words for setting up a recurring transaction, in Hebrew and English.
 * Matching data, not UI copy. Weekday: 0 is Sunday.
 */

export const RECURRING_MARKERS = [
  "הוראת קבע",
  "הוראות קבע",
  "קבועה",
  "קבוע",
  "recurring",
  "standing order",
] as const;

export const RECURRING_COMMAND_WORDS = [
  "תגדיר לי",
  "תגדיר",
  "תקבע",
  "תפתח",
  "תרשום",
  "set up",
  "make my",
  "log",
] as const;

export const WEEKDAY_FREQUENCY = [
  { weekday: 0, phrases: ["כל יום ראשון", "every sunday"] },
  { weekday: 1, phrases: ["כל יום שני", "every monday"] },
  { weekday: 2, phrases: ["כל יום שלישי", "every tuesday"] },
  { weekday: 3, phrases: ["כל יום רביעי", "every wednesday"] },
  { weekday: 4, phrases: ["כל יום חמישי", "every thursday"] },
  { weekday: 5, phrases: ["כל יום שישי", "every friday"] },
  { weekday: 6, phrases: ["כל שבת", "every saturday"] },
] as const;

// TODO(recurring-frequencies): when weekly/yearly are enabled in the form, also enable them in the AI recurring flow (recurring-card.ts + intent/extraction prompt) and update tests.
export const FREQUENCY_PHRASES = [
  { frequency: "daily", phrases: ["כל יום", "יומי", "יומית", "every day", "daily"] },
  { frequency: "weekly", phrases: ["כל שבוע", "שבועי", "שבועית", "every week", "weekly"] },
  {
    frequency: "monthly",
    phrases: ["כל ראש חודש", "כל חודש", "חודשי", "חודשית", "every month", "monthly"],
  },
  { frequency: "yearly", phrases: ["כל שנה", "שנתי", "שנתית", "every year", "yearly", "annually"] },
] as const;

/** Day 1 of the month in the user's calendar. */
export const FIRST_OF_MONTH_PHRASES = [
  "ראש חודש",
  "first of the month",
  "first of every month",
  "first of each month",
] as const;

export const MONTH_SUFFIXES = ["לחודש", "בחודש"] as const;

const HEBREW_UNITS: readonly (readonly string[])[] = [
  ["אחד", "אחת"],
  ["שניים", "שתיים"],
  ["שלושה", "שלוש"],
  ["ארבעה", "ארבע"],
  ["חמישה", "חמש"],
  ["שישה", "שש"],
  ["שבעה", "שבע"],
  ["שמונה"],
  ["תשעה", "תשע"],
];

function hebrewDayWords(): { day: number; phrase: string }[] {
  const words: { day: number; phrase: string }[] = [];
  HEBREW_UNITS.forEach((forms, index) => {
    const unit = index + 1;
    for (const form of forms) {
      words.push({ day: unit, phrase: form });
      words.push({ day: 10 + unit, phrase: `${form} עשר` });
      words.push({ day: 10 + unit, phrase: `${form} עשרה` });
      words.push({ day: 20 + unit, phrase: `עשרים ו${form}` });
    }
  });
  words.push({ day: 12, phrase: "שנים עשר" }, { day: 12, phrase: "שתים עשרה" });
  words.push({ day: 10, phrase: "עשר" }, { day: 10, phrase: "עשרה" });
  words.push({ day: 20, phrase: "עשרים" }, { day: 30, phrase: "שלושים" });
  words.push({ day: 31, phrase: "שלושים ואחד" }, { day: 31, phrase: "שלושים ואחת" });
  return words;
}

/** «בחמש עשרה»: the word follows ב. */
export const HEBREW_DAY_WORDS = hebrewDayWords();

/** Words after a number word that make it an amount, not a day. */
export const HEBREW_AMOUNT_SCALES = ["מאות", "מאה", "אלף", "אלפים"] as const;

export const HEBREW_LETTER_VALUES: Readonly<Record<string, number>> = {
  "א": 1,
  "ב": 2,
  "ג": 3,
  "ד": 4,
  "ה": 5,
  "ו": 6,
  "ז": 7,
  "ח": 8,
  "ט": 9,
  "י": 10,
  "כ": 20,
  "ל": 30,
};

export const START_NOW_PHRASES = ["מעכשיו", "מהיום", "from now on", "starting today", "starting now"] as const;

export const START_NEXT_MONTH_PHRASES = [
  "החל מהחודש הבא",
  "מהחודש הבא",
  "מחודש הבא",
  "starting next month",
  "beginning next month",
  "from next month",
] as const;

/** A start was asked for. Unmatched, the start date is missing. */
export const START_MARKERS = ["החל מ", "starting", "beginning"] as const;

export const GREGORIAN_MONTHS = [
  { month: 1, names: ["ינואר", "january"] },
  { month: 2, names: ["פברואר", "february"] },
  { month: 3, names: ["מרץ", "מרס", "march"] },
  { month: 4, names: ["אפריל", "april"] },
  { month: 5, names: ["מאי", "may"] },
  { month: 6, names: ["יוני", "june"] },
  { month: 7, names: ["יולי", "july"] },
  { month: 8, names: ["אוגוסט", "august"] },
  { month: 9, names: ["ספטמבר", "september"] },
  { month: 10, names: ["אוקטובר", "october"] },
  { month: 11, names: ["נובמבר", "november"] },
  { month: 12, names: ["דצמבר", "december"] },
] as const;

export const COUNT_UNITS = [
  { unit: "monthly", words: ["חודשים", "months"] },
  { unit: "weekly", words: ["שבועות", "weeks"] },
  { unit: "daily", words: ["ימים", "days"] },
  { unit: "yearly", words: ["שנים", "years"] },
  { unit: "any", words: ["פעמים", "תשלומים", "times", "payments"] },
] as const;

/** «ל־12 חודשים», «for 12 months». «12 פעמים» needs no prefix. */
export const COUNT_PREFIXES = ["למשך", "במשך", "ל", "for"] as const;

export const UNTIL_YEAR_END_PHRASES = [
  "עד סוף השנה",
  "עד סוף שנה",
  "until the end of the year",
  "till the end of the year",
  "through the end of the year",
] as const;

/** Dates the parser does not compute. */
export const HOLIDAY_PHRASES = [
  "פורים",
  "purim",
  "חנוכה",
  "hanukkah",
  "chanukah",
  "פסח",
  "passover",
  "pesach",
  "ראש השנה",
  "rosh hashana",
  "rosh hashanah",
  "יום כיפור",
  "יום הכיפורים",
  "yom kippur",
  "סוכות",
  "sukkot",
  "חג השבועות",
  "shavuot",
  "ט״ו בשבט",
  "ט\"ו בשבט",
  "tu bishvat",
  "ל״ג בעומר",
  "ל\"ג בעומר",
  "lag baomer",
  "יארצייט",
  "yahrzeit",
  "יום הולדת",
  "birthday",
  "חג",
  "holiday",
] as const;

export const ALREADY_CHARGED_PHRASES = [
  "כבר ירד",
  "ירד היום",
  "ירדו היום",
  "החודש כבר",
  "went out today",
  "already went out",
  "already charged",
] as const;
