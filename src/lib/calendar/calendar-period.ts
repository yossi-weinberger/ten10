import {
  getCalendarAdapter,
  type CalendarLanguage,
  type CalendarType,
} from "@/lib/calendar";

export interface CalendarMonthSeparator {
  beforeIndex: number;
  monthKey: string;
  monthLabel: string;
}

function normalizeLanguage(language: string): CalendarLanguage {
  return language.startsWith("he") ? "he" : "en";
}

export function buildPeriodBoundaries(
  anchorDate: string,
  periodCount: number,
  calendarType: CalendarType,
): string[] {
  if (!Number.isInteger(periodCount) || periodCount < 1) {
    throw new RangeError("periodCount must be a positive integer");
  }

  const adapter = getCalendarAdapter(calendarType);
  const finalPeriodStart = adapter.startOfMonth(anchorDate);
  const firstPeriodStart = adapter.addMonths(
    finalPeriodStart,
    -(periodCount - 1),
  );

  return Array.from(
    { length: periodCount + 1 },
    (_, index) => adapter.addMonths(firstPeriodStart, index),
  );
}

export function getCalendarMonthKey(
  isoDate: string,
  calendarType: CalendarType,
): string {
  return getCalendarAdapter(calendarType).monthKey(isoDate);
}

export function formatCalendarMonthLabel(
  monthKey: string,
  calendarType: CalendarType,
  language: string,
): string {
  return getCalendarAdapter(calendarType).monthLabel(
    monthKey,
    normalizeLanguage(language),
  );
}

export function isCalendarMonthTransition(
  previousMonthKey: string | null,
  isoDate: string,
  calendarType: CalendarType,
): boolean {
  return (
    previousMonthKey !== null &&
    previousMonthKey !== getCalendarMonthKey(isoDate, calendarType)
  );
}

export function getCalendarMonthSeparators(
  dates: readonly string[],
  calendarType: CalendarType,
  language: string,
): CalendarMonthSeparator[] {
  const separators: CalendarMonthSeparator[] = [];
  let previousMonthKey: string | null = null;

  dates.forEach((isoDate, index) => {
    const monthKey = getCalendarMonthKey(isoDate, calendarType);
    if (
      isCalendarMonthTransition(
        previousMonthKey,
        isoDate,
        calendarType,
      )
    ) {
      separators.push({
        beforeIndex: index,
        monthKey,
        monthLabel: formatCalendarMonthLabel(
          monthKey,
          calendarType,
          language,
        ),
      });
    }
    previousMonthKey = monthKey;
  });

  return separators;
}
