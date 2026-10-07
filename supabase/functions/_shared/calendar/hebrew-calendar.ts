import {
  formatHebrewNumeral,
  formatHebrewYear,
} from "./hebrew-numeral.ts";

type CalendarLanguage = "he" | "en";

/** How English UI shows a Hebrew date: `א׳ Tishrei תשפ״ז`, `1 Tishrei 5787` or `א׳ תשרי תשפ״ז`. */
export type HebrewEnglishDateFormat = "mixed" | "numbers" | "letters";

const UNIX_EPOCH_JULIAN_DAY = 2_440_588;
const HEBREW_EPOCH_OFFSET = 347_997;
const MONTH_CODE_PATTERN = /^M(\d{2})(L?)$/;
const MS_PER_DAY = 86_400_000;

const HEBREW_MONTH_NAMES = {
  he: {
    common: [
      "תשרי",
      "חשוון",
      "כסלו",
      "טבת",
      "שבט",
      "אדר",
      "ניסן",
      "אייר",
      "סיוון",
      "תמוז",
      "אב",
      "אלול",
    ],
    leap: [
      "תשרי",
      "חשוון",
      "כסלו",
      "טבת",
      "שבט",
      "אדר א׳",
      "אדר ב׳",
      "ניסן",
      "אייר",
      "סיוון",
      "תמוז",
      "אב",
      "אלול",
    ],
  },
  en: {
    common: [
      "Tishrei",
      "Cheshvan",
      "Kislev",
      "Tevet",
      "Shevat",
      "Adar",
      "Nisan",
      "Iyar",
      "Sivan",
      "Tammuz",
      "Av",
      "Elul",
    ],
    leap: [
      "Tishrei",
      "Cheshvan",
      "Kislev",
      "Tevet",
      "Shevat",
      "Adar I",
      "Adar II",
      "Nisan",
      "Iyar",
      "Sivan",
      "Tammuz",
      "Av",
      "Elul",
    ],
  },
} as const;

export type HebrewOverflow = "constrain" | "reject";

export interface HebrewDateFields {
  year: number;
  month: number;
  monthCode: string;
  day: number;
  inLeapYear: boolean;
  monthsInYear: number;
}

export interface HebrewDateInput {
  year: number;
  day: number;
  month?: number;
  monthCode?: string;
}

function modFloor(value: number, divisor: number): number {
  return value - Math.floor(value / divisor) * divisor;
}

function hebrewIsLeapYear(year: number): boolean {
  return modFloor(7 * year + 1, 19) < 7;
}

function hebrewDelay1(year: number): number {
  const months = Math.floor((235 * year - 234) / 19);
  let day = 29 * months + Math.floor((12_084 + 13_753 * months) / 25_920);
  if (modFloor(3 * (day + 1), 7) < 3) {
    day += 1;
  }
  return day;
}

function hebrewStartOfYear(year: number): number {
  const last = hebrewDelay1(year - 1);
  const present = hebrewDelay1(year);
  const extra =
    hebrewDelay1(year + 1) - present === 356
      ? 2
      : present - last === 382
        ? 1
        : 0;
  return present + extra;
}

function hebrewDaysInYear(year: number): number {
  return hebrewStartOfYear(year + 1) - hebrewStartOfYear(year);
}

function hebrewYearType(year: number): 0 | 1 | 2 {
  let yearLength = hebrewDaysInYear(year);
  if (yearLength > 380) {
    yearLength -= 30;
  }
  if (yearLength === 353) {
    return 0;
  }
  if (yearLength === 354) {
    return 1;
  }
  return 2;
}

export function hebrewDaysInMonth(year: number, month: number): number {
  const normalizedMonth =
    month >= 6 && !hebrewIsLeapYear(year) ? month + 1 : month;
  if (
    normalizedMonth === 4 ||
    normalizedMonth === 7 ||
    normalizedMonth === 9 ||
    normalizedMonth === 11 ||
    normalizedMonth === 13
  ) {
    return 29;
  }

  const yearType = hebrewYearType(year);
  if (normalizedMonth === 2) {
    return yearType === 2 ? 30 : 29;
  }
  if (normalizedMonth === 3) {
    return yearType === 0 ? 29 : 30;
  }
  if (normalizedMonth === 6) {
    return hebrewIsLeapYear(year) ? 30 : 0;
  }
  return 30;
}

