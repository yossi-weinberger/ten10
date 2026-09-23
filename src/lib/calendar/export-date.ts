import { formatDisplayDate } from "@/lib/calendar/display-date";
import type { CalendarLanguage, CalendarType } from "@/lib/calendar";

export interface ExportDateOptions {
  calendarType: CalendarType;
  showSecondaryDate: boolean;
  language: CalendarLanguage;
}

export type CalendarExportSettings = Pick<
  ExportDateOptions,
  "calendarType" | "showSecondaryDate"
>;

export interface ExportDate {
  gregorian: string;
  hebrew?: string;
  pdfCell?: string;
}

export function formatExportDate(
  isoDate: string,
  options: ExportDateOptions,
): ExportDate {
  const gregorian = formatDisplayDate(isoDate, {
    calendarType: "gregorian",
    showSecondaryDate: false,
    language: options.language,
    style: "numeric",
  }).primary;
  const includeHebrew =
    options.calendarType === "hebrew" || options.showSecondaryDate;

  if (!includeHebrew) {
    return { gregorian };
  }

  const hebrew = formatDisplayDate(isoDate, {
    calendarType: "hebrew",
    showSecondaryDate: false,
    language: options.language,
    style: "long",
  }).primary;
  const shortGregorian = formatDisplayDate(isoDate, {
    calendarType: "gregorian",
    showSecondaryDate: false,
    language: options.language,
    style: "short",
  }).primary;

  return {
    gregorian,
    hebrew,
    pdfCell: `${shortGregorian} · ${hebrew}`,
  };
}
