import { Temporal } from "temporal-polyfill/full";
import {
  formatHebrewNumeral,
  formatHebrewYear,
} from "./hebrew-numeral.ts";

export type CalendarType = "gregorian" | "hebrew";
export type CalendarLanguage = "he" | "en";
export type CalendarFormatStyle = "numeric" | "long";
export type CalendarOverflow = "constrain" | "reject";
export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";
export type YearlyNormalizationPolicy = "constrain" | "reject";

export interface RecurrenceRule {
  calendarType: CalendarType;
  frequency: RecurrenceFrequency;
  dayOfMonth: number;
  anchorMonthCode?: string | null;
  yearlyNormalization?: YearlyNormalizationPolicy;
}

interface CalendarDateFields {
  year: number;
  day: number;
}

export type CalendarDateInput = CalendarDateFields &
  (
    | { month: number; monthCode?: string }
    | { month?: never; monthCode: string }
  );

export interface CalendarDateRepresentation {
  calendarType: CalendarType;
  isoDate: string;
  year: number;
  month: number;
  monthCode: string;
  day: number;
  inLeapYear: boolean;
  monthsInYear: number;
}

export interface CalendarAdapter {
  readonly calendarType: CalendarType;
  fromIsoDate(isoDate: string): CalendarDateRepresentation;
  toIsoDate(
    date: CalendarDateInput,
    overflow?: CalendarOverflow,
  ): string;
  formatDate(
    isoDate: string,
    language: CalendarLanguage,
    style: CalendarFormatStyle,
  ): string;
  startOfMonth(isoDate: string): string;
  endOfMonth(isoDate: string): string;
  startOfYear(isoDate: string): string;
  addMonths(isoDate: string, amount: number): string;
  daysInMonth(year: number, month: number): number;
  clampDay(year: number, month: number, day: number): number;
  monthKey(isoDate: string): string;
  monthLabel(monthKey: string, language: CalendarLanguage): string;
}

const CALENDAR_IDS: Record<CalendarType, string> = {
  gregorian: "iso8601",
  hebrew: "hebrew",
};

function assertNever(value: never): never {
  throw new Error(`Unsupported calendar type: ${String(value)}`);
}

function getLocale(language: CalendarLanguage): string {
  switch (language) {
    case "he":
      return "he";
    case "en":
      return "en";
    default:
      return assertNever(language);
  }
}

function getFormatOptions(
  style: CalendarFormatStyle,
  calendarType: CalendarType,
): Intl.DateTimeFormatOptions {
  const calendar = calendarType === "hebrew" ? "hebrew" : "gregory";

  switch (style) {
    case "numeric":
      return {
        calendar,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      };
    case "long":
      return {
        calendar,
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      };
    default:
      return assertNever(style);
  }
}

function padMonth(month: number): string {
  return String(month).padStart(2, "0");
}

function toCalendarDate(isoDate: string, calendarType: CalendarType) {
  return Temporal.PlainDate.from(isoDate).withCalendar(
    CALENDAR_IDS[calendarType],
  );
}

function toIsoDate(date: Temporal.PlainDate): string {
  return date.withCalendar("iso8601").toString();
}

function createTemporalDate(
  calendarType: CalendarType,
  date: CalendarDateInput,
  overflow: CalendarOverflow,
) {
  const monthFields =
    date.monthCode !== undefined
      ? { monthCode: date.monthCode }
      : { month: date.month };

  return Temporal.PlainDate.from(
    {
      calendar: CALENDAR_IDS[calendarType],
      year: date.year,
      ...monthFields,
      day: date.day,
    },
    { overflow },
  );
}

function parseMonthKey(monthKey: string): { year: number; month: number } {
  const match = /^(-?\d+)-(\d{2})$/.exec(monthKey);
  if (!match) {
    throw new RangeError(`Invalid month key: ${monthKey}`);
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
  };
}

