import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HandCoins } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { ServerDonationData } from "@/lib/dbStatsCardsService"; // Assuming ServerDonationData is exported there or define locally

interface DonationsStatCardProps {
  label: string | undefined;
  clientTotalDonations: number | null;
  serverTotalDonationsData: ServerDonationData | null; // Changed prop name and type
  isLoadingServerDonations: boolean;
  serverDonationsError: string | null;
  clientTotalIncome: number | null; // Needed for percentage calculation
  serverTotalIncome: number | null; // Needed for percentage calculation
  isLoadingServerIncome: boolean; // To avoid showing stale percentage
}

export function DonationsStatCard({
  label,
  clientTotalDonations,
  serverTotalDonationsData, // Changed prop name
  isLoadingServerDonations,
  serverDonationsError,
  clientTotalIncome,
  serverTotalIncome,
  isLoadingServerIncome,
}: DonationsStatCardProps) {
  const serverTotalDonations = serverTotalDonationsData?.total_donations_amount;
  const serverNonTitheDonations =
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
          <div>
            <span className="text-2xl font-bold">
              {typeof clientTotalDonations === "number"
                ? formatCurrency(clientTotalDonations)
                : "-"}
            </span>
            <span className="text-xs text-muted-foreground ml-1">(C)</span>
          </div>
          <div className="text-right">
            {isLoadingServerDonations && (
              <p className="text-xs animate-pulse">טוען S...</p>
            )}
            {serverDonationsError && (
              <p className="text-xs text-red-500">שגיאת S</p>
            )}
            {!isLoadingServerDonations &&
              typeof serverTotalDonations === "number" && ( // Use the extracted variable
                <>
                  <span className="text-lg font-semibold">
                    {formatCurrency(serverTotalDonations)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    (S)
                  </span>
                </>
              )}
            {!isLoadingServerDonations &&
              serverTotalDonations === null && // Check the extracted variable
              !serverDonationsError && (
                <>
                  <span className="text-lg font-semibold">
                    {formatCurrency(0)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    (S)
                  </span>
                </>
              )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {typeof clientTotalIncome === "number" &&
          clientTotalIncome > 0 &&
          typeof clientTotalDonations === "number"
            ? ((clientTotalDonations / clientTotalIncome) * 100).toFixed(1) +
              "% מסך ההכנסות (C)"
            : "לא ניתן לחשב אחוז מהכנסות (C)"}
          {typeof serverTotalIncome === "number" &&
            serverTotalIncome > 0 &&
            typeof serverTotalDonations === "number" && // Use extracted variable
            serverTotalDonations >= 0 &&
            !isLoadingServerIncome && // Ensure income is loaded before calculating server percentage
            !isLoadingServerDonations && (
              <span className="block text-xs text-muted-foreground">
                {((serverTotalDonations / serverTotalIncome) * 100).toFixed(1) +
                  "% מסך ההכנסות (S)"}
              </span>
            )}
        </p>
        {/* Display non_tithe_donation_amount from server */}
        {!isLoadingServerDonations &&
          typeof serverNonTitheDonations === "number" &&
          serverNonTitheDonations > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              מתוכן {formatCurrency(serverNonTitheDonations)} תרומה אישית (S)
            </p>
          )}
      </CardContent>
    </Card>
  );
}
