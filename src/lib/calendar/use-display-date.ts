import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDonationStore } from "@/lib/store";
import {
  formatDisplayDate,
  type DisplayDate,
  type DisplayDateStyle,
} from "@/lib/calendar/display-date";
import type { CalendarLanguage } from "@/lib/calendar";

export function useDisplayDate(): (
  isoDate: string,
  style?: DisplayDateStyle,
) => DisplayDate {
  const { i18n } = useTranslation();
  const calendarType = useDonationStore(
    (state) => state.settings.calendarType,
  );
  const showSecondaryDate = useDonationStore(
    (state) => state.settings.showSecondaryDate,
  );
  const language: CalendarLanguage = i18n.language.startsWith("he")
    ? "he"
    : "en";

  return useCallback(
    (isoDate: string, style: DisplayDateStyle = "numeric") =>
      formatDisplayDate(isoDate, {
        calendarType,
        showSecondaryDate,
        language,
        style,
      }),
    [calendarType, language, showSecondaryDate],
  );
}
