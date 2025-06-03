import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { User } from "@/contexts/AuthContext";

interface IncomeStatCardProps {
  label: string | undefined;
  serverTotalIncome: number | null;
  isLoadingServerIncome: boolean;
  serverIncomeError: string | null;
  serverChomeshAmount: number | null;
  platform: string | undefined;
  user: User | null;
}

export function IncomeStatCard({
  label,
  serverTotalIncome,
  isLoadingServerIncome,
  serverIncomeError,
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
          <div className="text-left">
            {isLoadingServerIncome && (
              <p className="text-xs animate-pulse">טוען...</p>
            )}
            {serverIncomeError && <p className="text-xs text-red-500">שגיאה</p>}
            {!isLoadingServerIncome &&
              typeof serverTotalIncome === "number" && (
                <>
                  <span className="text-2xl font-bold">
                    {formatCurrency(serverTotalIncome)}
                  </span>
                </>
              )}
            {!isLoadingServerIncome &&
              serverTotalIncome === null &&
              !serverIncomeError &&
              platform === "web" &&
              !user && <p className="text-xs text-orange-500">התחבר</p>}
            {!isLoadingServerIncome &&
              serverTotalIncome === null &&
              !serverIncomeError &&
              !(platform === "web" && !user) && (
                <>
                  <span className="text-2xl font-bold">
                    {formatCurrency(0)}
                  </span>
                </>
              )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {typeof serverChomeshAmount === "number" &&
            serverChomeshAmount > 0 &&
            !isLoadingServerIncome &&
            !serverIncomeError && (
              <span className="block text-xs text-muted-foreground">
                {formatCurrency(serverChomeshAmount)} מתוכם עם חומש
              </span>
            )}
        </p>
      </CardContent>
    </Card>
  );
}
