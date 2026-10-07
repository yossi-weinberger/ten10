import {
  formatHebrewMonthName,
  formatHebrewYearNumber,
  getCalendarAdapter,
  type CalendarLanguage,
  type CalendarType,
  type HebrewEnglishDateFormat,
} from "@/lib/calendar";
import type { DailyHeatmapResponse } from "@/lib/data-layer/insights.service";

function getCalendarYear(
  isoDate: string,
  calendarType: CalendarType,
): string {
  return String(
    getCalendarAdapter(calendarType).fromIsoDate(isoDate).year,
  );
}

export function getHeatmapCalendarYears(
  data: DailyHeatmapResponse,
  calendarType: CalendarType,
): string[] {
  return [
    ...new Set(
      data.map((entry) =>
        getCalendarYear(entry.tx_date, calendarType),
      ),
    ),
  ].sort((yearA, yearB) => Number(yearA) - Number(yearB));
}

export function filterHeatmapDataByCalendarYear(
  data: DailyHeatmapResponse,
  year: string,
  calendarType: CalendarType,
): DailyHeatmapResponse {
  return data.filter(
    (entry) =>
      getCalendarYear(entry.tx_date, calendarType) === year,
  );
}

export function formatHeatmapYearLabel(
  year: string,
  calendarType: CalendarType,
  language: CalendarLanguage = "he",
  hebrewEnglishFormat?: HebrewEnglishDateFormat,
): string {
  if (calendarType !== "hebrew") {
    return year;
  }

  return formatHebrewYearNumber(Number(year), language, hebrewEnglishFormat);
}

export function formatHeatmapMonthTick(
  isoDate: string,
  calendarType: CalendarType,
  language: CalendarLanguage,
  hebrewEnglishFormat?: HebrewEnglishDateFormat,
): string {
  if (calendarType === "hebrew") {
    const date = getCalendarAdapter("hebrew").fromIsoDate(isoDate);
    return formatHebrewMonthName(
      date.year,
      date.month,
      language,
      hebrewEnglishFormat,
    );
  }

  return new Intl.DateTimeFormat(language, {
    calendar: "gregory",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}
