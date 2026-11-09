/**
 * A closed question about saved transactions. The model reads the words.
 * This file only turns the reader's slots into a date range and a name.
 */

import { getCalendarAdapter } from "../calendar/index.ts";
import { formatHebrewYear } from "../calendar/hebrew-numeral.ts";
import { hebrewMonthName, isoToEpochDays } from "../calendar/hebrew-calendar.ts";
import { MIN_TRANSACTION_DATE } from "../transaction-domain/normalize-core.ts";
import { type QuestionSlots } from "./question-slots.ts";
import { prefixesName } from "./split-anchor.ts";

export type YearTypeSum = {
  year: number;
  month: number | null;
  type: "donation" | "expense" | "income";
  measure: "sum" | "count" | "average" | "max";
  months: number;
  paymentMethod: string | null;
  topic: string | null;
  recipient: string | null;
  from: string;
  to: string;
};

export type QuestionCalendar = "gregorian" | "hebrew";

type QuestionPeriod = Pick<YearTypeSum, "year" | "month" | "months" | "from" | "to">;

/** Average month length in days. A Hebrew month follows the moon. */
const DAYS_IN_MONTH: Record<QuestionCalendar, number> = { gregorian: 365.2425 / 12, hebrew: 29.530594 };

/**
 * The months an average divides by, from the days in the range. The end is no later than today:
 * the last 3 months is 3, and this year asked on 3 November is 10.
 */
export function questionMonths(from: string, to: string, today: string, calendar: QuestionCalendar): number {
  const end = to < today ? to : today;
  const days = isoToEpochDays(end) - isoToEpochDays(from) + 1;
  return Math.max(1, Math.round(days / DAYS_IN_MONTH[calendar]));
}

function boundsAsQuestionPeriod(from: string, to: string, today: string, calendar: QuestionCalendar): QuestionPeriod {
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  const months = questionMonths(from, to, today, calendar);
  if (calendar === "hebrew") {
    const hebrew = getCalendarAdapter("hebrew");
    const start = hebrew.fromIsoDate(from);
    return {
      from,
      to,
      year: start.year,
      month: sameMonth ? start.month : null,
      months,
    };
  }
  return {
    from,
    to,
    year: Number(from.slice(0, 4)),
    month: sameMonth ? Number(from.slice(5, 7)) : null,
    months,
  };
}

function labelLanguage(language?: string): "he" | "en" {
  return language?.toLowerCase().startsWith("en") ? "en" : "he";
}

function isCivilYear(question: Pick<YearTypeSum, "year" | "from" | "to">): boolean {
  return question.year >= 2000
    && question.year <= 2099
    && question.from === `${question.year}-01-01`
    && question.to === `${question.year}-12-31`;
}

export function periodLabel(
  question: Pick<YearTypeSum, "year" | "month" | "from" | "to">,
  calendar: QuestionCalendar = "gregorian",
  language?: string,
): string {
  if (isCivilYear(question)) return String(question.year);
  const spoken = labelLanguage(language);
  if (calendar === "hebrew") {
    const hebrew = getCalendarAdapter("hebrew");
    const start = hebrew.fromIsoDate(question.from);
    const end = hebrew.fromIsoDate(question.to);
    if (spoken === "en") {
      if (question.month) return `${hebrewMonthName(start.year, start.month, "en")} ${start.year}`;
      if (
        start.month === 1
        && start.day === 1
        && end.year === start.year
        && end.month === end.monthsInYear
        && end.day === hebrew.daysInMonth(end.year, end.month)
      ) {
        return String(start.year);
      }
      const label = (iso: string) => {
        const date = hebrew.fromIsoDate(iso);
        return `${date.day} ${hebrewMonthName(date.year, date.month, "en")} ${date.year}`;
      };
      return `${label(question.from)}–${label(question.to)}`;
    }
    if (question.month) return hebrew.monthLabel(hebrew.monthKey(question.from), "he");
    if (
      start.month === 1
      && start.day === 1
      && end.year === start.year
      && end.month === end.monthsInYear
      && end.day === hebrew.daysInMonth(end.year, end.month)
    ) {
      return formatHebrewYear(start.year);
    }
    const label = (iso: string) => {
      const date = hebrew.fromIsoDate(iso);
      return `${date.day}.${date.month}.${formatHebrewYear(date.year)}`;
    };
    return `${label(question.from)}–${label(question.to)}`;
  }
  if (question.month) {
    const gregorian = getCalendarAdapter("gregorian");
    return gregorian.monthLabel(gregorian.monthKey(question.from), spoken);
  }
  if (question.from.endsWith("-01-01") && question.to.endsWith("-12-31")) return String(question.year);
  const day = (iso: string) => {
    const [year, month, date] = iso.split("-");
    return `${Number(date)}.${Number(month)}.${year}`;
  };
  return `${day(question.from)}–${day(question.to)}`;
}

