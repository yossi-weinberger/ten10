import type { CalendarType } from "@/lib/calendar";

interface StoredCalendarSettings {
  calendarType?: unknown;
  showSecondaryDate?: unknown;
}

interface CalendarSettings {
  calendarType: CalendarType;
  showSecondaryDate: boolean;
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