function julianDayToHebrew(julianDay: number): {
  year: number;
  month: number;
  day: number;
} {
  const day = julianDay - HEBREW_EPOCH_OFFSET;
  let year = Math.floor((25_920 * day / 765_433 * 19 + 234) / 235) + 1;
  let yearStart = hebrewStartOfYear(year);
  let dayOfYear = Math.floor(day - yearStart);
  while (dayOfYear < 1) {
    year -= 1;
    yearStart = hebrewStartOfYear(year);
    dayOfYear = Math.floor(day - yearStart);
  }

  let month = 1;
  let monthStart = 0;
  while (monthStart < dayOfYear) {
    monthStart += hebrewDaysInMonth(year, month);
    month += 1;
  }
  month -= 1;
  monthStart -= hebrewDaysInMonth(year, month);

  return {
    year,
    month,
    day: dayOfYear - monthStart,
  };
}

function hebrewToJulianDay(year: number, month: number, day: number): number {
  let julianDay = hebrewStartOfYear(year);
  for (let index = 1; index < month; index += 1) {
    julianDay += hebrewDaysInMonth(year, index);
  }
  return julianDay + day + HEBREW_EPOCH_OFFSET;
}

export function isoToEpochDays(isoDate: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    throw new RangeError(`Invalid ISO date: ${isoDate}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = Date.UTC(year, month - 1, day);
  const parsed = new Date(utc);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid ISO date: ${isoDate}`);
  }
  return utc / MS_PER_DAY;
}

export function epochDaysToIso(epochDays: number): string {
  return new Date(epochDays * MS_PER_DAY).toISOString().slice(0, 10);
}

export function hebrewMonthCode(year: number, month: number): string {
  if (hebrewIsLeapYear(year) && month === 6) {
    return "M05L";
  }
  const codeNumber = hebrewIsLeapYear(year) && month > 6 ? month - 1 : month;
  return `M${String(codeNumber).padStart(2, "0")}`;
}

function parseMonthCode(
  monthCode: string,
): { monthCodeNumber: number; isLeapMonth: boolean } {
  const match = MONTH_CODE_PATTERN.exec(monthCode);
  if (!match) {
    throw new RangeError(`Invalid monthCode: ${monthCode}`);
  }

  return {
    monthCodeNumber: Number(match[1]),
    isLeapMonth: match[2] === "L",
  };
}

function monthFromCode(
  year: number,
  monthCode: string,
  overflow: HebrewOverflow,
): number {
  const { monthCodeNumber, isLeapMonth } = parseMonthCode(monthCode);
  const leapMonth = hebrewIsLeapYear(year) ? 6 : undefined;
  const month =
    monthCodeNumber +
    (isLeapMonth || (leapMonth !== undefined && monthCodeNumber >= leapMonth)
      ? 1
      : 0);

  if (isLeapMonth) {
    if (month !== 6) {
      throw new RangeError(`Invalid monthCode: ${monthCode}`);
    }
    if (leapMonth === undefined && overflow === "reject") {
      throw new RangeError(`Invalid monthCode: ${monthCode}`);
    }
  }

  return month;
}

function clampField(
  name: string,
  value: number,
  min: number,
  max: number,
  overflow: HebrewOverflow,
): number {
  const clamped = Math.min(Math.max(value, min), max);
  if (overflow === "reject" && value !== clamped) {
    throw new RangeError(`${name} ${value} is out of range ${min}..${max}`);
  }
  return clamped;
}

export function createHebrewDate(
  input: HebrewDateInput,
  overflow: HebrewOverflow,
): HebrewDateFields {
  const year = input.year;
  if (!Number.isInteger(year)) {
    throw new RangeError(`Invalid Hebrew year: ${String(year)}`);
  }

  let month: number;
  if (input.monthCode !== undefined) {
    month = monthFromCode(year, input.monthCode, overflow);
    if (input.month !== undefined && input.month !== month) {
      throw new RangeError("Mismatching month/monthCode");
    }
  } else if (input.month !== undefined) {
    month = input.month;
  } else {
    throw new TypeError("Missing month/monthCode");
  }

  const inLeapYear = hebrewIsLeapYear(year);
  const monthsInYear = inLeapYear ? 13 : 12;
  month = clampField("month", month, 1, monthsInYear, overflow);
  const day = clampField(
    "day",
    input.day,
    1,
    hebrewDaysInMonth(year, month),
    overflow,
  );

  return {
    year,
    month,
    monthCode: hebrewMonthCode(year, month),
    day,
    inLeapYear,
    monthsInYear,
  };
}

