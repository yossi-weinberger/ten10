import React from "react";
import { useTranslation } from "react-i18next";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Languages, Moon, Sun, MonitorSmartphone } from "lucide-react";
import { useTheme } from "@/lib/theme";

type Theme = "light" | "dark" | "system";

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
  const { t, i18n } = useTranslation("settings");

  const handleLanguageChange = (lang: "he" | "en") => {
    i18n.changeLanguage(lang);
    updateSettings({ language: lang });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Languages className="h-5 w-5 text-primary" />
          <CardTitle>{t("languageAndDisplay.cardTitle")}</CardTitle>
        </div>
        <CardDescription>
          {t("languageAndDisplay.cardDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label>{t("languageAndDisplay.languageLabel")}</Label>
          <Select
            value={languageSettings.language}
            onValueChange={(value) =>
              handleLanguageChange(value as "he" | "en")
            }
            dir={i18n.dir()}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={t("languageAndDisplay.languagePlaceholder")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="he">
                {t("languageAndDisplay.hebrew")}
              </SelectItem>
              <SelectItem value="en">
                {t("languageAndDisplay.english")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>{t("languageAndDisplay.themeLabel")}</Label>
          <ToggleGroup
            type="single"
            value={theme}
            onValueChange={(value: string) => {
              if (value) setTheme(value as Theme);
            }}
            className="grid grid-cols-3 gap-1 rounded-md border p-1"
            aria-label={t("languageAndDisplay.themeLabel")}
          >
            <ToggleGroupItem
              value="light"
              aria-label={t("languageAndDisplay.lightTheme")}
              className="flex-1 justify-center data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
            >
              <Sun className="h-5 w-5" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="dark"
              aria-label={t("languageAndDisplay.darkTheme")}
              className="flex-1 justify-center data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
            >
              <Moon className="h-5 w-5" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="system"
              aria-label={t("languageAndDisplay.systemTheme")}
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
