import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SlidingToggleGroup } from "@/components/ui/sliding-toggle-group";
import type { CalendarType } from "@/lib/calendar";
import {
  formatDisplayDate,
  type DateFormatSettings,
} from "@/lib/calendar/display-date";
import { getCurrentLocalDate } from "@/lib/utils/local-date";

interface CalendarSettings extends DateFormatSettings {
  calendarType: CalendarType;
  showSecondaryDate: boolean;
}

interface CalendarSettingsCardProps {
  calendarSettings: CalendarSettings;
  updateSettings: (settings: Partial<CalendarSettings>) => void;
}

export function CalendarSettingsCard({
  calendarSettings,
  updateSettings,
}: CalendarSettingsCardProps) {
  const { t, i18n } = useTranslation("settings");
  const language = i18n.language?.startsWith("he") ? "he" : "en";
  const previewDate = (calendarType: CalendarType) =>
    formatDisplayDate(getCurrentLocalDate(), {
      ...calendarSettings,
      calendarType,
      showSecondaryDate: false,
      language,
      style: "numeric",
    }).primary;

  return (
    <Card dir={i18n.dir()}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <CardTitle>{t("calendar.cardTitle")}</CardTitle>
        </div>
        <CardDescription>{t("calendar.cardDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label>{t("calendar.primaryCalendarLabel")}</Label>
          <SlidingToggleGroup
            ariaLabel={t("calendar.primaryCalendarLabel")}
            value={calendarSettings.calendarType}
            onValueChange={(value) => updateSettings({ calendarType: value })}
            options={[
              {
                value: "gregorian",
                label: t("calendar.options.gregorian"),
              },
              {
                value: "hebrew",
                label: t("calendar.options.hebrew"),
              },
            ]}
          />
        </div>

        <div className="grid gap-2">
          <Label>{t("calendar.gregorianFormatLabel")}</Label>
          <SlidingToggleGroup
            ariaLabel={t("calendar.gregorianFormatLabel")}
            value={calendarSettings.gregorianDateFormat}
            onValueChange={(value) =>
              updateSettings({ gregorianDateFormat: value })
            }
            options={[
              {
                value: "day-month-year",
                label: t("calendar.gregorianFormatOptions.dayMonthYear"),
              },
              {
                value: "month-day-year",
                label: t("calendar.gregorianFormatOptions.monthDayYear"),
              },
              {
                value: "written",
                label: t("calendar.gregorianFormatOptions.written"),
              },
            ]}
          />
          <p className="text-sm text-muted-foreground" dir="auto">
            {t("calendar.formatExample", { date: previewDate("gregorian") })}
          </p>
        </div>

        {language === "en" && (
          <div className="grid gap-2">
            <Label>{t("calendar.hebrewEnglishFormatLabel")}</Label>
            <SlidingToggleGroup
              ariaLabel={t("calendar.hebrewEnglishFormatLabel")}
              value={calendarSettings.hebrewEnglishDateFormat}
              onValueChange={(value) =>
                updateSettings({ hebrewEnglishDateFormat: value })
              }
              options={[
                {
                  value: "mixed",
                  label: t("calendar.hebrewEnglishFormatOptions.mixed"),
                },
                {
                  value: "numbers",
                  label: t("calendar.hebrewEnglishFormatOptions.numbers"),
                },
                {
                  value: "letters",
                  label: t("calendar.hebrewEnglishFormatOptions.letters"),
                },
              ]}
            />
            <p className="text-sm text-muted-foreground" dir="auto">
              {t("calendar.formatExample", { date: previewDate("hebrew") })}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="grid gap-1">
            <Label htmlFor="show-secondary-date">
              {t("calendar.showSecondaryDateLabel")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t("calendar.showSecondaryDateDescription")}
            </p>
          </div>
          <Switch
            id="show-secondary-date"
            checked={calendarSettings.showSecondaryDate}
            onCheckedChange={(showSecondaryDate) =>
              updateSettings({ showSecondaryDate })
            }
            aria-label={t("calendar.showSecondaryDateLabel")}
          />
        </div>
      </CardContent>
    </Card>
  );
}
