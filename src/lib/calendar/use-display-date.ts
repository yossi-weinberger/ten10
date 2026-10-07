import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useDonationStore } from "@/lib/store";
import { useEffectiveCalendarType } from "@/lib/calendar/calendar-preview";
import {
  formatDisplayDate,
  type DateFormatSettings,
  type DisplayDate,
  type DisplayDateStyle,
} from "@/lib/calendar/display-date";
import type { CalendarLanguage } from "@/lib/calendar";

export function useDateFormatSettings(): DateFormatSettings {
  const gregorianDateFormat = useDonationStore(
    (state) => state.settings.gregorianDateFormat,
  );
  const hebrewEnglishDateFormat = useDonationStore(
    (state) => state.settings.hebrewEnglishDateFormat,
  );

  return useMemo(
    () => ({ gregorianDateFormat, hebrewEnglishDateFormat }),
    [gregorianDateFormat, hebrewEnglishDateFormat],
  );
}

export function useDisplayDate(): (
  isoDate: string,
  style?: DisplayDateStyle,
) => DisplayDate {
  const { i18n } = useTranslation();
  const calendarType = useEffectiveCalendarType();
  const showSecondaryDate = useDonationStore(
    (state) => state.settings.showSecondaryDate,
  );
  const dateFormat = useDateFormatSettings();
  const language: CalendarLanguage = i18n.language.startsWith("he")
    ? "he"
    : "en";

  return useCallback(
    (isoDate: string, style: DisplayDateStyle = "numeric") =>
      formatDisplayDate(isoDate, {
        ...dateFormat,
        calendarType,
        showSecondaryDate,
        language,
        style,
      }),
    [calendarType, dateFormat, language, showSecondaryDate],
  );
}
