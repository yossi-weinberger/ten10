import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CircleDollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import CountUp from "react-countup";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";

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
  const {
    displayValue: titheBalanceDisplayValue,
    startAnimateValue: titheBalanceStartAnimateValue,
  } = useAnimatedCounter({
    serverValue: serverTitheBalance,
    isLoading: isLoadingServerTitheBalance,
  });

  const displayBalanceForText = titheBalanceDisplayValue;

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          נדרש לתרומה (כללי)
        </CardTitle>
        <CircleDollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
      </CardHeader>
      <CardContent>
        <div className="text-right" style={{ minHeight: "calc(1.5rem * 1.5)" }}>
          {serverTitheBalanceError ? (
            <p className="text-xs text-red-500">שגיאה בטעינה</p>
          ) : (
            <span className="text-2xl font-bold">
              <CountUp
                start={titheBalanceStartAnimateValue}
                end={titheBalanceDisplayValue}
                duration={0.75}
                decimals={2}
                formattingFn={formatCurrency}
              />
            </span>
          )}
        </div>
        <Progress value={donationProgress} className="mt-2" />
        <p
          className="text-xs text-muted-foreground mt-2 text-right"
          style={{ minHeight: "1.2em" }}
        >
          {displayBalanceForText <= 0
            ? `עברת את היעד ב-${formatCurrency(
                Math.abs(displayBalanceForText)
              )} (יתרה)`
            : `${donationProgress.toFixed(1)}% מהיעד הושלם`}
        </p>
      </CardContent>
    </Card>
  );
}
