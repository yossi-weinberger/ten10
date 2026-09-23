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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { CalendarType } from "@/lib/calendar";

interface CalendarSettings {
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
          <ToggleGroup
            type="single"
            value={calendarSettings.calendarType}
            onValueChange={(value) => {
              if (value === "gregorian" || value === "hebrew") {
                updateSettings({ calendarType: value });
              }
            }}
            aria-label={t("calendar.primaryCalendarLabel")}
            className="grid grid-cols-2 gap-1 rounded-md border p-1"
          >
            <ToggleGroupItem
              value="gregorian"
              className="flex-1 justify-center hover:bg-accent hover:text-accent-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {t("calendar.options.gregorian")}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="hebrew"
              className="flex-1 justify-center hover:bg-accent hover:text-accent-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {t("calendar.options.hebrew")}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

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
