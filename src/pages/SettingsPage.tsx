import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useTheme } from "@/lib/theme";
import { useDonationStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { clearAllData } from "@/lib/data-layer";
import toast from "react-hot-toast";
import { usePlatform } from "@/contexts/PlatformContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import {
  exportDataWeb,
  importDataWeb,
  exportDataDesktop,
  importDataDesktop,
} from "@/lib/data-layer/dataManagement.service";
import { LanguageAndDisplaySettingsCard } from "@/components/settings/LanguageAndDisplaySettingsCard";
import { FinancialSettingsCard } from "@/components/settings/FinancialSettingsCard";
import { NotificationSettingsCard } from "@/components/settings/NotificationSettingsCard";
import { CalendarSettingsCard } from "@/components/settings/CalendarSettingsCard";
import { ClearDataSection } from "@/components/settings/ClearDataSection";
import { ImportExportDataSection } from "@/components/settings/ImportExportDataSection";

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings } = useDonationStore(
    useShallow((state) => ({
      settings: state.settings,
      updateSettings: state.updateSettings,
    }))
  );
  const [isClearing, setIsClearing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { platform } = usePlatform();
  const { user } = useAuth();
  const { t } = useTranslation("settings");
  const { t: tCommon } = useTranslation("common");

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      await clearAllData();
      toast.success(tCommon("toast.settings.clearDataSuccess"));
    } catch (error) {
      console.error("Failed to clear data:", error);
      toast.error(tCommon("toast.settings.clearDataError"));
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
      toast.error(tCommon("toast.settings.exportError"));
    }
  };

  const handleImportData = async () => {
    if (platform === "desktop") {
      await importDataDesktop({ setIsLoading: setIsImporting });
    } else if (platform === "web") {
      await importDataWeb({ setIsLoading: setIsImporting });
    } else {
      toast.error(tCommon("toast.settings.importError"));
    }
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold text-foreground">{t("pageTitle")}</h2>
        <p className="text-muted-foreground">{t("pageDescription")}</p>
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
            defaultCurrency: settings.defaultCurrency as "ILS" | "USD" | "EUR",
            autoCalcChomesh: settings.autoCalcChomesh,
            minMaaserPercentage: settings.minMaaserPercentage,
          }}
          updateSettings={(newFinancialSettings) =>
            updateSettings(newFinancialSettings)
          }
          disableAutoCalcChomesh={true}
          disableMinMaaserPercentage={true}
        />

        <NotificationSettingsCard
          notificationSettings={{
            notifications: settings.notifications,
            recurringDonations: settings.recurringDonations,
            reminderEnabled: settings.reminderEnabled,
            reminderDayOfMonth: settings.reminderDayOfMonth,
          }}
          updateSettings={async (newNotificationSettings) => {
            // Update local settings immediately
            updateSettings(newNotificationSettings);

            // Update Supabase for web users
            if (platform === "web" && user) {
              try {
                await supabase
                  .from("profiles")
                  .update({
                    reminder_enabled: newNotificationSettings.reminderEnabled,
                    reminder_day_of_month:
                      newNotificationSettings.reminderDayOfMonth,
                  })
                  .eq("id", user.id);
              } catch (error) {
                console.error(
                  "Failed to update reminder settings in Supabase:",
                  error
                );
                toast.error(tCommon("toast.settings.updateError"));
              }
            }
          }}
          disabled={false}
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
          disabled={true}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>{t("dataManagementTitle")}</CardTitle>
          </div>
          <CardDescription>{t("dataManagementDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-6">
          <ImportExportDataSection
            handleExportData={handleExportData}
            isExporting={isExporting}
            handleImportData={handleImportData}
            isImporting={isImporting}
          />
          <ClearDataSection
            handleClearData={handleClearData}
            isClearing={isClearing}
          />
        </CardContent>
      </Card>
    </div>
  );
}
