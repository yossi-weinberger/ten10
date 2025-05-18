import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { User } from "@/contexts/AuthContext"; // For the user prop, if needed for specific display logic

interface IncomeStatCardProps {
  label: string | undefined;
  clientTotalIncome: number | null;
  serverTotalIncome: number | null;
  isLoadingServerIncome: boolean;
  serverIncomeError: string | null;
  clientChomeshAmountInRange: number;
  serverChomeshAmount: number | null;
  platform: string | undefined;
  user: User | null; // To decide whether to show 'Connect (S)' message
}

export function IncomeStatCard({
  label,
  clientTotalIncome,
  serverTotalIncome,
  isLoadingServerIncome,
  serverIncomeError,
  clientChomeshAmountInRange,
  serverChomeshAmount,
  platform,
  user,
}: IncomeStatCardProps) {
  return (
    <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          סך ההכנסות ({label})
        </CardTitle>
        <Wallet className="h-5 w-5 text-green-600 dark:text-green-400" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-bold">
              {typeof clientTotalIncome === "number"
                ? formatCurrency(clientTotalIncome)
                : "-"}
            </span>
            <span className="text-xs text-muted-foreground ml-1">(C)</span>
          </div>
          <div className="text-right">
            {isLoadingServerIncome && (
              <p className="text-xs animate-pulse">טוען S...</p>
            )}
            {serverIncomeError && (
              <p className="text-xs text-red-500">שגיאת S</p>
            )}
            {!isLoadingServerIncome &&
              typeof serverTotalIncome === "number" && (
                <>
                  <span className="text-lg font-semibold">
                    {formatCurrency(serverTotalIncome)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    (S)
                  </span>
                </>
              )}
            {!isLoadingServerIncome &&
              serverTotalIncome === null &&
              !serverIncomeError &&
              platform === "web" &&
              !user && <p className="text-xs text-orange-500">התחבר (S)</p>}
            {!isLoadingServerIncome &&
              serverTotalIncome === null &&
              !serverIncomeError &&
              !(platform === "web" && !user) && (
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
          {clientChomeshAmountInRange > 0
            ? `${formatCurrency(clientChomeshAmountInRange)} מתוכם עם חומש (C)`
            : ""}
          {typeof serverChomeshAmount === "number" &&
            serverChomeshAmount > 0 &&
            !isLoadingServerIncome &&
            !serverIncomeError && (
              <span className="block text-xs text-muted-foreground">
                {formatCurrency(serverChomeshAmount)} מתוכם עם חומש (S)
              </span>
            )}
        </p>
      </CardContent>
    </Card>
  );
}
