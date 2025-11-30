import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatform } from "@/contexts/PlatformContext";
import {
  useDateControls,
  DateRangeSelectionType,
} from "@/hooks/useDateControls";
import { useServerStats } from "@/hooks/useServerStats";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import {
  Wallet,
  CreditCard,
  HandCoins,
  TrendingUp,
  TrendingDown,
  Scale,
  Calendar as CalendarIcon,
} from "lucide-react";
import { StatCard } from "./StatCards/StatCard";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { formatCurrency } from "@/lib/utils/currency";
import { useDonationStore } from "@/lib/store";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { he, enUS } from "date-fns/locale";
import { formatHebrewDate } from "@/lib/utils/hebrew-date";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { useEffect, useMemo, useState } from "react";

export function StatsCards({
  orientation = "horizontal",
}: {
  orientation?: "horizontal" | "vertical";
}) {
  const { user } = useAuth();
  const { platform } = usePlatform();
  const { t, i18n } = useTranslation("dashboard");
  const navigate = useNavigate();
  const defaultCurrency = useDonationStore(
    (state) => state.settings.defaultCurrency
  );

  // Navigation functions for each stat card
  const navigateToAddTransaction = (transactionType: string) => {
    navigate({
      to: "/add-transaction",
      search: { type: transactionType },
    });
  };

  // const handleOverallRequiredAdd = () => {
  //   // For overall required, we'll navigate to donation since it reduces the required amount
  //   navigateToAddTransaction("donation");
  // };

  const handleIncomeAdd = () => {
    navigateToAddTransaction("income");
  };

  const handleExpensesAdd = () => {
    navigateToAddTransaction("expense");
  };

  const handleDonationsAdd = () => {
    navigateToAddTransaction("donation");
  };

  const {
    dateRangeSelection,
    setDateRangeSelection,
    activeDateRangeObject,
    dateRangeLabels,
    customDateRange,
    setCustomDateRange,
  } = useDateControls();

  const settings = useDonationStore((state) => state.settings);

  const formatDate = (date: Date) => {
    if (settings.calendarType === "hebrew") {
      return formatHebrewDate(date);
    }
    // Use i18n language for locale selection
    const currentLocale = i18n.language === "he" ? he : enUS;
    return format(date, "dd/MM/yyyy", { locale: currentLocale });
  };

  const {
    serverTotalIncome,
    isLoadingServerIncome,
    serverIncomeError,
    serverChomeshAmount,
    serverTotalExpenses,
    isLoadingServerExpenses,
    serverExpensesError,
    serverCalculatedDonationsData,
    isLoadingServerDonations,
    serverDonationsError,
    serverTitheBalance,
    isLoadingServerTitheBalance,
    serverTitheBalanceError,
  } = useServerStats(activeDateRangeObject, user, platform);

  const [lastChomeshValue, setLastChomeshValue] = useState<number | null>(null);

  useEffect(() => {
    if (typeof serverChomeshAmount === "number") {
      setLastChomeshValue(serverChomeshAmount);
    }
  }, [serverChomeshAmount]);

  const effectiveChomeshValue =
    typeof serverChomeshAmount === "number"
      ? serverChomeshAmount
      : lastChomeshValue;

  // Income Card Subtitle Logic
  const {
    displayValue: chomeshDisplayValue,
    startAnimateValue: chomeshStartValue,
  } = useAnimatedCounter({
    serverValue: effectiveChomeshValue ?? undefined,
    isLoading: isLoadingServerIncome,
  });

  // Memoize the formatting function to prevent re-creation
  const formatChomeshCurrency = useMemo(
    () => (value: number) =>
      formatCurrency(value, defaultCurrency, i18n.language),
    [defaultCurrency, i18n.language]
  );

  const incomeSubtitle = useMemo(() => {
    if (
      serverIncomeError ||
      typeof effectiveChomeshValue !== "number" ||
      effectiveChomeshValue <= 0
    ) {
      return null;
    }

    return (
      <span className="block text-xs text-muted-foreground" dir={i18n.dir()}>
        <CountUp
          start={chomeshStartValue}
          end={chomeshDisplayValue}
          duration={0.75}
          decimals={2}
          formattingFn={formatChomeshCurrency}
        />{" "}
        {t("statsCards.income.withChomesh")}
      </span>
    );
  }, [
    serverIncomeError,
    effectiveChomeshValue,
    chomeshStartValue,
    chomeshDisplayValue,
    formatChomeshCurrency,
    i18n.dir,
    t,
  ]);

  // Donations Card Subtitle Logic
  const serverTotalDonationsAmount =
    serverCalculatedDonationsData?.total_donations_amount;
  const percentageOfIncome =
    serverTotalIncome && serverTotalDonationsAmount
      ? (serverTotalDonationsAmount / serverTotalIncome) * 100
      : 0;
  const donationsSubtitle = (
    <>
      <div className="mt-2 relative">
        <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full">
          <div
            className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full transition-all duration-1000 ease-in-out"
            style={{
              width: `${Math.min(percentageOfIncome, 100)}%`,
            }}
          />
        </div>
      </div>
      <p
        className={`text-xs text-muted-foreground mt-2 ${
          i18n.dir() === "rtl" ? "text-right" : "text-left"
        }`}
        style={{ minHeight: "1.2em" }}
        dir={i18n.dir()}
      >
        {t("statsCards.donations.percentageOfIncome", {
          percentage: percentageOfIncome.toFixed(1),
        })}
      </p>
    </>
  );

  // Overall Required Card Subtitle Logic (handles negatives safely)
  const rawDonations =
    serverCalculatedDonationsData?.total_donations_amount ?? 0;
  const rawBalance = serverTitheBalance ?? 0;

  const donations = Math.max(0, rawDonations); // refunds shouldn't create negative progress
  const balancePositive = Math.max(0, rawBalance); // only positive balance counts toward remaining

  const donationProgress = (() => {
    // goal reached or exceeded
    if (rawBalance <= 0) return 100;

    const denom = donations + balancePositive;
    if (denom === 0) return 0;

    const pct = (donations / denom) * 100;
    // final safety clamp
    return Math.min(100, Math.max(0, pct));
  })();

  const displayBalanceForText = serverTitheBalance ?? 0;
  const overallRequiredSubtitle = (
    <>
      <div className="mt-2 relative">
        <div className="h-2.5 bg-blue-200 dark:bg-blue-800 rounded-full">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-sky-500 rounded-full transition-all duration-1000 ease-in-out"
            style={{
              width: `${Math.min(donationProgress, 100)}%`,
            }}
          />
        </div>
      </div>
      <motion.p
        initial={{ opacity: 0.8 }}
        whileHover={{ opacity: 1 }}
        className={`text-xs text-muted-foreground mt-2 ${
          i18n.dir() === "rtl" ? "text-right" : "text-left"
        } font-medium`}
        style={{ minHeight: "1.2em" }}
        dir={i18n.dir()}
      >
        {displayBalanceForText <= 0
          ? t("statsCards.overallRequired.exceededGoal", {
              amount: formatCurrency(
                Math.abs(displayBalanceForText),
                defaultCurrency,
                i18n.language
              ),
            })
          : t("statsCards.overallRequired.goalProgress", {
              percentage: donationProgress.toFixed(1),
            })}
      </motion.p>
    </>
  );

  const containerClass =
    orientation === "horizontal"
      ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4"
      : "grid grid-rows-4 gap-4 flex-grow";

  const rootContainerClass =
    orientation === "vertical" ? "space-y-4 h-full flex flex-col" : "space-y-4";

  return (
    <div className={rootContainerClass}>
      <div className="flex justify-end gap-2 items-center flex-wrap">
        {(Object.keys(dateRangeLabels) as DateRangeSelectionType[])
          .filter((rangeKey) => rangeKey !== "custom")
          .map((rangeKey) => (
            <Button
              key={rangeKey}
              variant={dateRangeSelection === rangeKey ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRangeSelection(rangeKey)}
              className={
                dateRangeSelection !== rangeKey
                  ? "bg-transparent text-foreground hover:bg-muted/50"
                  : ""
              }
            >
              {dateRangeLabels[rangeKey]}
            </Button>
          ))}
        <DatePickerWithRange
          date={customDateRange}
          onDateChange={(range) => {
            setCustomDateRange(range);
            // Automatically switch to custom mode when a range is selected
            if (range?.from && range?.to) {
              setDateRangeSelection("custom");
            }
          }}
          triggerButton={
            <Button
              variant={dateRangeSelection === "custom" ? "default" : "outline"}
              size="sm"
              className={`whitespace-nowrap flex-shrink-0 ${
                dateRangeSelection !== "custom"
                  ? "bg-transparent text-foreground hover:bg-muted/50"
                  : ""
              }`}
            >
              <CalendarIcon className="h-4 w-4 md:ml-2" />
              <span className="hidden md:inline">
                {customDateRange?.from && customDateRange?.to
                  ? `${formatDate(customDateRange.from)} - ${formatDate(
                      customDateRange.to
                    )}`
                  : dateRangeLabels.custom}
              </span>
            </Button>
          }
          className="w-auto"
        />
      </div>

      <div className={containerClass}>
        <motion.div
          initial={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <StatCard
            title={t("statsCards.overallRequired.title")}
            value={serverTitheBalance ?? null}
            isLoading={isLoadingServerTitheBalance}
            error={serverTitheBalanceError}
            icon={Scale}
            colorScheme="blue"
            subtitleContent={overallRequiredSubtitle}
            isSpecial={true}
            // onAddClick={handleOverallRequiredAdd}
            showAddButton={false}
            addButtonTooltip={t("statsCards.overallRequired.addDonation")}
          />
        </motion.div>
        <StatCard
          title={`${t("statsCards.income.title")} (${
            activeDateRangeObject.label ?? ""
          })`}
          value={serverTotalIncome ?? null}
          isLoading={isLoadingServerIncome}
          error={serverIncomeError}
          icon={Wallet}
          colorScheme="green"
          subtitleContent={incomeSubtitle}
          footerContent={
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          }
          onAddClick={handleIncomeAdd}
          showAddButton={true}
          addButtonTooltip={t("statsCards.income.addIncome")}
        />
        <StatCard
          title={`${t("statsCards.expenses.title")} (${
            activeDateRangeObject.label ?? ""
          })`}
          value={serverTotalExpenses ?? null}
          isLoading={isLoadingServerExpenses}
          error={serverExpensesError}
          icon={CreditCard}
          colorScheme="red"
          footerContent={
            <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
          }
          onAddClick={handleExpensesAdd}
          showAddButton={true}
          addButtonTooltip={t("statsCards.expenses.addExpense")}
        />
        <StatCard
          title={`${t("statsCards.donations.title")} (${
            activeDateRangeObject.label ?? ""
          })`}
          value={serverCalculatedDonationsData?.total_donations_amount ?? null}
          isLoading={isLoadingServerDonations}
          error={serverDonationsError}
          icon={HandCoins}
          colorScheme="yellow"
          subtitleContent={donationsSubtitle}
          onAddClick={handleDonationsAdd}
          showAddButton={true}
          addButtonTooltip={t("statsCards.donations.addDonation")}
        />
      </div>
    </div>
  );
}
