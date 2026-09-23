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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { CalendarType } from "@/lib/calendar";

interface CalendarSettings {
  calendarType: CalendarType;
  showSecondaryDate: boolean;
}

interface CalendarSettingsCardProps {
  calendarSettings: CalendarSettings;
  updateSettings: (settings: Partial<CalendarSettings>) => void;
}

function parseCalendarType(value: string): CalendarType {
  if (value === "gregorian" || value === "hebrew") {
    return value;
  }
  throw new Error(`Unsupported calendar type: ${value}`);
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
          <Label htmlFor="primary-calendar">
            {t("calendar.primaryCalendarLabel")}
          </Label>
          <Select
            value={calendarSettings.calendarType}
            onValueChange={(value) =>
              updateSettings({ calendarType: parseCalendarType(value) })
            }
          >
            <SelectTrigger
              id="primary-calendar"
              aria-label={t("calendar.primaryCalendarLabel")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gregorian">
                {t("calendar.options.gregorian")}
              </SelectItem>
              <SelectItem value="hebrew">
                {t("calendar.options.hebrew")}
              </SelectItem>
            </SelectContent>
          </Select>
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
