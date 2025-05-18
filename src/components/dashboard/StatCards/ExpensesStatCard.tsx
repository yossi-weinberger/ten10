import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";

interface ExpensesStatCardProps {
  label: string | undefined;
  clientTotalExpenses: number | null;
  serverTotalExpenses: number | null;
  isLoadingServerExpenses: boolean;
  serverExpensesError: string | null;
}

export function ExpensesStatCard({
  label,
  clientTotalExpenses,
  serverTotalExpenses,
  isLoadingServerExpenses,
  serverExpensesError,
}: ExpensesStatCardProps) {
  return (
    <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          {`סך הוצאות (${label})`}
        </CardTitle>
        <CreditCard className="h-5 w-5 text-red-600 dark:text-red-400" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-bold">
              {typeof clientTotalExpenses === "number"
                ? formatCurrency(clientTotalExpenses)
                : "-"}
            </span>
            <span className="text-xs text-muted-foreground ml-1">(C)</span>
          </div>
          <div className="text-right">
            {isLoadingServerExpenses && (
              <p className="text-xs animate-pulse">טוען S...</p>
            )}
            {serverExpensesError && (
              <p className="text-xs text-red-500">שגיאת S</p>
            )}
            {!isLoadingServerExpenses &&
              typeof serverTotalExpenses === "number" && (
                <>
                  <span className="text-lg font-semibold">
                    {formatCurrency(serverTotalExpenses)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    (S)
                  </span>
                </>
              )}
            {!isLoadingServerExpenses &&
              serverTotalExpenses === null &&
              !serverExpensesError && (
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
        <p className="text-xs text-muted-foreground mt-1">מחושב מקומית</p>
      </CardContent>
    </Card>
  );
}