export function hebrewFromIsoDate(isoDate: string): HebrewDateFields {
  const { year, month, day } = julianDayToHebrew(
    isoToEpochDays(isoDate) + UNIX_EPOCH_JULIAN_DAY,
  );
  return createHebrewDate({ year, month, day }, "reject");
}

export function hebrewToIsoDate(
  input: HebrewDateInput,
  overflow: HebrewOverflow,
): string {
  const date = createHebrewDate(input, overflow);
  return epochDaysToIso(
    hebrewToJulianDay(date.year, date.month, date.day) - UNIX_EPOCH_JULIAN_DAY,
  );
}

export function addHebrewMonths(
  year: number,
  month: number,
  amount: number,
): { year: number; month: number } {
  if (amount === 0) {
    return { year, month };
  }

  let nextYear = year;
  let nextMonth = month + amount;
  if (amount < 0) {
    while (nextMonth < 1) {
      nextYear -= 1;
      nextMonth += hebrewIsLeapYear(nextYear) ? 13 : 12;
    }
  } else {
    let monthsInYear = hebrewIsLeapYear(nextYear) ? 13 : 12;
    while (nextMonth > monthsInYear) {
      nextMonth -= monthsInYear;
      nextYear += 1;
      monthsInYear = hebrewIsLeapYear(nextYear) ? 13 : 12;
    }
  }

  return { year: nextYear, month: nextMonth };
}

export function hebrewMonthName(
  year: number,
  month: number,
  language: CalendarLanguage,
): string {
  const names = HEBREW_MONTH_NAMES[language];
  const list = hebrewIsLeapYear(year) ? names.leap : names.common;
  const name = list[month - 1];
  if (name === undefined) {
    throw new RangeError(`Invalid Hebrew month: ${month}`);
  }
  return name;
}

export function formatHebrewDayNumber(
  day: number,
  language: CalendarLanguage,
  englishFormat: HebrewEnglishDateFormat = "mixed",
): string {
  return language === "en" && englishFormat === "numbers"
    ? String(day)
    : formatHebrewNumeral(day);
}

export function formatHebrewYearNumber(
  year: number,
  language: CalendarLanguage,
  englishFormat: HebrewEnglishDateFormat = "mixed",
): string {
  return language === "en" && englishFormat === "numbers"
    ? String(year)
    : formatHebrewYear(year);
}

export function formatHebrewMonthName(
  year: number,
  month: number,
  language: CalendarLanguage,
  englishFormat: HebrewEnglishDateFormat = "mixed",
): string {
  return hebrewMonthName(
    year,
    month,
    englishFormat === "letters" ? "he" : language,
  );
}

export function formatHebrewDisplayDate(
  fields: HebrewDateFields,
  language: CalendarLanguage,
  englishFormat: HebrewEnglishDateFormat = "mixed",
): string {
  const day = formatHebrewDayNumber(fields.day, language, englishFormat);
  const monthName = formatHebrewMonthName(
    fields.year,
    fields.month,
    language,
    englishFormat,
  );
  const year = formatHebrewYearNumber(fields.year, language, englishFormat);

  switch (language) {
    case "he":
      return `${day} ב${monthName} ${year}`;
    case "en":
      return `${day} ${monthName} ${year}`;
    default: {
      const exhaustive: never = language;
      throw new Error(`Unsupported calendar language: ${String(exhaustive)}`);
    }
  }
}

export function formatHebrewMonthLabel(
  year: number,
  month: number,
  language: CalendarLanguage,
  englishFormat: HebrewEnglishDateFormat = "mixed",
): string {
  return `${formatHebrewMonthName(year, month, language, englishFormat)} ${formatHebrewYearNumber(year, language, englishFormat)}`;
}
