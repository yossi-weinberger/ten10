import React, { useMemo, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDonationStore, selectCalculatedBalance } from "@/lib/store";
import { formatCurrency } from "@/lib/utils/currency";
import { Wallet, HandCoins, CircleDollarSign, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startOfMonth, startOfYear } from "date-fns";
import { Transaction } from "@/types/transaction";
import {
  fetchTotalIncomeInRange,
  ServerIncomeData,
  fetchTotalExpensesInRange,
  fetchTotalDonationsInRange,
  fetchServerTitheBalance,
} from "@/lib/dataService";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatform } from "@/contexts/PlatformContext";

export type DateRangeSelectionType = "month" | "year" | "all";

interface DateRangeObject {
  startDate: string;
  endDate: string;
  label?: string;
}

const calculateClientSideTotalIncome = (
  transactions: Transaction[],
  dateRange: DateRangeObject
): number => {
  console.log(
    "Calculating client-side income for range:",
    dateRange,
    "from transactions:",
    transactions.length
  );
  if (!dateRange.startDate || !dateRange.endDate) return 0;
  return transactions
    .filter(
      (t) =>
        t.type === "income" &&
        t.date >= dateRange.startDate &&
        t.date <= dateRange.endDate
    )
    .reduce((sum, t) => sum + t.amount, 0);
};

const calculateClientSideTotalExpenses = (
  transactions: Transaction[],
  dateRange: DateRangeObject
): number => {
  console.log(
    "Calculating client-side expenses for range:",
    dateRange,
    "from transactions:",
    transactions.length
  );
  if (!dateRange.startDate || !dateRange.endDate) return 0;
  return transactions
    .filter(
      (t) =>
        (t.type === "expense" || t.type === "recognized-expense") &&
        t.date >= dateRange.startDate &&
        t.date <= dateRange.endDate
    )
    .reduce((sum, t) => sum + t.amount, 0);
};

const calculateClientSideTotalDonations = (
  transactions: Transaction[],
  dateRange: DateRangeObject
): number => {
  console.log(
    "Calculating client-side donations for range:",
    dateRange,
    "from transactions:",
    transactions.length
  );
  if (!dateRange.startDate || !dateRange.endDate) return 0;
  return transactions
    .filter(
      (t) =>
        t.type === "donation" &&
        t.date >= dateRange.startDate &&
        t.date <= dateRange.endDate
    )
    .reduce((sum, t) => sum + t.amount, 0);
};

