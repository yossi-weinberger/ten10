import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDonationStore, selectCalculatedBalance } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { Wallet, HandCoins, CircleDollarSign, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startOfMonth, startOfYear } from "date-fns";
import { Transaction } from "@/types/transaction";

type DateRange = "month" | "year" | "all";

export function StatsCards({
  orientation = "horizontal",
}: {
  orientation?: "horizontal" | "vertical";
}) {
  const transactions = useDonationStore((state) => state.transactions);
  const calculatedBalance = useDonationStore(selectCalculatedBalance);

  const [dateRange, setDateRange] = React.useState<DateRange>("month");

  const getStartDate = (range: DateRange): Date => {
    switch (range) {
      case "month":
        return startOfMonth(new Date());
      case "year":
        return startOfYear(new Date());
      case "all":
        return new Date(0); // תחילת הזמן
      default:
        return startOfMonth(new Date());
    }
  };

  const filterByDateRange = (items: Transaction[]): Transaction[] => {
    const startDate = getStartDate(dateRange);
    return items.filter((item) => new Date(item.date) >= startDate);
  };

  const filteredTransactions = filterByDateRange(transactions);

  const totalIncomes = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate SUM of amounts for incomes with Chomesh
  const chomeshIncomesAmount = filteredTransactions
    .filter((t) => t.type === "income" && t.isChomesh)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDonations = filteredTransactions
    .filter((t) => t.type === "donation")
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate total expenses
  const totalExpenses = filteredTransactions
    .filter((t) => t.type === "expense") // Filter for 'expense' type
    .reduce((sum, t) => sum + t.amount, 0);

  const potentialTotalRequired =
    totalDonations + Math.max(0, calculatedBalance);
  const donationProgress =
    potentialTotalRequired > 0
      ? Math.min(100, (totalDonations / potentialTotalRequired) * 100)
      : calculatedBalance <= 0
      ? 100
      : 0;

  const containerClass =
    orientation === "horizontal"
      ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4"
      : "grid gap-4";

  const dateRangeLabels = {
    month: "מתחילת החודש",
    year: "מתחילת השנה",
    all: "מאז ומתמיד",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button
          variant={dateRange === "month" ? "default" : "outline"}
          size="sm"
          onClick={() => setDateRange("month")}
        >
          {dateRangeLabels.month}
        </Button>
        <Button
          variant={dateRange === "year" ? "default" : "outline"}
          size="sm"
          onClick={() => setDateRange("year")}
        >
          {dateRangeLabels.year}
        </Button>
        <Button
          variant={dateRange === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setDateRange("all")}
        >
          {dateRangeLabels.all}
        </Button>
      </div>

      <div className={containerClass}>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">סך ההכנסות</CardTitle>
            <Wallet className="h-5 w-5 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalIncomes)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {chomeshIncomesAmount > 0
                ? `${formatCurrency(chomeshIncomesAmount)} מתוכם עם חומש`
                : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">סך ההוצאות</CardTitle>
            <CreditCard className="h-5 w-5 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalExpenses)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">סך התרומות</CardTitle>
            <HandCoins className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalDonations)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalIncomes > 0
                ? ((totalDonations / totalIncomes) * 100).toFixed(1) +
                  "% מסך ההכנסות"
                : "N/A"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">נדרש לתרומה</CardTitle>
            <CircleDollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(calculatedBalance)}
            </div>
            <Progress value={donationProgress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {calculatedBalance <= 0
                ? `עברת את היעד ב-${formatCurrency(
                    Math.abs(calculatedBalance)
                  )} (יתרה)`
                : `${donationProgress.toFixed(1)}% מהיעד הושלם`}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
