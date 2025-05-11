import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useTheme } from "@/lib/theme";
import { useDonationStore } from "@/lib/store";
import { clearAllData } from "@/lib/dataService";
import toast from "react-hot-toast";
import { usePlatform } from "@/contexts/PlatformContext";
import {
  exportDataDesktop,
  importDataDesktop,
  exportDataWeb,
  importDataWeb,
} from "@/lib/dataManagement";
import { LanguageAndDisplaySettingsCard } from "@/components/settings/LanguageAndDisplaySettingsCard";
import { FinancialSettingsCard } from "@/components/settings/FinancialSettingsCard";
import { NotificationSettingsCard } from "@/components/settings/NotificationSettingsCard";
import { CalendarSettingsCard } from "@/components/settings/CalendarSettingsCard";
import { ClearDataSection } from "@/components/settings/ClearDataSection";
import { ImportExportDataSection } from "@/components/settings/ImportExportDataSection";

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings } = useDonationStore();
  const [isClearing, setIsClearing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { platform } = usePlatform();

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      await clearAllData();
      toast.success("כל הנתונים נמחקו בהצלחה!");
    } catch (error) {
      console.error("Failed to clear data:", error);
      toast.error("שגיאה במחיקת הנתונים.");
    } finally {
      setIsClearing(false);
    }
  };

  const handleExportData = async () => {
    if (platform === "desktop") {
      await exportDataDesktop({ setIsLoading: setIsExporting });
    } else if (platform === "web") {
      await exportDataWeb({ setIsLoading: setIsExporting });
    } else {
      toast.error("פלטפורמה לא ידועה, לא ניתן לייצא נתונים.");
    }
  };

  const handleImportData = async () => {
    if (platform === "desktop") {
      await importDataDesktop({ setIsLoading: setIsImporting });
    } else if (platform === "web") {
      await importDataWeb({ setIsLoading: setIsImporting });
    } else {
      toast.error("פלטפורמה לא ידועה, לא ניתן לייבא נתונים.");
    }
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold">הגדרות</h2>
        <p className="text-muted-foreground">התאם את האפליקציה להעדפותיך</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <LanguageAndDisplaySettingsCard
          theme={theme}
          setTheme={setTheme}
          languageSettings={{ language: settings.language }}
          updateSettings={(newLangSettings) => updateSettings(newLangSettings)}
        />

        <FinancialSettingsCard
          financialSettings={{
            defaultCurrency: settings.defaultCurrency,
            autoCalcChomesh: settings.autoCalcChomesh,
            minMaaserPercentage: settings.minMaaserPercentage,
          }}
          updateSettings={(newFinancialSettings) =>
            updateSettings(newFinancialSettings)
          }
        />

        <NotificationSettingsCard
          notificationSettings={{
            notifications: settings.notifications,
            recurringDonations: settings.recurringDonations,
          }}
          updateSettings={(newNotificationSettings) =>
            updateSettings(newNotificationSettings)
          }
        />

        <CalendarSettingsCard
          calendarSettings={{
            calendarType: settings.calendarType,
            maaserYearStart: ["tishrei", "nisan", "january"].includes(
              settings.maaserYearStart ?? ""
            )
              ? (settings.maaserYearStart as
                  | "tishrei"
                  | "nisan"
                  | "january"
                  | undefined)
              : undefined,
          }}
          updateSettings={(newCalendarSettings) =>
            updateSettings(newCalendarSettings)
          }
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>ניהול נתונים</CardTitle>
          </div>
          <CardDescription>
            ייצא, ייבא או מחק את נתוני האפליקציה שלך. אנא בצע פעולות אלו
            בזהירות.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-6">
          <ClearDataSection
            handleClearData={handleClearData}
            isClearing={isClearing}
          />
          <ImportExportDataSection
            handleExportData={handleExportData}
            isExporting={isExporting}
            handleImportData={handleImportData}
            isImporting={isImporting}
          />
        </CardContent>
      </Card>
    </div>
  );
}
