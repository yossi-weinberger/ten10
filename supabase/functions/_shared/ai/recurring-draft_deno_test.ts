import { recurringFromText, type RecurringFromText } from "./recurring-draft.ts";

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
  }
}

const TODAY = "2026-10-28";

function parse(text: string, calendarType: "gregorian" | "hebrew" = "gregorian"): RecurringFromText {
  const result = recurringFromText(text, TODAY, calendarType);
  if (result === null) throw new Error(`expected a recurring draft: ${text}`);
  return result;
}

function schedule(text: string, calendarType: "gregorian" | "hebrew" = "gregorian") {
  const { draft } = parse(text, calendarType);
  return {
    frequency: draft.frequency,
    startDate: draft.startDate,
    dayOfMonth: draft.dayOfMonth,
    anchorMonthCode: draft.anchorMonthCode,
    totalOccurrences: draft.totalOccurrences,
  };
}

Deno.test("text without a frequency or a recurring word is not a recurring draft", () => {
  assertEquals(recurringFromText("קניתי ספרים ב-120 שקל", TODAY, "gregorian"), null, "one-off");
});

Deno.test("frequency phrases in Hebrew and English", () => {
  const cases: [string, string][] = [
    ["כל יום 5 לקופה", "daily"],
    ["תרומה יומית של 5", "daily"],
    ["daily 5 shekels", "daily"],
    ["כל שבוע 20 לישיבה", "weekly"],
    ["תשלום שבועי של 20", "weekly"],
    ["weekly 20 to the yeshiva", "weekly"],
    ["כל חודש 50 לישיבה", "monthly"],
    ["תשלום חודשי של 50", "monthly"],
    ["monthly 50 to the yeshiva", "monthly"],
    ["every month 50 to the yeshiva", "monthly"],
    ["כל שנה 300 לביטוח", "yearly"],
    ["תשלום שנתי של 300", "yearly"],
    ["every year 300 for insurance", "yearly"],
    ["yearly 300 for insurance", "yearly"],
  ];
  for (const [text, frequency] of cases) {
    assertEquals(parse(text).draft.frequency, frequency, text);
  }
});

Deno.test("a weekday makes it weekly from the next such day", () => {
  for (const text of ["כל יום שני 20 לישיבה", "every Monday 20 to the yeshiva"]) {
    assertEquals(
      schedule(text),
      { frequency: "weekly", startDate: "2026-11-02", dayOfMonth: 2, anchorMonthCode: null, totalOccurrences: null },
      text,
    );
  }
});

Deno.test("day of month from digits, words, letters and English ordinals", () => {
  const cases: [string, number, string][] = [
    ["כל חודש ב־15 100 לגמ״ח", 15, "2026-11-15"],
    ["כל חודש ב-15 לחודש 100 לגמ״ח", 15, "2026-11-15"],
    ["כל חודש בחמש עשרה 100 לגמ״ח", 15, "2026-11-15"],
    ["כל חודש בעשרים ושמונה 100 לגמ״ח", 28, "2026-10-28"],
    ["כל חודש בי׳ לחודש 100 לגמ״ח", 10, "2026-11-10"],
    ["כל חודש בט״ו 100 לגמ״ח", 15, "2026-11-15"],
    ["100 NIS to the yeshiva every month on the 15th", 15, "2026-11-15"],
    ["100 NIS to the yeshiva on the 1st of every month", 1, "2026-11-01"],
    ["בראש חודש, כל חודש 100 לגמ״ח", 1, "2026-11-01"],
  ];
  for (const [text, day, startDate] of cases) {
    const { draft } = parse(text);
    assertEquals([draft.dayOfMonth, draft.startDate], [day, startDate], text);
  }
});

Deno.test("an amount after ב is not read as a day", () => {
  const { draft } = parse("כל חודש ב־1,500 שכר דירה");
  assertEquals([draft.amount, draft.dayOfMonth, draft.startDate], [1500, 28, TODAY], "1,500 is the amount");
  const words = parse("כל חודש בחמש מאות שקל שכר לימוד");
  assertEquals(words.draft.dayOfMonth, 28, "חמש מאות is not day 5");
});

