import type { CalendarType, HebrewEnglishDateFormat } from "@/lib/calendar";
import type {
  DateFormatSettings,
  GregorianDateFormat,
} from "@/lib/calendar/display-date";

interface StoredCalendarSettings {
  calendarType?: unknown;
  showSecondaryDate?: unknown;
  gregorianDateFormat?: unknown;
  hebrewEnglishDateFormat?: unknown;
}

interface CalendarSettings extends DateFormatSettings {
  calendarType: CalendarType;
  showSecondaryDate: boolean;
}

const GREGORIAN_DATE_FORMATS: readonly GregorianDateFormat[] = [
  "day-month-year",
  "month-day-year",
  "written",
];

const HEBREW_ENGLISH_DATE_FORMATS: readonly HebrewEnglishDateFormat[] = [
  "mixed",
  "numbers",
  "letters",
];

export function isGregorianDateFormat(
  value: unknown,
): value is GregorianDateFormat {
  return GREGORIAN_DATE_FORMATS.includes(value as GregorianDateFormat);
}

export function isHebrewEnglishDateFormat(
  value: unknown,
): value is HebrewEnglishDateFormat {
  return HEBREW_ENGLISH_DATE_FORMATS.includes(
    value as HebrewEnglishDateFormat,
  );
}

export function normalizeCalendarSettings(
  settings: StoredCalendarSettings,
): CalendarSettings {
  return {
    calendarType:
      settings.calendarType === "hebrew" ||
      settings.calendarType === "gregorian"
        ? settings.calendarType
        : "gregorian",
    showSecondaryDate:
      typeof settings.showSecondaryDate === "boolean"
        ? settings.showSecondaryDate
        : false,
    gregorianDateFormat: isGregorianDateFormat(settings.gregorianDateFormat)
      ? settings.gregorianDateFormat
      : "day-month-year",
    hebrewEnglishDateFormat: isHebrewEnglishDateFormat(
      settings.hebrewEnglishDateFormat,
    )
      ? settings.hebrewEnglishDateFormat
      : "mixed",
  };
}

export function shouldResetCalendarChartCache(
  current: Pick<CalendarSettings, "calendarType">,
  update: Partial<CalendarSettings>,
): boolean {
  return (
    update.calendarType !== undefined &&
    update.calendarType !== current.calendarType
  );
}
