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
import { SlidingToggleGroup } from "@/components/ui/sliding-toggle-group";
import { Languages, Moon, Sun, MonitorSmartphone } from "lucide-react";

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
    (i18n as any).changeLanguage(lang);
    updateSettings({ language: lang });
  };

  // Use the actual i18n language instead of Zustand to ensure sync
  const currentLanguage = (i18n.language || "he") as "he" | "en";

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
          <ToggleGroup
            type="single"
            value={currentLanguage}
            onValueChange={(value) => {
              if (value) handleLanguageChange(value as "he" | "en");
            }}
            className="grid grid-cols-2 gap-1 rounded-md border p-1"
          >
            <ToggleGroupItem
              value="he"
              className="flex-1 justify-center hover:bg-accent hover:text-accent-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {t("languageAndDisplay.hebrew")}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="en"
              className="flex-1 justify-center hover:bg-accent hover:text-accent-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {t("languageAndDisplay.english")}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="grid gap-2">
          <Label>{t("languageAndDisplay.themeLabel")}</Label>
          <SlidingToggleGroup
            ariaLabel={t("languageAndDisplay.themeLabel")}
            value={theme}
            onValueChange={setTheme}
            options={[
              {
                value: "light",
                label: <Sun className="h-5 w-5" />,
                ariaLabel: t("languageAndDisplay.lightTheme"),
              },
              {
                value: "dark",
                label: <Moon className="h-5 w-5" />,
                ariaLabel: t("languageAndDisplay.darkTheme"),
              },
              {
                value: "system",
                label: <MonitorSmartphone className="h-5 w-5" />,
                ariaLabel: t("languageAndDisplay.systemTheme"),
              },
            ]}
          />
        </div>
      </CardContent>
    </Card>
  );
}
