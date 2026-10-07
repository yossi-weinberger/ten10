import {
  getCalendarAdapter,
  type CalendarLanguage,
  type CalendarType,
  type HebrewEnglishDateFormat,
} from "@/lib/calendar";

export type DisplayDateStyle = "short" | "numeric" | "long";

/** `12/09/2026`, `09/12/2026` or `Sep 12, 2026`. */
export type GregorianDateFormat = "day-month-year" | "month-day-year" | "written";

export interface DateFormatSettings {
  gregorianDateFormat: GregorianDateFormat;
  hebrewEnglishDateFormat: HebrewEnglishDateFormat;
}

export interface DisplayDateOptions extends Partial<DateFormatSettings> {
  calendarType: CalendarType;
  showSecondaryDate: boolean;
  language: CalendarLanguage;
  style: DisplayDateStyle;
}

export interface DisplayDate {
  primary: string;
  secondary?: string;
}

export function pickDateFormatSettings(
  settings: DateFormatSettings,
): DateFormatSettings {
  return {
    gregorianDateFormat: settings.gregorianDateFormat,
    hebrewEnglishDateFormat: settings.hebrewEnglishDateFormat,
  };
}

function assertNever(value: never): never {
  throw new Error(`Unsupported calendar type: ${String(value)}`);
}

function formatWrittenGregorian(
  isoDate: string,
  language: CalendarLanguage,
): string {
  return new Intl.DateTimeFormat(language, {
    calendar: "gregory",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

function formatGregorian(
  isoDate: string,
  style: DisplayDateStyle,
  language: CalendarLanguage,
  format: GregorianDateFormat,
): string {
  if (format === "written") {
    return formatWrittenGregorian(isoDate, language);
  }

  const [fullYear, month, day] = isoDate.split("-");
  let year: string;
  switch (style) {
    case "short":
      year = fullYear.slice(-2);
      break;
    case "numeric":
    case "long":
      year = fullYear;
      break;
    default:
      return assertNever(style);
  }

  return format === "month-day-year"
    ? `${month}/${day}/${year}`
    : `${day}/${month}/${year}`;
}

function formatForCalendar(
  isoDate: string,
  calendarType: CalendarType,
  style: DisplayDateStyle,
  options: DisplayDateOptions,
): string {
  switch (calendarType) {
    case "gregorian":
      return formatGregorian(
        isoDate,
        style,
        options.language,
        options.gregorianDateFormat ?? "day-month-year",
      );
    case "hebrew":
      return getCalendarAdapter("hebrew").formatDate(
        isoDate,
        options.language,
        "long",
        { hebrewEnglishFormat: options.hebrewEnglishDateFormat },
      );
    default:
      return assertNever(calendarType);
  }
}

function getSecondaryCalendar(calendarType: CalendarType): CalendarType {
  switch (calendarType) {
    case "gregorian":
      return "hebrew";
    case "hebrew":
      return "gregorian";
    default:
      return assertNever(calendarType);
  }
}

export function formatDisplayDate(
  isoDate: string,
  options: DisplayDateOptions,
): DisplayDate {
  try {
    getCalendarAdapter("gregorian").fromIsoDate(isoDate);
  } catch {
    return { primary: isoDate };
  }

  const primary = formatForCalendar(
    isoDate,
    options.calendarType,
    options.style,
    options,
  );

  if (!options.showSecondaryDate) {
    return { primary };
  }

  const secondaryCalendar = getSecondaryCalendar(options.calendarType);
  return {
    primary,
    secondary: formatForCalendar(
      isoDate,
      secondaryCalendar,
      secondaryCalendar === "hebrew" ? "long" : "numeric",
      options,
    ),
  };
}
