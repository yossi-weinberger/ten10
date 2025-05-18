import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CircleDollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";

interface OverallRequiredStatCardProps {
  clientCalculatedOverallRequired: number | null;
  serverTitheBalance: number | null;
  isLoadingServerTitheBalance: boolean;
  serverTitheBalanceError: string | null;
  donationProgress: number;
}

export function OverallRequiredStatCard({
  clientCalculatedOverallRequired,
  serverTitheBalance,
  isLoadingServerTitheBalance,
  serverTitheBalanceError,
  donationProgress,
}: OverallRequiredStatCardProps) {
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
          <div>
            <span className="text-2xl font-bold">
              {formatCurrency(clientCalculatedOverallRequired ?? 0)}
            </span>
            <span className="text-xs text-muted-foreground ml-1">(C)</span>
          </div>
          <div className="text-right">
            {isLoadingServerTitheBalance && (
              <p className="text-xs animate-pulse">טוען S...</p>
            )}
            {serverTitheBalanceError && (
              <p className="text-xs text-red-500">שגיאת S</p>
            )}
            {!isLoadingServerTitheBalance &&
              typeof serverTitheBalance === "number" && (
                <>
                  <span className="text-lg font-semibold">
                    {formatCurrency(serverTitheBalance)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    (S)
                  </span>
                </>
              )}
            {!isLoadingServerTitheBalance &&
              serverTitheBalance === null &&
              !serverTitheBalanceError && (
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
        <Progress value={donationProgress} className="mt-2" />
        <p className="text-xs text-muted-foreground mt-2">
          {(clientCalculatedOverallRequired ?? 0) <= 0
            ? `עברת את היעד ב-${formatCurrency(
                Math.abs(clientCalculatedOverallRequired ?? 0)
              )} (יתרה) (C)`
            : `${donationProgress.toFixed(1)}% מהיעד הושלם (C)`}
        </p>
      </CardContent>
    </Card>
  );
}
