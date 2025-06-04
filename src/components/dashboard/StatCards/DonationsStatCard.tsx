import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HandCoins } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { ServerDonationData } from "@/lib/dbStatsCardsService";
import CountUp from "react-countup";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";

interface DonationsStatCardProps {
  label: string | undefined;
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
  isLoadingServerIncome,
}: DonationsStatCardProps) {
  const serverTotalDonationsAmount =
    serverTotalDonationsData?.total_donations_amount;
  const serverNonTitheDonationsAmount =
    serverTotalDonationsData?.non_tithe_donation_amount;

  const {
    displayValue: totalDonationsDisplayValue,
    startAnimateValue: totalDonationsStartAnimateValue,
  } = useAnimatedCounter({
    serverValue: serverTotalDonationsAmount,
    isLoading: isLoadingServerDonations,
  });

  return (
    <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          סך התרומות ({label})
        </CardTitle>
        <HandCoins className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
      </CardHeader>
      <CardContent>
        <div className="text-right" style={{ minHeight: "calc(1.5rem * 1.5)" }}>
          {serverDonationsError ? (
            <p className="text-xs text-red-500">שגיאה</p>
          ) : (
            <span className="text-2xl font-bold">
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
        <p
          className="text-xs text-muted-foreground mt-1 text-right"
          style={{ minHeight: "1.2em" }}
        >
          {!isLoadingServerIncome &&
            !isLoadingServerDonations &&
            typeof serverTotalIncome === "number" &&
            serverTotalIncome > 0 &&
            typeof serverTotalDonationsAmount === "number" &&
            serverTotalDonationsAmount >= 0 && (
              <span className="block text-xs text-muted-foreground">
                {(
                  (serverTotalDonationsAmount / serverTotalIncome) *
                  100
                ).toFixed(1) + "% מסך ההכנסות"}
              </span>
            )}
        </p>

        {!isLoadingServerDonations &&
          !serverDonationsError &&
          typeof serverNonTitheDonationsAmount === "number" &&
          serverNonTitheDonationsAmount > 0 && (
            <p
              className="text-xs text-muted-foreground mt-1 text-right"
              style={{ minHeight: "1.2em" }}
            >
              מתוכן {formatCurrency(serverNonTitheDonationsAmount)} תרומה אישית
            </p>
          )}
      </CardContent>
    </Card>
  );
}
