import {
  getCalendarAdapter,
  type CalendarLanguage,
  type CalendarType,
} from "@/lib/calendar";

export type DisplayDateStyle = "short" | "numeric" | "long";

export interface DisplayDateOptions {
  calendarType: CalendarType;
  showSecondaryDate: boolean;
  language: CalendarLanguage;
  style: DisplayDateStyle;
}

export interface DisplayDate {
  primary: string;
  secondary?: string;
}

function assertNever(value: never): never {
  throw new Error(`Unsupported calendar type: ${String(value)}`);
}

function formatGregorian(isoDate: string, style: DisplayDateStyle): string {
  const [year, month, day] = isoDate.split("-");

  switch (style) {
    case "short":
      return `${day}/${month}/${year.slice(-2)}`;
    case "numeric":
    case "long":
      return `${day}/${month}/${year}`;
    default:
      return assertNever(style);
  }
}

function formatForCalendar(
  isoDate: string,
  calendarType: CalendarType,
  language: CalendarLanguage,
  style: DisplayDateStyle,
): string {
  switch (calendarType) {
    case "gregorian":
      return formatGregorian(isoDate, style);
    case "hebrew":
      return getCalendarAdapter("hebrew").formatDate(
        isoDate,
        language,
        "long",
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
    options.language,
    options.style,
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
      options.language,
      secondaryCalendar === "hebrew" ? "long" : "numeric",
    ),
  };
}
