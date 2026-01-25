import { useState, useEffect } from "react";
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
import { 
  getInitialBalanceTransaction, 
  updateTransaction,
  hasAnyTransaction,
  TransactionUpdatePayload 
} from "@/lib/data-layer/transactions.service";
import { LanguageAndDisplaySettingsCard } from "@/components/settings/LanguageAndDisplaySettingsCard";
import { FinancialSettingsCard } from "@/components/settings/FinancialSettingsCard";
import { NotificationSettingsCard } from "@/components/settings/NotificationSettingsCard";
import { CalendarSettingsCard } from "@/components/settings/CalendarSettingsCard";
import { ClearDataSection } from "@/components/settings/ClearDataSection";
import { ImportExportDataSection } from "@/components/settings/ImportExportDataSection";
import { VersionInfoCard } from "@/components/settings/VersionInfoCard";
import { OpeningBalanceModal } from "@/components/settings/OpeningBalanceModal";
import { logger } from "@/lib/logger";
import { Transaction } from "@/types/transaction";
import { CurrencyCode } from "@/lib/currencies";

import { useIsCurrencyLocked } from "@/hooks/useIsCurrencyLocked";

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings } = useDonationStore(
    useShallow((state) => ({
      settings: state.settings,
      updateSettings: state.updateSettings,
    }))
  );

  const { isLocked: isCurrencyLocked, isLoading: isCurrencyLockedLoading } = useIsCurrencyLocked();

  const [isClearing, setIsClearing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isOpeningBalanceModalOpen, setIsOpeningBalanceModalOpen] =
    useState(false);
  const [openingBalanceTransaction, setOpeningBalanceTransaction] = useState<Transaction | null>(null);
  const { platform } = usePlatform();
  const { user } = useAuth();
  const { t } = useTranslation("settings");
  const { t: tCommon } = useTranslation("common");

  // Fetch opening balance when modal opens
  const handleOpenBalanceModal = async () => {
    try {
        const transaction = await getInitialBalanceTransaction();
        setOpeningBalanceTransaction(transaction);
    } catch (error) {
        logger.error("Failed to fetch opening balance transaction:", error);
        setOpeningBalanceTransaction(null);
    }
    setIsOpeningBalanceModalOpen(true);
  };

  const handleUpdateOpeningBalance = async (id: string, updates: Partial<Transaction>) => {
      // Cast updates to TransactionUpdatePayload as updateTransaction expects specific structure
      // We know OpeningBalanceModal sends correct fields
      await updateTransaction(id, updates as TransactionUpdatePayload);
      
      // Refresh local state if needed
      // Ideally we should re-fetch to ensure sync, but modal closes anyway
  };

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      await clearAllData();
      // The hook will automatically update isCurrencyLocked when store changes
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
        defaultCurrency: settings.defaultCurrency as CurrencyCode,
        autoCalcChomesh: settings.autoCalcChomesh,
        minMaaserPercentage: settings.minMaaserPercentage,
      }}
      updateSettings={(newFinancialSettings) => {
        updateSettings(newFinancialSettings);
        
        // Also update Supabase profile if on web
        if (platform === "web" && user && newFinancialSettings.defaultCurrency) {
          supabase
            .from("profiles")
            .update({ default_currency: newFinancialSettings.defaultCurrency })
            .eq("id", user.id)
            .then(({ error }) => {
              if (error) {
                logger.error("Failed to update default currency in Supabase:", error);
                toast.error(tCommon("toast.settings.updateError"));
              }
            });
        }
      }}
      disableMinMaaserPercentage={true}
      onOpenBalanceModal={handleOpenBalanceModal}
      currencyLocked={isCurrencyLocked}
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
        initialData={openingBalanceTransaction}
        onUpdate={handleUpdateOpeningBalance}
      />
    </div>
  );
}