function formatHebrewMonthName(
  isoDate: string,
  language: CalendarLanguage,
): string {
  return new Intl.DateTimeFormat(getLocale(language), {
    calendar: "hebrew",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

function formatHebrewDisplayDate(
  isoDate: string,
  language: CalendarLanguage,
): string {
  const date = toCalendarDate(isoDate, "hebrew");
  const day = formatHebrewNumeral(date.day);
  const monthName = formatHebrewMonthName(isoDate, language);
  const year = formatHebrewYear(date.year);

  switch (language) {
    case "he":
      return `${day} ב${monthName} ${year}`;
    case "en":
      return `${day} ${monthName} ${year}`;
    default:
      return assertNever(language);
  }
}

function createCalendarAdapter(calendarType: CalendarType): CalendarAdapter {
  return {
    calendarType,

    fromIsoDate(isoDate) {
      const date = toCalendarDate(isoDate, calendarType);
      return {
        calendarType,
        isoDate: toIsoDate(date),
        year: date.year,
        month: date.month,
        monthCode: date.monthCode,
        day: date.day,
        inLeapYear: date.inLeapYear,
        monthsInYear: date.monthsInYear,
      };
    },

    toIsoDate(date, overflow = "constrain") {
      return toIsoDate(createTemporalDate(calendarType, date, overflow));
    },

    formatDate(isoDate, language, style) {
      if (calendarType === "hebrew") {
        return formatHebrewDisplayDate(isoDate, language);
      }

      return new Intl.DateTimeFormat(
        getLocale(language),
        getFormatOptions(style, calendarType),
      ).format(new Date(`${isoDate}T00:00:00Z`));
    },

    startOfMonth(isoDate) {
      return toIsoDate(
        toCalendarDate(isoDate, calendarType).with(
          { day: 1 },
          { overflow: "constrain" },
        ),
      );
    },

    endOfMonth(isoDate) {
      const date = toCalendarDate(isoDate, calendarType);
      return toIsoDate(
        date.with({ day: date.daysInMonth }, { overflow: "constrain" }),
      );
    },

    startOfYear(isoDate) {
      return toIsoDate(
        toCalendarDate(isoDate, calendarType).with(
          { month: 1, day: 1 },
          { overflow: "constrain" },
        ),
      );
    },

    addMonths(isoDate, amount) {
      return toIsoDate(
        toCalendarDate(isoDate, calendarType).add(
          { months: amount },
          { overflow: "constrain" },
        ),
      );
    },

    daysInMonth(year, month) {
      return createTemporalDate(
        calendarType,
        { year, month, day: 1 },
        "reject",
      ).daysInMonth;
    },

    clampDay(year, month, day) {
      const maximumDay = createTemporalDate(
        calendarType,
        { year, month, day: 1 },
        "reject",
      ).daysInMonth;
      return Math.min(Math.max(day, 1), maximumDay);
    },

    monthKey(isoDate) {
      const date = toCalendarDate(isoDate, calendarType);
      return `${date.year}-${padMonth(date.month)}`;
    },

    monthLabel(monthKey, language) {
      const { year, month } = parseMonthKey(monthKey);
      const isoDate = toIsoDate(
        createTemporalDate(
          calendarType,
          { year, month, day: 1 },
          "reject",
        ),
      );
      if (calendarType === "hebrew") {
        return `${formatHebrewMonthName(isoDate, language)} ${formatHebrewYear(year)}`;
      }

      return new Intl.DateTimeFormat(getLocale(language), {
        calendar: "gregory",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${isoDate}T00:00:00Z`));
    },
  };
}

const GREGORIAN_ADAPTER = createCalendarAdapter("gregorian");
const HEBREW_ADAPTER = createCalendarAdapter("hebrew");

export function getCalendarAdapter(
  calendarType: CalendarType,
): CalendarAdapter {
  switch (calendarType) {
    case "gregorian":
      return GREGORIAN_ADAPTER;
    case "hebrew":
      return HEBREW_ADAPTER;
    default:
      return assertNever(calendarType);
  }
}

function dateInCalendarMonth(
  isoDate: string,
  calendarType: CalendarType,
  dayOfMonth: number,
): string {
  const adapter = getCalendarAdapter(calendarType);
  const representation = adapter.fromIsoDate(isoDate);
  return adapter.toIsoDate({
    year: representation.year,
    month: representation.month,
    day: adapter.clampDay(
      representation.year,
      representation.month,
      dayOfMonth,
    ),
  });
}

export function firstRecurringDueDate(
  startDate: string,
  calendarType: CalendarType,
  dayOfMonth: number,
): string {
  const candidate = dateInCalendarMonth(
    startDate,
    calendarType,
    dayOfMonth,
  );
  return candidate >= startDate
    ? candidate
    : advanceMonthlyRecurringDate(startDate, calendarType, dayOfMonth);
}

export function advanceMonthlyRecurringDate(
  currentDate: string,
  calendarType: CalendarType,
  dayOfMonth: number,
): string {
  const adapter = getCalendarAdapter(calendarType);
  return dateInCalendarMonth(
    adapter.addMonths(currentDate, 1),
    calendarType,
    dayOfMonth,
  );
}

export function advanceYearlyRecurringDate(
  currentDate: string,
  calendarType: CalendarType,
  dayOfMonth: number,
  anchorMonthCode: string,
  normalization: YearlyNormalizationPolicy,
): string {
  const adapter = getCalendarAdapter(calendarType);
  const current = adapter.fromIsoDate(currentDate);
  return adapter.toIsoDate(
    {
      year: current.year + 1,
      monthCode: anchorMonthCode,
      day: dayOfMonth,
    },
    normalization,
  );
}

export function advanceRecurringDate(
  currentDate: string,
  rule: RecurrenceRule,
): string {
  switch (rule.frequency) {
    case "daily":
      return Temporal.PlainDate.from(currentDate).add({ days: 1 }).toString();
    case "weekly":
      return Temporal.PlainDate.from(currentDate).add({ days: 7 }).toString();
    case "monthly":
      return advanceMonthlyRecurringDate(
        currentDate,
        rule.calendarType,
        rule.dayOfMonth,
      );
    case "yearly": {
      const current = getCalendarAdapter(rule.calendarType).fromIsoDate(
        currentDate,
      );
      return advanceYearlyRecurringDate(
        currentDate,
        rule.calendarType,
        rule.dayOfMonth,
        rule.anchorMonthCode ?? current.monthCode,
        rule.yearlyNormalization ?? "constrain",
      );
    }
    default:
      return assertNever(rule.frequency);
  }
}

export function rescheduleRecurringBillingDay(
  nextDueDate: string,
  calendarType: CalendarType,
  dayOfMonth: number,
): string {
  return dateInCalendarMonth(nextDueDate, calendarType, dayOfMonth);
}

export function generateRecurringCatchUpDates(
  nextDueDate: string,
  throughDate: string,
  rule: RecurrenceRule,
  maximumOccurrences = 10_000,
): string[] {
  const dueDates: string[] = [];
  let dueDate = nextDueDate;

  while (dueDate <= throughDate) {
    if (dueDates.length >= maximumOccurrences) {
      throw new RangeError("Recurring catch-up exceeded maximum occurrences");
    }
    dueDates.push(dueDate);
    const nextDueDate = advanceRecurringDate(dueDate, rule);
    if (nextDueDate <= dueDate) {
      throw new RangeError("Recurring schedule did not advance");
    }
    dueDate = nextDueDate;
  }

  return dueDates;
}
