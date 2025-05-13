import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Languages, Moon, Sun, MonitorSmartphone } from "lucide-react";
import { useTheme } from "@/lib/theme";

// Define the Theme type based on its definition in theme.tsx
type Theme = "light" | "dark" | "system";

// Define the specific settings properties needed by this component
interface LanguageSettings {
  language: "he" | "en";
}

interface LanguageAndDisplaySettingsCardProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  languageSettings: LanguageSettings;
  updateSettings: (newSettings: Partial<LanguageSettings>) => void;
}

export function LanguageAndDisplaySettingsCard({
  theme,
  setTheme,
  languageSettings,
  updateSettings,
}: LanguageAndDisplaySettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Languages className="h-5 w-5 text-primary" />
          <CardTitle>שפה ותצוגה</CardTitle>
        </div>
        <CardDescription>הגדרות שפה ותצוגה כלליות</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label>שפה</Label>
          <Select
            value={languageSettings.language}
            onValueChange={(value) =>
              updateSettings({ language: value as "he" | "en" })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="בחר שפה" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="he">עברית</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>ערכת נושא</Label>
          <ToggleGroup
            type="single"
            value={theme}
            onValueChange={(value: string) => {
              if (value) setTheme(value as Theme);
            }}
            className="grid grid-cols-3 gap-1 rounded-md border p-1"
            aria-label="Theme selection"
          >
            <ToggleGroupItem
              value="light"
              aria-label="Light theme"
              className="flex-1 justify-center data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
            >
              <Sun className="h-5 w-5" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="dark"
              aria-label="Dark theme"
              className="flex-1 justify-center data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
            >
              <Moon className="h-5 w-5" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="system"
              aria-label="System theme"
              className="flex-1 justify-center data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
            >
              <MonitorSmartphone className="h-5 w-5" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardContent>
    </Card>
  );
}