function sameName(name: string, text: string): boolean {
  return name === text || name.toLowerCase() === text.toLowerCase();
}

function prefixRemainder(text: string): string | null {
  if (text.toLowerCase().startsWith("to ") && text.length > 3) return text.slice(3).trim();
  if (text.startsWith("ל") && text.length > 1) return text.slice(1);
  return null;
}

function suggestionNeedles(text: string): string[] {
  const needles = [text];
  const english = text.toLowerCase().startsWith("to ") ? text.slice(3).trim() : "";
  if (english.length > 1) needles.push(english);
  const first = text[0] ?? "";
  if (text.length > 2 && prefixesName(first, text.slice(1))) needles.push(text.slice(1));
  return [...new Set(needles)];
}

function containsName(name: string, needle: string): boolean {
  return name.includes(needle) || name.toLowerCase().includes(needle.toLowerCase());
}

/** Saved names that contain the spoken name, or the name after one prefix letter. At most three. */
export function nameSuggestions(spoken: string, names: readonly string[]): string[] {
  const text = spoken.trim();
  if (!text || names.length === 0) return [];
  const needles = suggestionNeedles(text).filter((needle) => needle.length > 1);
  const hits = names.filter((name) => needles.some((needle) => containsName(name, needle)) && !needles.some((needle) => sameName(name, needle)));
  return [...new Set(hits)].slice(0, 3);
}

/**
 * Exact saved name, or one saved name after dropping ל or "to ".
 * An empty list never strips. A longer saved name that merely contains the
 * spoken name is not chosen here.
 */
export function anchoredQuestionName(
  question: string,
  spoken: string | null,
  names: readonly string[],
): string | null {
  const text = spoken?.trim() ?? "";
  if (!text || !question.includes(text)) return null;
  if (names.length === 0) return text;
  const exact = names.filter((name) => sameName(name, text));
  if (exact.length === 1) return exact[0];
  const remainder = prefixRemainder(text);
  if (remainder && question.includes(remainder)) {
    const stripped = names.filter((name) => sameName(name, remainder));
    if (stripped.length === 1) return stripped[0];
  }
  return text;
}

/** Jev slots plus the reader's period. Jev's name wins. The spoken name fills an empty slot. */
export function questionFromSlots(
  _text: string,
  today: string,
  calendar: QuestionCalendar,
  slots: QuestionSlots | null,
  readerPeriod?: { kind: "all" } | { kind: "span"; from: string; to: string } | null,
  nameText?: string | null,
): YearTypeSum | "ask_family" | "ask_period" | null {
  if (!slots) return null;
  const period = readerPeriod?.kind === "all"
    ? boundsAsQuestionPeriod(MIN_TRANSACTION_DATE, today, today, calendar)
    : readerPeriod?.kind === "span"
      ? boundsAsQuestionPeriod(readerPeriod.from, readerPeriod.to, today, calendar)
      : "ask_period";
  if (period === "ask_period" || !period) return "ask_period";
  if (!slots.family) return "ask_family";
  const spoken = nameText && nameText.trim() ? nameText.trim() : null;
  const recipient = slots.family === "donation" ? slots.recipient ?? spoken : null;
  const topic = slots.family === "donation" ? null : slots.category ?? spoken;
  return {
    type: slots.family,
    measure: slots.measure ?? "sum",
    paymentMethod: slots.paymentMethod,
    topic,
    recipient,
    ...period,
  };
}

export function typesForFamily(type: YearTypeSum["type"]): readonly string[] {
  if (type === "donation") return ["donation", "non_tithe_donation"];
  if (type === "income") return ["income", "exempt-income"];
  return ["expense", "recognized-expense"];
}
