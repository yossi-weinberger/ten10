import {
  addHebrewMonths,
  createHebrewDate,
  formatHebrewDisplayDate,
  formatHebrewMonthLabel,
  hebrewDaysInMonth,
  type HebrewEnglishDateFormat,
  hebrewFromIsoDate,
  hebrewToIsoDate,
} from "./hebrew-calendar.ts";

export type CalendarType = "gregorian" | "hebrew";
export type CalendarLanguage = "he" | "en";
export type CalendarFormatStyle = "numeric" | "long";
export type { HebrewEnglishDateFormat };
export {
  formatHebrewDayNumber,
  formatHebrewMonthName,
  formatHebrewYearNumber,
} from "./hebrew-calendar.ts";
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

export interface CalendarFormatOptions {
  /** Used only by the Hebrew calendar when the language is English. */
  hebrewEnglishFormat?: HebrewEnglishDateFormat;
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
    options?: CalendarFormatOptions,
  ): string;
  startOfMonth(isoDate: string): string;
  endOfMonth(isoDate: string): string;
  startOfYear(isoDate: string): string;
  addMonths(isoDate: string, amount: number): string;
  daysInMonth(year: number, month: number): number;
  clampDay(year: number, month: number, day: number): number;
  monthKey(isoDate: string): string;
  monthLabel(
    monthKey: string,
    language: CalendarLanguage,
    options?: CalendarFormatOptions,
  ): string;
}

