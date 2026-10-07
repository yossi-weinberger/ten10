import {
  formatDisplayDate,
  type DateFormatSettings,
} from "@/lib/calendar/display-date";
import type { CalendarLanguage, CalendarType } from "@/lib/calendar";

export interface ExportDateOptions extends Partial<DateFormatSettings> {
  calendarType: CalendarType;
  showSecondaryDate: boolean;
  language: CalendarLanguage;
}

export type CalendarExportSettings = Omit<ExportDateOptions, "language">;

export interface ExportDate {
  gregorian: string;
  hebrew?: string;
}

export function formatExportDate(
  isoDate: string,
  options: ExportDateOptions,
): ExportDate {
  const gregorian = formatDisplayDate(isoDate, {
    ...options,
    calendarType: "gregorian",
    showSecondaryDate: false,
    style: "numeric",
  }).primary;
  const includeHebrew =
    options.calendarType === "hebrew" || options.showSecondaryDate;

  if (!includeHebrew) {
    return { gregorian };
  }

  const hebrew = formatDisplayDate(isoDate, {
    ...options,
    calendarType: "hebrew",
    showSecondaryDate: false,
    style: "long",
  }).primary;

  return {
    gregorian,
    hebrew,
  };
}
