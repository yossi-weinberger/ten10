import React from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatform } from "@/contexts/PlatformContext";
import {
  useDateControls,
  DateRangeSelectionType,
} from "@/hooks/useDateControls";
import { useServerStats } from "@/hooks/useServerStats";
import {
  Wallet,
  CreditCard,
  HandHelping,
  CircleDollarSign,
  TrendingUp,
  TrendingDown,
  Scale,
} from "lucide-react";
import { StatCard } from "./StatCards/StatCard";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { formatCurrency } from "@/lib/utils/currency";
import { useDonationStore } from "@/lib/store";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";

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

  const handleOverallRequiredAdd = () => {
    // For overall required, we'll navigate to donation since it reduces the required amount
    navigateToAddTransaction("donation");
  };

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
  } = useDateControls();

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

  // Income Card Subtitle Logic
  const incomeSubtitle =
    !isLoadingServerIncome &&
    !serverIncomeError &&
    typeof serverChomeshAmount === "number" &&
    serverChomeshAmount > 0 ? (
      <span className="block text-xs text-muted-foreground" dir={i18n.dir()}>
        <CountUp
          end={serverChomeshAmount}
          duration={0.75}
          decimals={2}
          formattingFn={(value) =>
            formatCurrency(value, defaultCurrency, i18n.language)
          }
        />{" "}
        {t("statsCards.income.withChomesh")}
      </span>
    ) : null;

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
      <div className="flex justify-end gap-2">
        {(Object.keys(dateRangeLabels) as DateRangeSelectionType[]).map(
          (rangeKey) => (
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
          )
        )}
      </div>

      <div className={containerClass}>
        <motion.div
          initial={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <StatCard
            title={t("statsCards.overallRequired.title")}
            value={serverTitheBalance}
            isLoading={isLoadingServerTitheBalance}
            error={serverTitheBalanceError}
            icon={Scale}
            colorScheme="blue"
            subtitleContent={overallRequiredSubtitle}
            isSpecial={true}
            onAddClick={handleOverallRequiredAdd}
            showAddButton={true}
            addButtonTooltip={t("statsCards.overallRequired.addDonation")}
          />
        </motion.div>
        <StatCard
          title={`${t("statsCards.income.title")} (${
            activeDateRangeObject.label ?? ""
          })`}
          value={serverTotalIncome}
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
          value={serverTotalExpenses}
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
          icon={HandHelping}
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
