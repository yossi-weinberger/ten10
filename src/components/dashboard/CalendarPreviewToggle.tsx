import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  useCalendarPreview,
  useEffectiveCalendarType,
} from "@/lib/calendar/calendar-preview";
import type { CalendarType } from "@/lib/calendar";

const OPTIONS = ["gregorian", "hebrew"] as const satisfies readonly CalendarType[];

export function CalendarPreviewToggle() {
  const { t } = useTranslation("dashboard");
  const calendarType = useEffectiveCalendarType();
  const setPreview = useCalendarPreview((state) => state.setPreview);

  return (
    <div
      className="inline-flex gap-1"
      role="group"
      aria-label={t("dateRange.calendarLabel")}
    >
      {OPTIONS.map((value) => (
        <Button
          key={value}
          type="button"
          size="sm"
          variant={calendarType === value ? "default" : "outline"}
          onClick={() => setPreview(value)}
          className={
            calendarType === value
              ? ""
              : "bg-transparent text-foreground hover:bg-muted/50"
          }
        >
          {t(
            value === "hebrew"
              ? "dateRange.calendarHebrew"
              : "dateRange.calendarGregorian",
          )}
        </Button>
      ))}
    </div>
  );
}
