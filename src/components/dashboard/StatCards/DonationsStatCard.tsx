import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HandCoins } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { ServerDonationData } from "@/lib/dbStatsCardsService";

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

  return (
    <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          סך התרומות ({label})
        </CardTitle>
        <HandCoins className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-left">
            {isLoadingServerDonations && (
              <p className="text-xs animate-pulse">טוען...</p>
            )}
            {serverDonationsError && (
              <p className="text-xs text-red-500">שגיאה</p>
            )}
            {!isLoadingServerDonations &&
              typeof serverTotalDonationsAmount === "number" && (
                <>
                  <span className="text-2xl font-bold">
                    {formatCurrency(serverTotalDonationsAmount)}
                  </span>
                </>
              )}
            {!isLoadingServerDonations &&
              serverTotalDonationsAmount === undefined &&
              !serverDonationsError && (
                <>
                  <span className="text-2xl font-bold">
                    {formatCurrency(0)}
                  </span>
                </>
              )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {typeof serverTotalIncome === "number" &&
            serverTotalIncome > 0 &&
            typeof serverTotalDonationsAmount === "number" &&
            serverTotalDonationsAmount >= 0 &&
            !isLoadingServerIncome &&
            !isLoadingServerDonations && (
              <span className="block text-xs text-muted-foreground">
                {(
                  (serverTotalDonationsAmount / serverTotalIncome) *
                  100
                ).toFixed(1) + "% מסך ההכנסות"}
              </span>
            )}
        </p>

        {!isLoadingServerDonations &&
          typeof serverNonTitheDonationsAmount === "number" &&
          serverNonTitheDonationsAmount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              מתוכן {formatCurrency(serverNonTitheDonationsAmount)} תרומה אישית
            </p>
          )}
      </CardContent>
    </Card>
  );
}
