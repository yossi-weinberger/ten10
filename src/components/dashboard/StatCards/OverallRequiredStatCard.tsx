import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CircleDollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";

interface OverallRequiredStatCardProps {
  // clientCalculatedOverallRequired: number | null; // REMOVE THIS LINE
  serverTitheBalance: number | null;
  isLoadingServerTitheBalance: boolean;
  serverTitheBalanceError: string | null;
  donationProgress: number; // This will need to be recalculated based on serverTitheBalance in the parent component
}

export function OverallRequiredStatCard({
  // clientCalculatedOverallRequired, // REMOVE THIS LINE
  serverTitheBalance,
  isLoadingServerTitheBalance,
  serverTitheBalanceError,
  donationProgress,
}: OverallRequiredStatCardProps) {
  const displayBalance = serverTitheBalance ?? 0;

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          נדרש לתרומה (כללי)
        </CardTitle>
        <CircleDollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          {/* REMOVE Client-side display block
          <div>
            <span className="text-2xl font-bold">
              {formatCurrency(clientCalculatedOverallRequired ?? 0)}
            </span>
            <span className="text-xs text-muted-foreground ml-1">(C)</span>
          </div>
          */}
          <div className="text-left">
            {isLoadingServerTitheBalance && (
              <p className="text-xs animate-pulse">טוען...</p>
            )}
            {serverTitheBalanceError && (
              <p className="text-xs text-red-500">שגיאה בטעינה</p>
            )}
            {!isLoadingServerTitheBalance &&
              typeof serverTitheBalance === "number" && (
                <>
                  <span className="text-2xl font-bold">
                    {formatCurrency(serverTitheBalance)}
                  </span>
                  {/* Optional: Keep a small (S) indicator for a while if needed for clarity, then remove
                  <span className="text-xs text-muted-foreground ml-1">
                    (S)
                  </span>
                  */}
                </>
              )}
            {!isLoadingServerTitheBalance &&
              serverTitheBalance === null &&
              !serverTitheBalanceError && (
                <>
                  <span className="text-2xl font-bold">
                    {formatCurrency(0)}
                  </span>
                  {/* Optional: Keep a small (S) indicator for a while if needed for clarity, then remove
                  <span className="text-xs text-muted-foreground ml-1">
                    (S)
                  </span>
                  */}
                </>
              )}
          </div>
        </div>
        <Progress value={donationProgress} className="mt-2" />
        <p className="text-xs text-muted-foreground mt-2">
          {displayBalance <= 0
            ? `עברת את היעד ב-${formatCurrency(
                Math.abs(displayBalance)
              )} (יתרה)`
            : `${donationProgress.toFixed(1)}% מהיעד הושלם`}
        </p>
      </CardContent>
    </Card>
  );
}
