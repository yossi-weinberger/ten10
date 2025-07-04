import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import CountUp from "react-countup";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { MagicStatCard } from "./MagicStatCard";

interface ExpensesStatCardProps {
  label: string | undefined;
  serverTotalExpenses: number | null;
  isLoadingServerExpenses: boolean;
  serverExpensesError: string | null;
}

export function ExpensesStatCard({
  label,
  serverTotalExpenses,
  isLoadingServerExpenses,
  serverExpensesError,
}: ExpensesStatCardProps) {
  const {
    displayValue: totalExpensesDisplayValue,
    startAnimateValue: totalExpensesStartAnimateValue,
  } = useAnimatedCounter({
    serverValue: serverTotalExpenses,
    isLoading: isLoadingServerExpenses,
  });

  return (
    <MagicStatCard
      className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 hover:shadow-red-200/50 dark:hover:shadow-red-900/50"
      gradientColor="rgba(239, 68, 68, 0.3)"
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          {`סך הוצאות (${label})`}
        </CardTitle>
        <CreditCard className="h-5 w-5 text-red-600 dark:text-red-400" />
      </CardHeader>
      <CardContent>
        <div className="text-right" style={{ minHeight: "calc(1.5rem * 1.5)" }}>
          {serverExpensesError ? (
            <p className="text-xs text-red-500">שגיאה בטעינה</p>
          ) : (
            <span className="text-3xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent dark:from-red-400 dark:to-rose-400">
              <CountUp
                start={totalExpensesStartAnimateValue}
                end={totalExpensesDisplayValue}
                duration={0.75}
                decimals={2}
                formattingFn={formatCurrency}
              />
            </span>
          )}
        </div>
      </CardContent>
    </MagicStatCard>
  );
}