Deno.test("hebrew calendar: rosh chodesh is the first of the Hebrew month", () => {
  assertEquals(
    schedule("תגדיר לי הוראת קבע של 200 ש״ח לכולל בכל ראש חודש", "hebrew"),
    { frequency: "monthly", startDate: "2026-11-11", dayOfMonth: 1, anchorMonthCode: null, totalOccurrences: null },
    "1 Kislev 5787",
  );
});

Deno.test("hebrew calendar: numbers are Hebrew days and 31 is out of range", () => {
  assertEquals(schedule("כל חודש ב־10 50 לישיבה", "hebrew").startDate, "2026-11-20", "10 Kislev");
  assertEquals(schedule("כל חודש 50 לישיבה", "hebrew").dayOfMonth, 17, "17 Cheshvan, not Gregorian 28");
  const outOfRange = parse("כל חודש ב־31 50 לישיבה", "hebrew");
  assertEquals([outOfRange.draft.startDate, outOfRange.missing], [null, ["date"]], "hebrew max is 30");
  assertEquals(schedule("כל חודש ב־31 50 לישיבה").startDate, "2026-10-31", "gregorian allows 31");
});

Deno.test("yearly anchors the month of the first due date", () => {
  assertEquals(schedule("כל שנה ב־15 300 לביטוח").anchorMonthCode, "M11", "gregorian November");
  assertEquals(
    schedule("every year on November 1 pay 300 for insurance"),
    { frequency: "yearly", startDate: "2026-11-01", dayOfMonth: 1, anchorMonthCode: "M11", totalOccurrences: null },
    "explicit date",
  );
  assertEquals(
    schedule("כל שנה בראש חודש 300 לביטוח", "hebrew"),
    { frequency: "yearly", startDate: "2026-11-11", dayOfMonth: 1, anchorMonthCode: "M03", totalOccurrences: null },
    "hebrew Kislev",
  );
  assertEquals(schedule("כל חודש ב־15 300 לביטוח").anchorMonthCode, null, "no anchor when not yearly");
});

Deno.test("start phrases", () => {
  assertEquals(schedule("מעכשיו כל חודש 50 לישיבה").startDate, TODAY, "now");
  assertEquals(schedule("כל חודש 50 לישיבה מהחודש הבא").startDate, "2026-11-01", "next month");
  assertEquals(schedule("monthly 50 to the yeshiva starting next month").startDate, "2026-11-01", "starting next month");
  assertEquals(schedule("כל חודש 50 לישיבה מ־1 בנובמבר").startDate, "2026-11-01", "explicit");
  assertEquals(schedule("כל חודש 50 לישיבה מ־1 בינואר").startDate, "2027-01-01", "upcoming January");
  assertEquals(schedule("כל חודש 50 לישיבה מהחודש הבא", "hebrew").startDate, "2026-11-11", "next Hebrew month");
});

Deno.test("a start phrase that is not computed leaves the date missing", () => {
  const { draft, missing } = parse("monthly 50 to the yeshiva starting next week");
  assertEquals([draft.startDate, draft.dayOfMonth], [null, null], "no guess");
  assertEquals(missing, ["date"], "missing");
});

Deno.test("count phrases", () => {
  assertEquals(schedule("כל חודש 50 לישיבה ל־12 חודשים").totalOccurrences, 12, "ל־12 חודשים");
  assertEquals(schedule("כל חודש 50 לישיבה 12 פעמים").totalOccurrences, 12, "12 פעמים");
  assertEquals(schedule("monthly 50 to the yeshiva for 12 months").totalOccurrences, 12, "for 12 months");
  assertEquals(schedule("כל שבוע 36 לחב״ד ל־12 שבועות").totalOccurrences, 12, "ל־12 שבועות");
  assertEquals(schedule("daily 5 shekels for 30 days").totalOccurrences, 30, "for 30 days");
  assertEquals(schedule("כל חודש 50 לישיבה").totalOccurrences, null, "open-ended");
  const mismatch = parse("כל חודש 50 לישיבה ל־12 שבועות");
  assertEquals([mismatch.draft.totalOccurrences, mismatch.missing], [null, ["count"]], "unit mismatch");
});

