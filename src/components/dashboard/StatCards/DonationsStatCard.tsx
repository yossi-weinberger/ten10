import React from "react";
import { useTranslation } from "react-i18next";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HandHelping } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import CountUp from "react-countup";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { ServerDonationData } from "@/lib/data-layer";
import { Progress } from "@/components/ui/progress";
import { MagicStatCard } from "./MagicStatCard";

interface DonationsStatCardProps {
  label: string;
  serverTotalDonationsData: ServerDonationData | null;
  isLoadingServerDonations: boolean;
  serverDonationsError: string | null;
  serverTotalIncome: number | null;
  isLoadingServerIncome: boolean;
}

export function DonationsStatCard({
  label,
  serverTotalDonationsData,
  isLoadingServerDonations,
  serverDonationsError,
  serverTotalIncome,
}: DonationsStatCardProps) {
  const { t } = useTranslation("dashboard");
  const serverTotalDonationsAmount =
    serverTotalDonationsData?.total_donations_amount;

  const {
    displayValue: totalDonationsDisplayValue,
    startAnimateValue: totalDonationsStartAnimateValue,
  } = useAnimatedCounter({
    serverValue: serverTotalDonationsAmount,
    isLoading: isLoadingServerDonations,
  });

  const percentageOfIncome =
    serverTotalIncome && serverTotalDonationsAmount
      ? (serverTotalDonationsAmount / serverTotalIncome) * 100
      : 0;

  return (
    <MagicStatCard
      className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 hover:shadow-yellow-200/50 dark:hover:shadow-yellow-900/50"
      gradientColor="rgba(234, 179, 8, 0.3)"
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          {t("statsCards.donations.title")} ({label})
        </CardTitle>
        <HandHelping className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
      </CardHeader>
      <CardContent>
        <div className="text-right" style={{ minHeight: "calc(1.5rem * 1.5)" }}>
          {serverDonationsError ? (
            <p className="text-xs text-red-500">{t("monthlyChart.error")}</p>
          ) : (
            <span className="text-3xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent dark:from-yellow-400 dark:to-orange-400">
              <CountUp
                start={totalDonationsStartAnimateValue}
                end={totalDonationsDisplayValue}
                duration={0.75}
                decimals={2}
                formattingFn={formatCurrency}
              />
            </span>
          )}
        </div>
        <Progress value={percentageOfIncome} className="mt-2" />
        <p
          className="text-xs text-muted-foreground mt-2 text-right"
          style={{ minHeight: "1.2em" }}
        >
          {t("statsCards.donations.percentageOfIncome", {
            percentage: percentageOfIncome.toFixed(1),
          })}
        </p>
      </CardContent>
    </MagicStatCard>
  );
}
