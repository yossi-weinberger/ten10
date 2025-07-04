import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator } from "lucide-react"; // Assuming Calculator icon is used, adjust if another
import { Badge } from "@/components/ui/badge";

// Define the specific settings properties needed by this component
interface CalendarSettings {
  calendarType: "gregorian" | "hebrew";
  maaserYearStart: "tishrei" | "nisan" | "january" | undefined;
}

interface CalendarSettingsCardProps {
  calendarSettings: CalendarSettings;
  updateSettings: (newSettings: Partial<CalendarSettings>) => void;
  disabled?: boolean;
}

export function CalendarSettingsCard({
  calendarSettings,
  updateSettings,
  disabled = false,
}: CalendarSettingsCardProps) {
  return (
    <Card className={disabled ? "opacity-50 pointer-events-none" : ""}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <CardTitle>הגדרות לוח שנה</CardTitle>
          {disabled && (
            <Badge
              variant="outline"
              className="ml-auto text-amber-600 border-amber-600 dark:text-amber-500 dark:border-amber-500"
            >
              בקרוב
            </Badge>
          )}
        </div>
        <CardDescription>הגדרות תצוגת תאריכים</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label>סוג לוח שנה</Label>
          <Select
            value={calendarSettings.calendarType}
            onValueChange={(value) =>
              updateSettings({
                calendarType: value as "gregorian" | "hebrew",
              })
            }
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="בחר סוג לוח שנה" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gregorian">לוח גרגוריאני</SelectItem>
              <SelectItem value="hebrew">לוח עברי</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>תחילת שנת מעשרות</Label>
          <Select
            value={calendarSettings.maaserYearStart}
            onValueChange={(value) =>
              updateSettings({
                maaserYearStart: value as
                  | "tishrei"
                  | "nisan"
                  | "january"
                  | undefined,
              })
            }
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="בחר חודש" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tishrei">תשרי</SelectItem>
              <SelectItem value="nisan">ניסן</SelectItem>
              <SelectItem value="january">ינואר</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
