import { useEffect, useRef, useState } from "react";
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

  // Sliding indicator logic (inspired by Ibelick's sliding tab bar)
  const toggleRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [sliderLeft, setSliderLeft] = useState(0);
  const [sliderWidth, setSliderWidth] = useState(0);

  const getActiveIndex = () => {
    const order: Array<Theme> = ["light", "dark", "system"];
    const idx = order.indexOf(theme);
    return idx === -1 ? 0 : idx;
  };

  useEffect(() => {
    const index = getActiveIndex();
    const current = toggleRefs.current[index];
    if (!current) return;

    const update = () => {
      setSliderLeft(current.offsetLeft ?? 0);
      setSliderWidth(current.clientWidth ?? 0);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

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
          <ToggleGroup
            type="single"
            value={theme}
            onValueChange={(value: string) => {
              if (value) setTheme(value as Theme);
            }}
            className="relative grid grid-cols-3 gap-1 rounded-md border p-1"
            aria-label={t("languageAndDisplay.themeLabel")}
          >
            {/* sliding background */}
            <span
              className="absolute inset-y-1 z-0 rounded-md bg-accent shadow-sm transition-[left,width] duration-500 ease-in-out"
              style={{ left: sliderLeft, width: sliderWidth }}
            />
            <ToggleGroupItem
              value="light"
              aria-label={t("languageAndDisplay.lightTheme")}
              className="relative z-10 flex-1 justify-center hover:bg-transparent data-[state=on]:bg-transparent data-[state=on]:text-accent-foreground"
              ref={(el) => {
                toggleRefs.current[0] = el;
              }}
            >
              <Sun className="h-5 w-5" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="dark"
              aria-label={t("languageAndDisplay.darkTheme")}
              className="relative z-10 flex-1 justify-center hover:bg-transparent data-[state=on]:bg-transparent data-[state=on]:text-accent-foreground"
              ref={(el) => {
                toggleRefs.current[1] = el;
              }}
            >
              <Moon className="h-5 w-5" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="system"
              aria-label={t("languageAndDisplay.systemTheme")}
              className="relative z-10 flex-1 justify-center hover:bg-transparent data-[state=on]:bg-transparent data-[state=on]:text-accent-foreground"
              ref={(el) => {
                toggleRefs.current[2] = el;
              }}
            >
              <MonitorSmartphone className="h-5 w-5" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardContent>
    </Card>
  );
}
