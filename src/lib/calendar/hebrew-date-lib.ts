import { format as formatDateFns, toDate as toDateFns } from "date-fns";
import { type DateLib } from "react-day-picker";

import {
  getCalendarAdapter,
  type CalendarLanguage,
} from "@/lib/calendar";
import { formatHebrewNumeral } from "@/lib/halacha/hebrew-numeral";
import { formatLocalDate, parseLocalDate } from "@/lib/utils/local-date";

const hebrewCalendar = getCalendarAdapter("hebrew");
const MAX_ITERATIONS = 5_000;

function toHebrewDate(date: Date) {
  return hebrewCalendar.fromIsoDate(formatLocalDate(date));
}

function toLocalDate(isoDate: string): Date {
  return parseLocalDate(isoDate);
}

function compareDates(left: Date, right: Date): number {
  return Math.sign(left.getTime() - right.getTime());
}

export function formatHebrewCalendarCaption(
  date: Date,
  language: CalendarLanguage,
): string {
  const isoDate = formatLocalDate(date);
  return hebrewCalendar.monthLabel(
    hebrewCalendar.monthKey(isoDate),
    language,
  );
}

export function formatHebrewCalendarMonth(
  date: Date,
  language: CalendarLanguage,
): string {
  return new Intl.DateTimeFormat(language, {
    calendar: "hebrew",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${formatLocalDate(date)}T00:00:00Z`));
}

export function createHebrewDateLib(
  language: CalendarLanguage,
): Partial<typeof DateLib.prototype> {
  const startOfMonth = (date: Date) =>
    toLocalDate(hebrewCalendar.startOfMonth(formatLocalDate(date)));

  const endOfMonth = (date: Date) =>
    toLocalDate(hebrewCalendar.endOfMonth(formatLocalDate(date)));

  const startOfYear = (date: Date) =>
    toLocalDate(hebrewCalendar.startOfYear(formatLocalDate(date)));

  const endOfYear = (date: Date) => {
    const hebrewDate = toHebrewDate(date);
    return toLocalDate(
      hebrewCalendar.toIsoDate({
        year: hebrewDate.year,
        month: hebrewDate.monthsInYear,
        day: hebrewCalendar.daysInMonth(
          hebrewDate.year,
          hebrewDate.monthsInYear,
        ),
      }),
    );
  };

  const addMonths = (date: Date, amount: number) =>
    toLocalDate(
      hebrewCalendar.addMonths(formatLocalDate(date), amount),
    );

  const addYears = (date: Date, amount: number) => {
    const hebrewDate = toHebrewDate(date);
    return toLocalDate(
      hebrewCalendar.toIsoDate({
        year: hebrewDate.year + amount,
        monthCode: hebrewDate.monthCode,
        day: hebrewDate.day,
      }),
    );
  };

  const differenceInCalendarMonths = (
    dateLeft: Date,
    dateRight: Date,
  ) => {
    const left = startOfMonth(dateLeft);
    const right = startOfMonth(dateRight);
    if (compareDates(left, right) === 0) {
      return 0;
    }

    const direction = compareDates(left, right);
    let cursor = right;
    for (let count = 1; count <= MAX_ITERATIONS; count += 1) {
      cursor = addMonths(cursor, direction);
      if (compareDates(cursor, left) === 0) {
        return count * direction;
      }
    }

    throw new RangeError("Hebrew month difference exceeds supported range");
  };

  const eachMonthOfInterval = (
    interval: Parameters<DateLib["eachMonthOfInterval"]>[0],
  ) => {
    const firstMonth = startOfMonth(toDateFns(interval.start));
    const lastMonth = startOfMonth(toDateFns(interval.end));
    if (compareDates(firstMonth, lastMonth) > 0) {
      return [];
    }

    const months = [firstMonth];
    while (
      compareDates(months[months.length - 1], lastMonth) < 0 &&
      months.length < MAX_ITERATIONS
    ) {
      months.push(addMonths(months[months.length - 1], 1));
    }
    if (compareDates(months[months.length - 1], lastMonth) !== 0) {
      throw new RangeError("Hebrew month interval exceeds supported range");
    }
    return months;
  };

  const eachYearOfInterval = (
    interval: Parameters<DateLib["eachYearOfInterval"]>[0],
  ) => {
    const firstYear = startOfYear(toDateFns(interval.start));
    const lastYear = startOfYear(toDateFns(interval.end));
    if (compareDates(firstYear, lastYear) > 0) {
      return [];
    }

    const years = [firstYear];
    while (
      compareDates(years[years.length - 1], lastYear) < 0 &&
      years.length < MAX_ITERATIONS
    ) {
      years.push(addYears(years[years.length - 1], 1));
    }
    if (compareDates(years[years.length - 1], lastYear) !== 0) {
      throw new RangeError("Hebrew year interval exceeds supported range");
    }
    return years;
  };

  return {
    newDate: (year, monthIndex, day) =>
      toLocalDate(
        hebrewCalendar.toIsoDate({
          year,
          month: monthIndex + 1,
          day,
        }),
      ),
    addMonths,
    addYears,
    differenceInCalendarMonths,
    eachMonthOfInterval,
    eachYearOfInterval,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
    getMonth: (date) => toHebrewDate(date).month - 1,
    getYear: (date) => toHebrewDate(date).year,
    isSameMonth: (dateLeft, dateRight) =>
      hebrewCalendar.monthKey(formatLocalDate(dateLeft)) ===
      hebrewCalendar.monthKey(formatLocalDate(dateRight)),
    isSameYear: (dateLeft, dateRight) =>
      toHebrewDate(dateLeft).year === toHebrewDate(dateRight).year,
    setMonth: (date, monthIndex) => {
      const hebrewDate = toHebrewDate(date);
      return toLocalDate(
        hebrewCalendar.toIsoDate({
          year: hebrewDate.year,
          month: monthIndex + 1,
          day: hebrewDate.day,
        }),
      );
    },
    setYear: (date, year) => {
      const hebrewDate = toHebrewDate(date);
      return toLocalDate(
        hebrewCalendar.toIsoDate({
          year,
          monthCode: hebrewDate.monthCode,
          day: hebrewDate.day,
        }),
      );
    },
    format: (date, formatString, options) => {
      switch (formatString) {
        case "d":
          return formatHebrewNumeral(toHebrewDate(date).day);
        case "LLLL y":
        case "y LLLL":
          return formatHebrewCalendarCaption(date, language);
        case "PPPP":
          return `${formatDateFns(date, "EEEE", options)}, ${hebrewCalendar.formatDate(
            formatLocalDate(date),
            language,
            "long",
          )}`;
        default:
          return formatDateFns(date, formatString, options);
      }
    },
  };
}
