import {
  getCalendarAdapter,
  type CalendarLanguage,
  type CalendarType,
} from "@/lib/calendar";
import { formatHebrewYear } from "@/lib/halacha/hebrew-numeral";
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
): string {
  if (calendarType !== "hebrew") {
    return year;
  }

  return formatHebrewYear(Number(year));
}

export function formatHeatmapMonthTick(
  isoDate: string,
  calendarType: CalendarType,
  language: CalendarLanguage,
): string {
  return new Intl.DateTimeFormat(language, {
    calendar: calendarType === "hebrew" ? "hebrew" : "gregory",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}