Deno.test("until the end of the year counts due dates in the user's calendar", () => {
  assertEquals(schedule("כל חודש ב־10 50 לישיבה עד סוף השנה").totalOccurrences, 2, "Nov 10, Dec 10");
  assertEquals(schedule("monthly 50 to the yeshiva until the end of the year").totalOccurrences, 3, "Oct 28 to Dec 28");
  assertEquals(
    schedule("כל חודש ב־10 50 לישיבה עד סוף השנה", "hebrew").totalOccurrences,
    11,
    "10 Kislev to 10 Elul 5787, a leap year",
  );
});

Deno.test("a holiday date is missing, never today", () => {
  for (const text of ["כל שנה בפורים 180 למתנות לאביונים", "every year on Purim 180 shekels"]) {
    const { draft, missing } = parse(text);
    assertEquals([draft.frequency, draft.startDate, draft.anchorMonthCode], ["yearly", null, null], text);
    assertEquals(missing.includes("date"), true, text);
  }
});

Deno.test("already charged is only a flag", () => {
  for (const text of ["כל חודש אני נותן 50 לישיבה, החודש כבר ירד", "monthly 50 to the yeshiva, it went out today"]) {
    const { draft } = parse(text);
    assertEquals([draft.alreadyCharged, draft.startDate], [true, TODAY], text);
  }
  assertEquals(parse("כל חודש 50 לישיבה").draft.alreadyCharged, false, "default");
});

const EVAL_CASES: { id: string; calendarType: "gregorian" | "hebrew"; text: string; expected: RecurringFromText }[] = [
  {
    id: "he-recurring-01",
    calendarType: "gregorian",
    text: "תגדיר לי הוראת קבע של 200 ש״ח לכולל בכל ראש חודש",
    expected: {
      draft: {
        amount: 200,
        currency: "ILS",
        type: "donation",
        description: "כולל",
        category: null,
        paymentMethod: null,
        requestedRate: null,
        frequency: "monthly",
        calendarType: "gregorian",
        startDate: "2026-11-01",
        dayOfMonth: 1,
        anchorMonthCode: null,
        totalOccurrences: null,
        alreadyCharged: false,
      },
      missing: [],
    },
  },
  {
    id: "he-recurring-01",
    calendarType: "hebrew",
    text: "תגדיר לי הוראת קבע של 200 ש״ח לכולל בכל ראש חודש",
    expected: {
      draft: {
        amount: 200,
        currency: "ILS",
        type: "donation",
        description: "כולל",
        category: null,
        paymentMethod: null,
        requestedRate: null,
        frequency: "monthly",
        calendarType: "hebrew",
        startDate: "2026-11-11",
        dayOfMonth: 1,
        anchorMonthCode: null,
        totalOccurrences: null,
        alreadyCharged: false,
      },
      missing: [],
    },
  },
  {
    id: "he-recurring-02",
    calendarType: "gregorian",
    text: "מעכשיו כל חודש ב־10 תרשום 1,500 שכר דירה",
    expected: {
      draft: {
        amount: 1500,
        currency: "ILS",
        type: null,
        description: "שכר דירה",
        category: null,
        paymentMethod: null,
        requestedRate: null,
        frequency: "monthly",
        calendarType: "gregorian",
        startDate: "2026-11-10",
        dayOfMonth: 10,
        anchorMonthCode: null,
        totalOccurrences: null,
        alreadyCharged: false,
      },
      missing: ["type"],
    },
  },
  {
    id: "he-recurring-03",
    calendarType: "gregorian",
    text: "תפתח תרומה קבועה של 36 שקל לחב״ד כל שבוע, ל־12 שבועות",
    expected: {
      draft: {
        amount: 36,
        currency: "ILS",
        type: null,
        description: "תרומה לחב״ד",
        category: null,
        paymentMethod: null,
        requestedRate: null,
        frequency: "weekly",
        calendarType: "gregorian",
        startDate: "2026-10-28",
        dayOfMonth: 28,
        anchorMonthCode: null,
        totalOccurrences: 12,
        alreadyCharged: false,
      },
      missing: ["type"],
    },
  },
  {
    id: "en-recurring-01",
    calendarType: "gregorian",
    text: "Set up a monthly donation of 100 NIS to Ezer Mizion starting next month",
    expected: {
      draft: {
        amount: 100,
        currency: "ILS",
        type: "donation",
        description: "a of to Ezer Mizion",
        category: null,
        paymentMethod: null,
        requestedRate: null,
        frequency: "monthly",
        calendarType: "gregorian",
        startDate: "2026-11-01",
        dayOfMonth: 1,
        anchorMonthCode: null,
        totalOccurrences: null,
        alreadyCharged: false,
      },
      missing: [],
    },
  },
  {
    id: "en-recurring-02",
    calendarType: "gregorian",
    text: "From now on log 180 shekels every year on Purim for matanot la'evyonim",
    expected: {
      draft: {
        amount: 180,
        currency: "ILS",
        type: null,
        description: "on Purim matanot la'evyonim",
        category: null,
        paymentMethod: null,
        requestedRate: null,
        frequency: "yearly",
        calendarType: "gregorian",
        startDate: null,
        dayOfMonth: null,
        anchorMonthCode: null,
        totalOccurrences: null,
        alreadyCharged: false,
      },
      missing: ["type", "date"],
    },
  },
  {
    id: "en-recurring-03",
    calendarType: "gregorian",
    text: "make my fifty dollar pledge to the kollel recurring every month until the end of the year",
    expected: {
      draft: {
        amount: 50,
        currency: "USD",
        type: "donation",
        description: "pledge to the kollel",
        category: null,
        paymentMethod: null,
        requestedRate: null,
        frequency: "monthly",
        calendarType: "gregorian",
        startDate: "2026-10-28",
        dayOfMonth: 28,
        anchorMonthCode: null,
        totalOccurrences: 3,
        alreadyCharged: false,
      },
      missing: [],
    },
  },
];

