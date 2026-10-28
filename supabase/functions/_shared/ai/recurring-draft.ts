/**
 * Pulls a recurring transaction draft out of text with rules only.
 * Phrases live in recurring-aliases.ts. Amount, currency, type and
 * description come from draftFromText.
 */

import {
  addIsoDays,
  firstRecurringDueDate,
  generateRecurringCatchUpDates,
  getCalendarAdapter,
  type CalendarType,
  type RecurrenceFrequency,
} from "../calendar/index.ts";
import { AMOUNT_CURRENCY_WORDS } from "./phrase-aliases.ts";
import {
  ALREADY_CHARGED_PHRASES,
  COUNT_PREFIXES,
  COUNT_UNITS,
  FIRST_OF_MONTH_PHRASES,
  FREQUENCY_PHRASES,
  GREGORIAN_MONTHS,
  HEBREW_AMOUNT_SCALES,
  HEBREW_DAY_WORDS,
  HEBREW_LETTER_VALUES,
  HOLIDAY_PHRASES,
  MONTH_SUFFIXES,
  RECURRING_COMMAND_WORDS,
  RECURRING_MARKERS,
  START_MARKERS,
  START_NEXT_MONTH_PHRASES,
  START_NOW_PHRASES,
  UNTIL_YEAR_END_PHRASES,
  WEEKDAY_FREQUENCY,
} from "./recurring-aliases.ts";
import { clarificationField, draftFromText, type TextTransactionDraft } from "./text-draft.ts";

export type RecurringMissingField = "amount" | "type" | "frequency" | "date" | "count";

/** Fields read by draftFromText are null when the text has no amount, since it reads nothing then. */
export interface RecurringTextDraft {
  amount: number | null;
  currency: TextTransactionDraft["currency"] | null;
  type: TextTransactionDraft["type"] | null;
  description: string | null;
  category: TextTransactionDraft["category"];
  paymentMethod: TextTransactionDraft["paymentMethod"];
  requestedRate: number | null;
  frequency: RecurrenceFrequency | null;
  calendarType: CalendarType;
  /** First due date, never before today. Null when a date phrase could not be computed. */
  startDate: string | null;
  /** In calendarType. */
  dayOfMonth: number | null;
  anchorMonthCode: string | null;
  /** Null is open-ended. */
  totalOccurrences: number | null;
  alreadyCharged: boolean;
}

export interface RecurringFromText {
  draft: RecurringTextDraft;
  missing: RecurringMissingField[];
}

interface Span {
  start: number;
  end: number;
}

const BEFORE = String.raw`(?<![\p{L}\d])`;
const AFTER = String.raw`(?![\p{L}\d])`;
const HEBREW_CLITICS = "[ובלמשהכ]{0,2}";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function alternation(phrases: readonly string[]): string {
  return [...phrases].sort((left, right) => right.length - left.length).map(escapeRegExp).join("|");
}

function phraseRegex(phrases: readonly string[]): RegExp {
  return new RegExp(`${BEFORE}${HEBREW_CLITICS}(?:${alternation(phrases)})${AFTER}`, "iu");
}

/** Keeps every index, so spans found here point into the original text. */
function prepare(text: string): string {
  return text.replace(/־/g, " ").replace(/(?<=\p{L})-(?=\d)/gu, " ");
}

function spanOf(match: RegExpMatchArray): Span {
  const start = match.index ?? 0;
  return { start, end: start + match[0].length };
}

function blank(text: string, spans: readonly Span[]): string {
  let result = text;
  for (const span of spans) {
    result = result.slice(0, span.start) + " ".repeat(span.end - span.start) + result.slice(span.end);
  }
  return result;
}