export function StatsCards({
  orientation = "horizontal",
}: {
  orientation?: "horizontal" | "vertical";
}) {
  const transactions = useDonationStore((state) => state.transactions);
  const { user } = useAuth();
  const { platform } = usePlatform();

  const [dateRangeSelection, setDateRangeSelection] =
    React.useState<DateRangeSelectionType>("month");

  const activeDateRangeObject = useMemo((): DateRangeObject => {
    const today = new Date();
    let startDateStr: string;
    let endDateStr: string;
    let label: string = "";

    switch (dateRangeSelection) {
      case "month":
        startDateStr = new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        endDateStr = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          .toISOString()
          .split("T")[0];
        label = "מתחילת החודש";
        break;
      case "year":
        startDateStr = new Date(today.getFullYear(), 0, 1)
          .toISOString()
          .split("T")[0];
        endDateStr = new Date(today.getFullYear(), 11, 31)
          .toISOString()
          .split("T")[0];
        label = "מתחילת השנה";
        break;
      case "all":
        startDateStr = "1970-01-01";
        endDateStr = new Date().toISOString().split("T")[0];
        label = "מאז ומתמיד";
        break;
      default:
        startDateStr = new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        endDateStr = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          .toISOString()
          .split("T")[0];
        label = "מתחילת החודש";
    }
    return { startDate: startDateStr, endDate: endDateStr, label };
  }, [dateRangeSelection]);

  const serverTotalIncome = useDonationStore(
    (state) => state.serverCalculatedTotalIncome
  );
  const setServerTotalIncome = useDonationStore(
    (state) => state.setServerCalculatedTotalIncome
  );
  const serverChomeshAmount = useDonationStore(
    (state) => state.serverCalculatedChomeshAmount
  );
  const setServerChomeshAmount = useDonationStore(
    (state) => state.setServerCalculatedChomeshAmount
  );
  const [isLoadingServerIncome, setIsLoadingServerIncome] = useState(false);
  const [serverIncomeError, setServerIncomeError] = useState<string | null>(
    null
  );

  const serverTotalExpenses = useDonationStore(
    (state) => state.serverCalculatedTotalExpenses
  );
  const setServerTotalExpenses = useDonationStore(
    (state) => state.setServerCalculatedTotalExpenses
  );
  const [isLoadingServerExpenses, setIsLoadingServerExpenses] = useState(false);
  const [serverExpensesError, setServerExpensesError] = useState<string | null>(
    null
  );

  const serverTotalDonations = useDonationStore(
    (state) => state.serverCalculatedTotalDonations
  );
  const setServerTotalDonations = useDonationStore(
    (state) => state.setServerCalculatedTotalDonations
  );
  const [isLoadingServerDonations, setIsLoadingServerDonations] =
    useState(false);
  const [serverDonationsError, setServerDonationsError] = useState<
    string | null
  >(null);

  const serverTitheBalance = useDonationStore(
    (state) => state.serverCalculatedTitheBalance
  );
  const setServerTitheBalance = useDonationStore(
    (state) => state.setServerCalculatedTitheBalance
  );
  const [isLoadingServerTitheBalance, setIsLoadingServerTitheBalance] =
    useState(false);
  const [serverTitheBalanceError, setServerTitheBalanceError] = useState<
    string | null
  >(null);

  const clientTotalIncome = calculateClientSideTotalIncome(
    transactions,
    activeDateRangeObject
  );

  const clientTotalExpenses = calculateClientSideTotalExpenses(
    transactions,
    activeDateRangeObject
  );

  const clientTotalDonations = calculateClientSideTotalDonations(
    transactions,
    activeDateRangeObject
  );

  const clientChomeshAmountInRange = useMemo(() => {
    if (!activeDateRangeObject.startDate || !activeDateRangeObject.endDate)
      return 0;
    return transactions
      .filter(
        (t) =>
          t.type === "income" &&
          t.is_chomesh &&
          t.date >= activeDateRangeObject.startDate &&
          t.date <= activeDateRangeObject.endDate
      )
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, activeDateRangeObject]);

  const clientCalculatedOverallRequired = useDonationStore(
    selectCalculatedBalance
  );

  const donationProgress =
    clientCalculatedOverallRequired > 0
      ? Math.min(
          100,
          (clientTotalDonations / clientCalculatedOverallRequired) * 100
        )
      : clientCalculatedOverallRequired <= 0
      ? 100
      : 0;

  const containerClass =
    orientation === "horizontal"
      ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4"
      : "grid gap-4";

  useEffect(() => {
    const effectiveUserId = platform === "web" ? user?.id || null : null;

    if (activeDateRangeObject.startDate && activeDateRangeObject.endDate) {
      if ((platform === "web" && effectiveUserId) || platform === "desktop") {
        const loadTotalIncome = async () => {
          setIsLoadingServerIncome(true);
          setServerIncomeError(null);
          try {
            console.log(
              `StatsCards: Fetching server income. User: ${effectiveUserId}, Range: ${activeDateRangeObject.startDate}-${activeDateRangeObject.endDate}, Platform: ${platform}`
            );
            const incomeData: ServerIncomeData | null =
              await fetchTotalIncomeInRange(
                effectiveUserId,
                activeDateRangeObject.startDate,
                activeDateRangeObject.endDate
              );
            if (incomeData) {
              setServerTotalIncome(incomeData.total_income);
              setServerChomeshAmount(incomeData.chomesh_amount);
            } else {
              setServerTotalIncome(null);
              setServerChomeshAmount(null);
            }
          } catch (error) {
            console.error(
              "StatsCards: Failed to fetch server total income:",
              error
            );
            setServerIncomeError(
              error instanceof Error ? error.message : String(error)
            );
            setServerTotalIncome(null);
            setServerChomeshAmount(null);
          }
          setIsLoadingServerIncome(false);
        };
        loadTotalIncome();
      } else if (platform === "web" && !effectiveUserId) {
        console.warn(
          "StatsCards: Web platform detected but no user ID available. Skipping server income fetch."
        );
        setServerTotalIncome(null);
        setServerChomeshAmount(null);
        setIsLoadingServerIncome(false);
        setServerIncomeError(null);
      }

      if ((platform === "web" && effectiveUserId) || platform === "desktop") {
        const loadTotalExpenses = async () => {
          setIsLoadingServerExpenses(true);
          setServerExpensesError(null);
          try {
            console.log(
              `StatsCards: Fetching server expenses. User: ${effectiveUserId}, Range: ${activeDateRangeObject.startDate}-${activeDateRangeObject.endDate}, Platform: ${platform}`
            );
            const expensesData: number | null = await fetchTotalExpensesInRange(
              effectiveUserId,
              activeDateRangeObject.startDate,
              activeDateRangeObject.endDate
            );
            setServerTotalExpenses(expensesData);
          } catch (error) {
            console.error(
              "StatsCards: Failed to fetch server total expenses:",
              error
            );
            setServerExpensesError(
              error instanceof Error ? error.message : String(error)
            );
            setServerTotalExpenses(null);
          }
          setIsLoadingServerExpenses(false);
        };
        loadTotalExpenses();
      } else if (platform === "web" && !effectiveUserId) {
        console.warn(
          "StatsCards: Web platform detected but no user ID available. Skipping server expenses fetch."
        );
        setServerTotalExpenses(null);
        setIsLoadingServerExpenses(false);
        setServerExpensesError(null);
      }

      if ((platform === "web" && effectiveUserId) || platform === "desktop") {
        const loadTotalDonations = async () => {
          setIsLoadingServerDonations(true);
          setServerDonationsError(null);
          try {
            console.log(
              `StatsCards: Fetching server donations. User: ${effectiveUserId}, Range: ${activeDateRangeObject.startDate}-${activeDateRangeObject.endDate}, Platform: ${platform}`
            );
            const donationsData: number | null =
              await fetchTotalDonationsInRange(
                effectiveUserId,
                activeDateRangeObject.startDate,
                activeDateRangeObject.endDate
              );
            setServerTotalDonations(donationsData);
          } catch (error) {
            console.error(
              "StatsCards: Failed to fetch server total donations:",
              error
            );
            setServerDonationsError(
              error instanceof Error ? error.message : String(error)
            );
            setServerTotalDonations(null);
          }
          setIsLoadingServerDonations(false);
        };
        loadTotalDonations();
      } else if (platform === "web" && !effectiveUserId) {
        console.warn(
          "StatsCards: Web platform detected but no user ID available. Skipping server donations fetch."
        );
        setServerTotalDonations(null);
        setIsLoadingServerDonations(false);
        setServerDonationsError(null);
      }
    }

    if ((platform === "web" && effectiveUserId) || platform === "desktop") {
      const loadServerTitheBalance = async () => {
        setIsLoadingServerTitheBalance(true);
        setServerTitheBalanceError(null);
        try {
          console.log(
            `StatsCards: Fetching server overall tithe balance. User: ${effectiveUserId}, Platform: ${platform}`
          );
          const balanceData: number | null = await fetchServerTitheBalance(
            effectiveUserId
          );
          setServerTitheBalance(balanceData);
        } catch (error) {
          console.error(
            "StatsCards: Failed to fetch server overall tithe balance:",
            error
          );
          setServerTitheBalanceError(
            error instanceof Error ? error.message : String(error)
          );
          setServerTitheBalance(null);
        }
        setIsLoadingServerTitheBalance(false);
      };
      loadServerTitheBalance();
    } else if (platform === "web" && !effectiveUserId) {
      console.warn(
        "StatsCards: Web platform detected but no user ID available. Skipping server overall tithe balance fetch."
      );
      setServerTitheBalance(null);
      setIsLoadingServerTitheBalance(false);
      setServerTitheBalanceError(null);
    }
  }, [
    user,
    platform,
    activeDateRangeObject,
    setServerTotalIncome,
    setServerChomeshAmount,
    setServerTotalExpenses,
    setServerTotalDonations,
    setServerTitheBalance,
  ]);

  const dateRangeLabels: Record<DateRangeSelectionType, string> = {
    month: "מתחילת החודש",
    year: "מתחילת השנה",
    all: "מאז ומתמיד",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        {(Object.keys(dateRangeLabels) as DateRangeSelectionType[]).map(
          (rangeKey) => (
            <Button
              key={rangeKey}
              variant={dateRangeSelection === rangeKey ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRangeSelection(rangeKey)}
            >
              {dateRangeLabels[rangeKey]}
            </Button>
          )
        )}
      </div>

      <div className={containerClass}>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              סך ההכנסות ({activeDateRangeObject.label})
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
                ? `${formatCurrency(
                    clientChomeshAmountInRange
                  )} מתוכם עם חומש (C)`
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

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {`סך הוצאות (${dateRangeLabels[dateRangeSelection]})`}
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

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              סך התרומות ({activeDateRangeObject.label})
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
                  typeof serverTotalDonations === "number" && (
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
                  serverTotalDonations === null &&
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
              {clientTotalIncome > 0 && typeof clientTotalDonations === "number"
                ? ((clientTotalDonations / clientTotalIncome) * 100).toFixed(
                    1
                  ) + "% מסך ההכנסות (C)"
                : "לא ניתן לחשב אחוז מהכנסות (C)"}
              {typeof serverTotalIncome === "number" &&
                serverTotalIncome > 0 &&
                typeof serverTotalDonations === "number" &&
                serverTotalDonations >= 0 &&
                !isLoadingServerIncome &&
                !isLoadingServerDonations && (
                  <span className="block text-xs text-muted-foreground">
                    {((serverTotalDonations / serverTotalIncome) * 100).toFixed(
                      1
                    ) + "% מסך ההכנסות (S)"}
                  </span>
                )}
            </p>
          </CardContent>
        </Card>

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
                  {formatCurrency(clientCalculatedOverallRequired)}
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
              {clientCalculatedOverallRequired <= 0
                ? `עברת את היעד ב-${formatCurrency(
                    Math.abs(clientCalculatedOverallRequired)
                  )} (יתרה) (C)`
                : `${donationProgress.toFixed(1)}% מהיעד הושלם (C)`}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
