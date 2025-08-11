"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CircleDollarSign, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import CountUp from "react-countup";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { motion } from "framer-motion";
import { MagicStatCard } from "./MagicStatCard";

interface OverallRequiredStatCardProps {
  serverTitheBalance: number | null;
  isLoadingServerTitheBalance: boolean;
  serverTitheBalanceError: string | null;
  donationProgress: number;
}

export function OverallRequiredStatCard({
  serverTitheBalance,
  isLoadingServerTitheBalance,
  serverTitheBalanceError,
  donationProgress,
}: OverallRequiredStatCardProps) {
  const { t } = useTranslation("dashboard");
  const {
    displayValue: titheBalanceDisplayValue,
    startAnimateValue: titheBalanceStartAnimateValue,
  } = useAnimatedCounter({
    serverValue: serverTitheBalance,
    isLoading: isLoadingServerTitheBalance,
  });

  const displayBalanceForText = titheBalanceDisplayValue;

  return (
    <MagicStatCard
      className="border-2 border-purple-300 dark:border-purple-700 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 hover:shadow-purple-200/50 dark:hover:shadow-purple-900/50"
      gradientColor="rgba(168, 85, 247, 0.3)"
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-purple-500 dark:text-purple-400" />
          {t("statsCards.overallRequired.title")}
        </CardTitle>
        <CircleDollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
      </CardHeader>
      <CardContent>
        <motion.div
          className="text-right"
          style={{ minHeight: "calc(1.5rem * 1.5)" }}
          initial={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          {serverTitheBalanceError ? (
            <p className="text-xs text-red-500">{t("monthlyChart.error")}</p>
          ) : (
            <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-indigo-400">
              <CountUp
                start={titheBalanceStartAnimateValue}
                end={titheBalanceDisplayValue}
                duration={0.75}
                decimals={2}
                formattingFn={formatCurrency}
              />
            </span>
          )}
        </motion.div>
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
                amount: formatCurrency(Math.abs(displayBalanceForText)),
              })
            : t("statsCards.overallRequired.goalProgress", {
                percentage: donationProgress.toFixed(1),
              })}
        </motion.p>
      </CardContent>
    </MagicStatCard>
  );
}
