import { useTranslation } from "react-i18next";
import { SlidingToggleGroup } from "@/components/ui/sliding-toggle-group";
import { useCalendarPreview, useEffectiveCalendarType } from "@/lib/calendar/calendar-preview";
import type { CalendarType } from "@/lib/calendar";

export function CalendarPreviewToggle() {
  const { t } = useTranslation("dashboard");
  const calendarType = useEffectiveCalendarType();
  const setPreview = useCalendarPreview((state) => state.setPreview);

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