for (const evalCase of EVAL_CASES) {
  Deno.test(`eval ${evalCase.id} (${evalCase.calendarType})`, () => {
    assertEquals(parse(evalCase.text, evalCase.calendarType), evalCase.expected, evalCase.id);
  });
}

Deno.test("missing amount, type and frequency are listed", () => {
  const noAmount = parse("כל חודש לישיבה");
  assertEquals([noAmount.draft.amount, noAmount.draft.type, noAmount.missing], [null, "donation", ["amount"]], "no amount");
  const noFrequency = parse("תגדיר הוראת קבע של 75 לישיבה");
  assertEquals(
    [noFrequency.draft.frequency, noFrequency.draft.type, noFrequency.draft.description, noFrequency.missing],
    [null, "donation", "ישיבה", ["frequency"]],
    "no frequency",
  );
  const complete = parse("monthly donation of 100 NIS to Ezer Mizion");
  assertEquals([complete.draft.type, complete.missing], ["donation", []], "complete");
});

Deno.test("a standing order to a Torah recipient keeps the payee and is a donation", () => {
  const cases: [string, string, number, string | null][] = [
    ["תגדיר לי הוראת קבע של 200 ש״ח לכולל בכל ראש חודש", "כולל", 200, "monthly"],
    ["תגדיר לי הוראת קבע של 150 שקל לישיבה כל חודש", "ישיבה", 150, "monthly"],
    ["הוראת קבע של 100 ש״ח לבית כנסת", "בית כנסת", 100, null],
  ];
  for (const [text, description, amount, frequency] of cases) {
    const { draft } = parse(text);
    assertEquals(
      [draft.description, draft.type, draft.amount, draft.frequency],
      [description, "donation", amount, frequency],
      text,
    );
  }
});