const ISO_DATE_PATTERN = /^(-?\d{4,})-(\d{2})-(\d{2})$/;

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
): Intl.DateTimeFormatOptions {
  switch (style) {
    case "numeric":
      return {
        calendar: "gregory",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      };
    case "long":
      return {
        calendar: "gregory",
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

export function parseIsoDate(isoDate: string): Date {
  const match = ISO_DATE_PATTERN.exec(isoDate);
  if (!match) {
    throw new RangeError(`Invalid ISO date: ${isoDate}`);
  }

  const date = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate) {
    throw new RangeError(`Invalid ISO date: ${isoDate}`);
  }
  return date;
}

export function addIsoDays(isoDate: string, amount: number): string {
  const date = parseIsoDate(isoDate);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function isGregorianLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function gregorianDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function gregorianMonthCode(month: number): string {
  return `M${padMonth(month)}`;
}

function parseGregorianMonthCode(monthCode: string): number {
  const match = /^M(\d{2})$/.exec(monthCode);
  if (!match) {
    throw new RangeError(`Invalid monthCode: ${monthCode}`);
  }
  return Number(match[1]);
}

function clampField(
  name: string,
  value: number,
  min: number,
  max: number,
  overflow: CalendarOverflow,
): number {
  const clamped = Math.min(Math.max(value, min), max);
  if (overflow === "reject" && value !== clamped) {
    throw new RangeError(`${name} ${value} is out of range ${min}..${max}`);
  }
  return clamped;
}

function createGregorianDate(
  date: CalendarDateInput,
  overflow: CalendarOverflow,
): { year: number; month: number; day: number } {
  const year = date.year;
  if (!Number.isInteger(year)) {
    throw new RangeError(`Invalid Gregorian year: ${String(year)}`);
  }

  let month: number;
  if (date.monthCode !== undefined) {
    month = parseGregorianMonthCode(date.monthCode);
    if (date.month !== undefined && date.month !== month) {
      throw new RangeError("Mismatching month/monthCode");
    }
  } else if (date.month !== undefined) {
    month = date.month;
  } else {
    throw new TypeError("Missing month/monthCode");
  }

  month = clampField("month", month, 1, 12, overflow);
  const day = clampField(
    "day",
    date.day,
    1,
    gregorianDaysInMonth(year, month),
    overflow,
  );
  return { year, month, day };
}

function formatGregorianIso(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10);
}

function addGregorianMonths(
  year: number,
  month: number,
  amount: number,
): { year: number; month: number } {
  const totalMonths = year * 12 + (month - 1) + amount;
  const nextYear = Math.floor(totalMonths / 12);
  const nextMonth = (totalMonths % 12) + 1;
  return { year: nextYear, month: nextMonth };
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

function createGregorianAdapter(): CalendarAdapter {
  return {
    calendarType: "gregorian",

    fromIsoDate(isoDate) {
      const date = parseIsoDate(isoDate);
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;
      const day = date.getUTCDate();
      return {
        calendarType: "gregorian",
        isoDate,
        year,
        month,
        monthCode: gregorianMonthCode(month),
        day,
        inLeapYear: isGregorianLeapYear(year),
        monthsInYear: 12,
      };
    },

    toIsoDate(date, overflow = "constrain") {
      const fields = createGregorianDate(date, overflow);
      return formatGregorianIso(fields.year, fields.month, fields.day);
    },

    formatDate(isoDate, language, style) {
      return new Intl.DateTimeFormat(
        getLocale(language),
        getFormatOptions(style),
      ).format(parseIsoDate(isoDate));
    },

    startOfMonth(isoDate) {
      const date = this.fromIsoDate(isoDate);
      return formatGregorianIso(date.year, date.month, 1);
    },

    endOfMonth(isoDate) {
      const date = this.fromIsoDate(isoDate);
      return formatGregorianIso(
        date.year,
        date.month,
        gregorianDaysInMonth(date.year, date.month),
      );
    },

    startOfYear(isoDate) {
      const date = this.fromIsoDate(isoDate);
      return formatGregorianIso(date.year, 1, 1);
    },

    addMonths(isoDate, amount) {
      const date = this.fromIsoDate(isoDate);
      const moved = addGregorianMonths(date.year, date.month, amount);
      return this.toIsoDate(
        {
          year: moved.year,
          month: moved.month,
          day: date.day,
        },
        "constrain",
      );
    },

    daysInMonth(year, month) {
      createGregorianDate({ year, month, day: 1 }, "reject");
      return gregorianDaysInMonth(year, month);
    },

    clampDay(year, month, day) {
      return Math.min(Math.max(day, 1), this.daysInMonth(year, month));
    },

    monthKey(isoDate) {
      const date = this.fromIsoDate(isoDate);
      return `${date.year}-${padMonth(date.month)}`;
    },

    monthLabel(monthKey, language) {
      const { year, month } = parseMonthKey(monthKey);
      const isoDate = formatGregorianIso(year, month, 1);
      return new Intl.DateTimeFormat(getLocale(language), {
        calendar: "gregory",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(parseIsoDate(isoDate));
    },
  };
}

function createHebrewAdapter(): CalendarAdapter {
  return {
    calendarType: "hebrew",

    fromIsoDate(isoDate) {
      parseIsoDate(isoDate);
      const date = hebrewFromIsoDate(isoDate);
      return {
        calendarType: "hebrew",
        isoDate,
        year: date.year,
        month: date.month,
        monthCode: date.monthCode,
        day: date.day,
        inLeapYear: date.inLeapYear,
        monthsInYear: date.monthsInYear,
      };
    },

    toIsoDate(date, overflow = "constrain") {
      return hebrewToIsoDate(date, overflow);
    },

    formatDate(isoDate, language, _style, options) {
      return formatHebrewDisplayDate(
        hebrewFromIsoDate(isoDate),
        language,
        options?.hebrewEnglishFormat,
      );
    },

    startOfMonth(isoDate) {
      const date = hebrewFromIsoDate(isoDate);
      return hebrewToIsoDate(
        { year: date.year, month: date.month, day: 1 },
        "reject",
      );
    },

    endOfMonth(isoDate) {
      const date = hebrewFromIsoDate(isoDate);
      return hebrewToIsoDate(
        {
          year: date.year,
          month: date.month,
          day: hebrewDaysInMonth(date.year, date.month),
        },
        "reject",
      );
    },

    startOfYear(isoDate) {
      const date = hebrewFromIsoDate(isoDate);
      return hebrewToIsoDate({ year: date.year, month: 1, day: 1 }, "reject");
    },

    addMonths(isoDate, amount) {
      const date = hebrewFromIsoDate(isoDate);
      const moved = addHebrewMonths(date.year, date.month, amount);
      return hebrewToIsoDate(
        {
          year: moved.year,
          month: moved.month,
          day: date.day,
        },
        "constrain",
      );
    },

    daysInMonth(year, month) {
      createHebrewDate({ year, month, day: 1 }, "reject");
      return hebrewDaysInMonth(year, month);
    },

    clampDay(year, month, day) {
      return Math.min(Math.max(day, 1), this.daysInMonth(year, month));
    },

    monthKey(isoDate) {
      const date = hebrewFromIsoDate(isoDate);
      return `${date.year}-${padMonth(date.month)}`;
    },

    monthLabel(monthKey, language, options) {
      const { year, month } = parseMonthKey(monthKey);
      createHebrewDate({ year, month, day: 1 }, "reject");
      return formatHebrewMonthLabel(
        year,
        month,
        language,
        options?.hebrewEnglishFormat,
      );
    },
  };
}

const GREGORIAN_ADAPTER = createGregorianAdapter();
const HEBREW_ADAPTER = createHebrewAdapter();

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
      return addIsoDays(currentDate, 1);
    case "weekly":
      return addIsoDays(currentDate, 7);
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
