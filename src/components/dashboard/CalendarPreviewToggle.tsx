import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SlidingToggleGroup } from "@/components/ui/sliding-toggle-group";
import { useCalendarPreview, useEffectiveCalendarType } from "@/lib/calendar/calendar-preview";
import type { CalendarType } from "@/lib/calendar";
import { useDonationStore } from "@/lib/store";

export function CalendarPreviewToggle() {
  const { t } = useTranslation("dashboard");
  const calendarType = useEffectiveCalendarType();
  const setPreview = useCalendarPreview((state) => state.setPreview);
  const clearPreview = useCalendarPreview((state) => state.clearPreview);
  const preview = useCalendarPreview((state) => state.preview);
  const savedCalendarType = useDonationStore(
    (state) => state.settings.calendarType,
  );
  const showSecondaryDate = useDonationStore(
    (state) => state.settings.showSecondaryDate,
  );
  const showToggle = savedCalendarType === "hebrew" || showSecondaryDate;

  useEffect(() => {
    if (!showToggle && preview !== null) {
      clearPreview();
    }
  }, [showToggle, preview, clearPreview]);

  if (!showToggle) {
    return null;
  }

  return (
    <SlidingToggleGroup
      ariaLabel={t("dateRange.calendarLabel")}
      size="compact"
      className="w-fit"
      value={calendarType}
      onValueChange={(value) => setPreview(value)}
      options={[
        {
          value: "gregorian" satisfies CalendarType,
          label: t("dateRange.calendarGregorian"),
        },
        {
          value: "hebrew" satisfies CalendarType,
          label: t("dateRange.calendarHebrew"),
        },
      ]}
    />
  );
}