function weekdayOf(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00.000Z`).getUTCDay();
}

const MONTH_BY_NAME = new Map<string, number>(
  GREGORIAN_MONTHS.flatMap((entry) => entry.names.map((name) => [name, entry.month] as const)),
);
const MONTH_NAMES = alternation(GREGORIAN_MONTHS.flatMap((entry) => entry.names));
const ORDINAL = "(?:st|nd|rd|th)?";

const EXPLICIT_DATE_PATTERNS: readonly { regex: RegExp; day: number; month: number }[] = [
  {
    regex: new RegExp(`${BEFORE}(?:החל\\s+)?[מב]\\s?(\\d{1,2})\\s?ב\\s?(${MONTH_NAMES})${AFTER}`, "iu"),
    day: 1,
    month: 2,
  },
  {
    regex: new RegExp(`\\b(?:starting|beginning|from|on)\\s+(?:on\\s+)?(${MONTH_NAMES})\\s+(\\d{1,2})${ORDINAL}\\b`, "iu"),
    day: 2,
    month: 1,
  },
  {
    regex: new RegExp(
      `\\b(?:starting|beginning|from|on)\\s+(?:on\\s+)?(?:the\\s+)?(\\d{1,2})${ORDINAL}\\s+(?:of\\s+)?(${MONTH_NAMES})\\b`,
      "iu",
    ),
    day: 1,
    month: 2,
  },
];

type DatePhrase = { span: Span; isoDate: string | null };

/** The next such Gregorian date not before today. Null for a date that does not exist. */
function upcomingGregorianDate(today: string, month: number, day: number): string | null {
  const adapter = getCalendarAdapter("gregorian");
  const year = adapter.fromIsoDate(today).year;
  try {
    const thisYear = adapter.toIsoDate({ year, month, day }, "reject");
    return thisYear >= today ? thisYear : adapter.toIsoDate({ year: year + 1, month, day }, "reject");
  } catch {
    return null;
  }
}

function findExplicitDate(text: string, today: string): DatePhrase | null {
  for (const pattern of EXPLICIT_DATE_PATTERNS) {
    const match = text.match(pattern.regex);
    if (!match) continue;
    const month = MONTH_BY_NAME.get(match[pattern.month].toLowerCase()) ?? 0;
    return { span: spanOf(match), isoDate: upcomingGregorianDate(today, month, Number(match[pattern.day])) };
  }
  return null;
}

const MONTH_SUFFIX = `(?:\\s*(?:${alternation(MONTH_SUFFIXES)}))?`;
const NOT_AN_AMOUNT = `(?!\\s*(?:${alternation([...AMOUNT_CURRENCY_WORDS, ...HEBREW_AMOUNT_SCALES, "nis", "ils", "ש״ח"])}))`;
const DAY_WORD_VALUES = new Map(HEBREW_DAY_WORDS.map((entry) => [entry.phrase, entry.day]));

const DAY_PATTERNS: readonly { regex: RegExp; read: (match: RegExpMatchArray) => number }[] = [
  { regex: phraseRegex(FIRST_OF_MONTH_PHRASES), read: () => 1 },
  {
    regex: new RegExp(`${BEFORE}ב\\s?(\\d{1,2})(?![\\d.,]*\\d)${NOT_AN_AMOUNT}${MONTH_SUFFIX}`, "iu"),
    read: (match) => Number(match[1]),
  },
  {
    regex: new RegExp(
      `\\b(?:on\\s+the\\s+(\\d{1,2})${ORDINAL}|(\\d{1,2})${ORDINAL}\\s+of\\s+(?:the|each|every)\\s+month|on\\s+day\\s+(\\d{1,2}))\\b`,
      "iu",
    ),
    read: (match) => Number(match[1] ?? match[2] ?? match[3]),
  },
  {
    regex: new RegExp(
      `${BEFORE}ב(${alternation(HEBREW_DAY_WORDS.map((entry) => entry.phrase))})${AFTER}${NOT_AN_AMOUNT}${MONTH_SUFFIX}`,
      "iu",
    ),
    read: (match) => DAY_WORD_VALUES.get(match[1]) ?? 0,
  },
  {
    regex: new RegExp(`${BEFORE}ב\\s?(?:([טיכל])["״]([א-ט])|([א-טיכל])['׳])(?!\\p{L})${MONTH_SUFFIX}`, "iu"),
    read: (match) =>
      match[3]
        ? HEBREW_LETTER_VALUES[match[3]]
        : HEBREW_LETTER_VALUES[match[1]] + HEBREW_LETTER_VALUES[match[2]],
  },
];

function findDay(text: string): { span: Span; day: number } | null {
  for (const pattern of DAY_PATTERNS) {
    const match = text.match(pattern.regex);
    if (match) return { span: spanOf(match), day: pattern.read(match) };
  }
  return null;
}

function findFrequency(
  text: string,
): { span: Span; frequency: RecurrenceFrequency; weekday: number | null } | null {
  for (const entry of WEEKDAY_FREQUENCY) {
    const match = text.match(phraseRegex(entry.phrases));
    if (match) return { span: spanOf(match), frequency: "weekly", weekday: entry.weekday };
  }
  for (const entry of FREQUENCY_PHRASES) {
    const match = text.match(phraseRegex(entry.phrases));
    if (match) return { span: spanOf(match), frequency: entry.frequency, weekday: null };
  }
  return null;
}

type CountUnit = (typeof COUNT_UNITS)[number]["unit"];
type CountPhrase = { span: Span; count: number; unit: CountUnit } | { span: Span; untilYearEnd: true };

const UNIT_BY_WORD = new Map<string, CountUnit>(
  COUNT_UNITS.flatMap((entry) => entry.words.map((word) => [word, entry.unit] as const)),
);
const ANY_UNIT_WORDS = COUNT_UNITS.filter((entry) => entry.unit === "any").flatMap((entry) => entry.words);
const COUNT_PATTERNS = [
  new RegExp(
    `${BEFORE}(?:${alternation(COUNT_PREFIXES)})\\s?(\\d+)\\s+(${alternation([...UNIT_BY_WORD.keys()])})${AFTER}`,
    "iu",
  ),
  new RegExp(`${BEFORE}(\\d+)\\s+(${alternation(ANY_UNIT_WORDS)})${AFTER}`, "iu"),
];

function findCount(text: string): CountPhrase | null {
  const untilYearEnd = text.match(phraseRegex(UNTIL_YEAR_END_PHRASES));
  if (untilYearEnd) return { span: spanOf(untilYearEnd), untilYearEnd: true };
  for (const regex of COUNT_PATTERNS) {
    const match = text.match(regex);
    if (match) {
      return { span: spanOf(match), count: Number(match[1]), unit: UNIT_BY_WORD.get(match[2].toLowerCase()) ?? "any" };
    }
  }
  return null;
}

/** 31 Dec, or 29 Elul, of the current year in calendarType. */
function yearEnd(today: string, calendarType: CalendarType): string {
  const adapter = getCalendarAdapter(calendarType);
  const nextYear = adapter.fromIsoDate(today).year + 1;
  return addIsoDays(adapter.toIsoDate({ year: nextYear, month: 1, day: 1 }), -1);
}

function firstOccurrence(
  base: string,
  frequency: RecurrenceFrequency | null,
  weekday: number | null,
  day: number | null,
  calendarType: CalendarType,
): string {
  if (frequency === "weekly" && weekday !== null) {
    return addIsoDays(base, (weekday - weekdayOf(base) + 7) % 7);
  }
  if (day !== null && frequency !== "daily" && frequency !== "weekly") {
    return firstRecurringDueDate(base, calendarType, day);
  }
  return base;
}

/**
 * Null only when the text has no frequency phrase and no recurring word.
 * `today` is YYYY-MM-DD in the user's zone.
 */
export function recurringFromText(
  text: string,
  today: string,
  calendarType: CalendarType,
): RecurringFromText | null {
  const prepared = prepare(text);
  const frequency = findFrequency(prepared);
  const marker = prepared.match(phraseRegex(RECURRING_MARKERS));
  if (!frequency && !marker) return null;

  const spans: Span[] = [];
  const keep = (span: Span | undefined) => {
    if (span) spans.push(span);
  };
  keep(frequency?.span);
  keep(marker ? spanOf(marker) : undefined);

  const adapter = getCalendarAdapter(calendarType);
  const explicitDate = findExplicitDate(prepared, today);
  const nextMonth = prepared.match(phraseRegex(START_NEXT_MONTH_PHRASES));
  const now = prepared.match(phraseRegex(START_NOW_PHRASES));
  keep(explicitDate?.span);
  keep(nextMonth ? spanOf(nextMonth) : undefined);
  keep(now ? spanOf(now) : undefined);
  const startAsked = explicitDate === null && !nextMonth && !now &&
    new RegExp(`${BEFORE}(?:${alternation(START_MARKERS)})`, "iu").test(prepared);
  const base = explicitDate
    ? explicitDate.isoDate
    : nextMonth
    ? adapter.startOfMonth(adapter.addMonths(today, 1))
    : startAsked
    ? null
    : today;

  const dayPhrase = findDay(blank(prepared, explicitDate ? [explicitDate.span] : []));
  keep(dayPhrase?.span);
  const day = dayPhrase?.day ?? null;
  const maxDay = calendarType === "hebrew" ? 30 : 31;
  const dayInRange = day === null || (day >= 1 && day <= maxDay);
  const holiday = phraseRegex(HOLIDAY_PHRASES).test(prepared);

  const startDate = base !== null && dayInRange && !holiday
    ? firstOccurrence(base, frequency?.frequency ?? null, frequency?.weekday ?? null, day, calendarType)
    : null;
  const dayOfMonth = startDate === null ? null : day ?? adapter.fromIsoDate(startDate).day;
  const anchorMonthCode = frequency?.frequency === "yearly" && startDate !== null
    ? adapter.fromIsoDate(startDate).monthCode
    : null;

  const countPhrase = findCount(prepared);
  keep(countPhrase?.span);
  let totalOccurrences: number | null = null;
  if (countPhrase && "untilYearEnd" in countPhrase) {
    if (frequency && startDate !== null && dayOfMonth !== null) {
      totalOccurrences = generateRecurringCatchUpDates(startDate, yearEnd(today, calendarType), {
        calendarType,
        frequency: frequency.frequency,
        dayOfMonth,
        anchorMonthCode,
      }).length || null;
    }
  } else if (countPhrase && (countPhrase.unit === "any" || countPhrase.unit === frequency?.frequency)) {
    totalOccurrences = countPhrase.count > 0 ? countPhrase.count : null;
  }

  for (const phrase of RECURRING_COMMAND_WORDS) {
    const match = prepared.match(phraseRegex([phrase]));
    if (match) keep(spanOf(match));
  }
  const rest = blank(prepared, spans);
  const textDraft = draftFromText(rest, today);
  const type = textDraft && clarificationField(rest, today) !== "type" ? textDraft.type : null;

  const missing: RecurringMissingField[] = [];
  if (!textDraft) missing.push("amount");
  if (type === null) missing.push("type");
  if (!frequency) missing.push("frequency");
  if (startDate === null) missing.push("date");
  if (countPhrase && totalOccurrences === null) missing.push("count");

  return {
    draft: {
      amount: textDraft?.amount ?? null,
      currency: textDraft?.currency ?? null,
      type,
      description: textDraft?.description ?? null,
      category: textDraft?.category ?? null,
      paymentMethod: textDraft?.paymentMethod ?? null,
      requestedRate: textDraft?.requestedRate ?? null,
      frequency: frequency?.frequency ?? null,
      calendarType,
      startDate,
      dayOfMonth,
      anchorMonthCode,
      totalOccurrences,
      alreadyCharged: phraseRegex(ALREADY_CHARGED_PHRASES).test(prepared),
    },
    missing,
  };
}
