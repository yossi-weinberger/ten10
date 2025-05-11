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
import { Languages, Moon, Sun } from "lucide-react";
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

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border">
              {theme === "dark" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </div>
            <div>
              <Label>מצב כהה</Label>
              <p className="text-sm text-muted-foreground">
                התאם את מראה האפליקציה
              </p>
            </div>
          </div>
          <Switch
            checked={theme === "dark"}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          />
        </div>
      </CardContent>
    </Card>
  );
}
