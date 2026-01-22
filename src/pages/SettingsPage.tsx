import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { VersionInfoCard } from "@/components/settings/VersionInfoCard";
import { OpeningBalanceModal } from "@/components/settings/OpeningBalanceModal";
import { logger } from "@/lib/logger";

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings, serverCalculatedTotalIncome, serverCalculatedTotalExpenses, serverCalculatedTotalDonations } = useDonationStore(
    useShallow((state) => ({
      settings: state.settings,
      updateSettings: state.updateSettings,
      serverCalculatedTotalIncome: state.serverCalculatedTotalIncome,
      serverCalculatedTotalExpenses: state.serverCalculatedTotalExpenses,
      serverCalculatedTotalDonations: state.serverCalculatedTotalDonations,
    }))
  );

  const hasTransactions =
    (serverCalculatedTotalIncome || 0) > 0 ||
    (serverCalculatedTotalExpenses || 0) > 0 ||
    (serverCalculatedTotalDonations || 0) > 0;

  const [isClearing, setIsClearing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isOpeningBalanceModalOpen, setIsOpeningBalanceModalOpen] =
    useState(false);
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
      logger.error("Failed to clear data:", error);
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

  // Define components to reuse in both layouts
  const languageSection = (
    <LanguageAndDisplaySettingsCard
      theme={theme}
      setTheme={setTheme}
      languageSettings={{ language: settings.language }}
      updateSettings={(newLangSettings) => updateSettings(newLangSettings)}
    />
  );

  const versionSection = <VersionInfoCard />;

  const financialSection = (
    <FinancialSettingsCard
      financialSettings={{
        defaultCurrency: settings.defaultCurrency as any,
        autoCalcChomesh: settings.autoCalcChomesh,
        minMaaserPercentage: settings.minMaaserPercentage,
      }}
      updateSettings={(newFinancialSettings) =>
        updateSettings(newFinancialSettings)
      }
      disableMinMaaserPercentage={true}
      onOpenBalanceModal={() => setIsOpeningBalanceModalOpen(true)}
      currencyLocked={hasTransactions}
    />
  );

  const notificationSection = (
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
                mailing_list_consent: newNotificationSettings.reminderEnabled, // Also update mailing list consent
                reminder_day_of_month:
                  newNotificationSettings.reminderDayOfMonth,
              })
              .eq("id", user.id);
          } catch (error) {
            logger.error(
              "Failed to update reminder settings in Supabase:",
              error
            );
            toast.error(tCommon("toast.settings.updateError"));
          }
        }
      }}
      disabled={false}
    />
  );

  const calendarSection = (
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
  );

  const importExportSection = (
    <ImportExportDataSection
      handleExportData={handleExportData}
      isExporting={isExporting}
      handleImportData={handleImportData}
      isImporting={isImporting}
      className="flex-1"
    />
  );

  const clearDataSection = (
    <ClearDataSection
      handleClearData={handleClearData}
      isClearing={isClearing}
      className="flex-1"
    />
  );

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold text-foreground">{t("pageTitle")}</h2>
        <p className="text-muted-foreground">{t("pageDescription")}</p>
      </div>

      {/* Desktop Layout (Two Independent Columns) */}
      <div className="hidden md:grid md:grid-cols-2 gap-6 items-start">
        {/* Left Column */}
        <div className="flex flex-col gap-6 h-full">
          {languageSection}
          {versionSection}
          {importExportSection}
          {clearDataSection}
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6 h-full">
          {financialSection}
          {notificationSection}
          {calendarSection}
        </div>
      </div>

      {/* Mobile Layout (Single Column, Custom Order) */}
      <div className="flex flex-col gap-6 md:hidden">
        {languageSection}
        {versionSection}
        {financialSection}
        {notificationSection}
        {calendarSection}
        {importExportSection}
        {clearDataSection}
      </div>

      <OpeningBalanceModal
        isOpen={isOpeningBalanceModalOpen}
        onClose={() => setIsOpeningBalanceModalOpen(false)}
      />
    </div>
  );
}