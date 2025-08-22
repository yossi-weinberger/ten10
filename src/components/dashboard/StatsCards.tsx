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
  const donations = Math.max(
    0,
    serverCalculatedDonationsData?.total_donations_amount ?? 0
  );
  const balance = serverTitheBalance ?? 0;

  let donationProgress: number;
  if (balance <= 0) {
    // goal reached or exceeded
    donationProgress = 100;
  } else {
    const denom = donations + Math.max(0, balance);
    donationProgress = denom === 0 ? 0 : (donations / denom) * 100;
  }

  // clamp to [0..100]
  donationProgress = Math.min(100, Math.max(0, donationProgress));

  const displayBalanceForText = serverTitheBalance ?? 0;
  const overallRequiredSubtitle = (
    <>
      <div className="mt-4 relative">
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
            icon={Scale}
            colorScheme="blue"
            subtitleContent={overallRequiredSubtitle}
            isSpecial={true}
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
          colorScheme="yellow"
          subtitleContent={donationsSubtitle}
        />
      </div>
    </div>
  );
}
