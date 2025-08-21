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
  Sparkles,
} from "lucide-react";
import { StatCard } from "./StatCards/StatCard";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { formatCurrency } from "@/lib/utils/currency";
import { useDonationStore } from "@/lib/store";
import { useTranslation } from "react-i18next";

export function StatsCards({
  orientation = "horizontal",
}: {
  orientation?: "horizontal" | "vertical";
}) {
  const { user } = useAuth();
  const { platform } = usePlatform();
  const { t, i18n } = useTranslation("dashboard");
  const defaultCurrency = useDonationStore(
    (state) => state.settings.defaultCurrency
  );

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
      <span className="block text-xs text-muted-foreground">
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
      <Progress value={percentageOfIncome} className="mt-2" />
      <p
        className="text-xs text-muted-foreground mt-2 text-right"
        style={{ minHeight: "1.2em" }}
      >
        {t("statsCards.donations.percentageOfIncome", {
          percentage: percentageOfIncome.toFixed(1),
        })}
      </p>
    </>
  );

  // Overall Required Card Subtitle Logic
  const donationProgress =
    (serverTotalDonationsAmount ?? 0) /
      ((serverTotalDonationsAmount ?? 0) + (serverTitheBalance ?? 0)) >
    0
      ? ((serverTotalDonationsAmount ?? 0) /
          ((serverTotalDonationsAmount ?? 0) + (serverTitheBalance ?? 0))) *
        100
      : 100;

  const displayBalanceForText = serverTitheBalance ?? 0;
  const overallRequiredSubtitle = (
    <>
      <div className="mt-4 relative">
        <Progress
          value={donationProgress}
          className="h-2.5 bg-purple-200 dark:bg-purple-800"
        />
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full opacity-75"
          style={{
            width: `${Math.min(donationProgress, 100)}%`,
            transition: "width 1s ease-in-out",
          }}
        />
      </div>
      <motion.p
        initial={{ opacity: 0.8 }}
        whileHover={{ opacity: 1 }}
        className="text-xs text-muted-foreground mt-2 text-right font-medium"
        style={{ minHeight: "1.2em" }}
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
            icon={CircleDollarSign}
            colorScheme="purple"
            subtitleContent={overallRequiredSubtitle}
            titleIcon={Sparkles}
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
        />
        <StatCard
          title={`${t("statsCards.donations.title")} (${
            activeDateRangeObject.label ?? ""
          })`}
          value={serverCalculatedDonationsData?.total_donations_amount ?? null}
          isLoading={isLoadingServerDonations}
          error={serverDonationsError}
          icon={HandHelping}
          colorScheme="orange"
          subtitleContent={donationsSubtitle}
        />
      </div>
    </div>
  );
}
