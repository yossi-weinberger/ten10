import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useDonationStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { format, parse, subMonths } from "date-fns";
import { he } from "date-fns/locale";
import {
  fetchServerMonthlyChartData,
  MonthlyDataPoint,
} from "@/lib/chartService";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatform } from "@/contexts/PlatformContext";
import { RotateCcw } from "lucide-react";

const nameMapping: { [key: string]: string } = {
  income: "הכנסות",
  donations: "תרומות",
  expenses: "הוצאות",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700 dir-rtl">
        <p className="font-bold mb-2 text-right">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-end gap-2">
            <span className="text-right">{formatCurrency(entry.value)}</span>
            <span className="font-medium">
              {nameMapping[entry.name] || entry.name}:
            </span>
            <div
              className="w-3 h-3 rounded-full ml-1"
              style={{ backgroundColor: entry.color }}
            />
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const NUM_MONTHS_TO_FETCH = 6;

export function MonthlyChart() {
  const { user } = useAuth();
  const userId = user?.id;
  const { platform } = usePlatform();
  const {
    serverMonthlyChartData,
    currentChartEndDate,
    isLoadingServerMonthlyChartData,
    serverMonthlyChartDataError,
    canLoadMoreChartData,
    setServerMonthlyChartData,
    setCurrentChartEndDate,
    setIsLoadingServerMonthlyChartData,
    setServerMonthlyChartDataError,
    setCanLoadMoreChartData,
  } = useDonationStore((state) => ({
    serverMonthlyChartData: state.serverMonthlyChartData,
    currentChartEndDate: state.currentChartEndDate,
    isLoadingServerMonthlyChartData: state.isLoadingServerMonthlyChartData,
    serverMonthlyChartDataError: state.serverMonthlyChartDataError,
    canLoadMoreChartData: state.canLoadMoreChartData,
    setServerMonthlyChartData: state.setServerMonthlyChartData,
    setCurrentChartEndDate: state.setCurrentChartEndDate,
    setIsLoadingServerMonthlyChartData:
      state.setIsLoadingServerMonthlyChartData,
    setServerMonthlyChartDataError: state.setServerMonthlyChartDataError,
    setCanLoadMoreChartData: state.setCanLoadMoreChartData,
  }));

  const [initialLoadAttempted, setInitialLoadAttempted] = useState(false);

  const loadData = useCallback(
    async (loadMore = false, isReset = false) => {
      if (platform === "loading") {
        console.log(
          "MonthlyChart: loadData called but platform is still loading. Aborting."
        );
        return;
      }
      setIsLoadingServerMonthlyChartData(true);
      setServerMonthlyChartDataError(null);

      if (isReset) {
        setServerMonthlyChartData([], false);
        setCurrentChartEndDate(null);
        setInitialLoadAttempted(false);
        setCanLoadMoreChartData(true);
      } else if (!loadMore) {
        setInitialLoadAttempted(true);
      }

      let endDateForFetch;
      if (loadMore && currentChartEndDate && !isReset) {
        const currentEarliestDate = parse(
          currentChartEndDate,
          "yyyy-MM-dd",
          new Date()
        );
        endDateForFetch = subMonths(currentEarliestDate, 1);
      } else {
        endDateForFetch = new Date();
      }

      console.log(
        "MonthlyChart: Preparing to fetch data. endDateForFetch:",
        endDateForFetch,
        "Type:",
        typeof endDateForFetch,
        "Is Date instance:",
        endDateForFetch instanceof Date,
        "LoadMore:",
        loadMore,
        "IsReset:",
        isReset
      );

      try {
        const data = await fetchServerMonthlyChartData(
          platform,
          userId ?? null,
          endDateForFetch,
          NUM_MONTHS_TO_FETCH
        );
        if (data) {
          if (data.length < NUM_MONTHS_TO_FETCH) {
            setCanLoadMoreChartData(false);
          }
          setServerMonthlyChartData(data, loadMore && !isReset);

          if (data.length > 0) {
            const earliestMonthLabel = data[data.length - 1].month_label;
            const newEarliestDate = parse(
              earliestMonthLabel,
              "yyyy-MM",
              new Date()
            );
            setCurrentChartEndDate(format(newEarliestDate, "yyyy-MM-dd"));
          } else if (loadMore && !isReset) {
            setCanLoadMoreChartData(false);
          }
        } else if (loadMore && !isReset) {
          setCanLoadMoreChartData(false);
        }
      } catch (error: any) {
        setServerMonthlyChartDataError(error.message);
        setCanLoadMoreChartData(false);
      } finally {
        setIsLoadingServerMonthlyChartData(false);
      }
    },
    [
      platform,
      userId,
      setIsLoadingServerMonthlyChartData,
      setServerMonthlyChartDataError,
      setServerMonthlyChartData,
      setCurrentChartEndDate,
      setCanLoadMoreChartData,
      currentChartEndDate,
    ]
  );

  const handleResetChart = () => {
    loadData(false, true);
  };

  useEffect(() => {
    const canFetchData =
      platform === "desktop" || (user?.id && platform === "web");

    if (
      canFetchData &&
      !isLoadingServerMonthlyChartData &&
      initialLoadAttempted === false
    ) {
      console.log(
        "[MonthlyChart] useEffect: Initial data fetch conditions met. Platform:",
        platform,
        "User ID:",
        user?.id
      );
      loadData(false, false);
      setInitialLoadAttempted(true);
    } else {
      // console.log("[MonthlyChart] useEffect: Initial data fetch conditions NOT met. Platform:", platform, "User ID:", user?.id, "isLoading:", isLoadingServerMonthlyChartData, "initialLoadAttempted:", initialLoadAttempted);
    }
  }, [
    user?.id,
    platform,
    isLoadingServerMonthlyChartData,
    loadData,
    initialLoadAttempted,
    currentChartEndDate,
  ]);

  const formattedChartData = React.useMemo(() => {
    return serverMonthlyChartData
      .map((item) => ({
        ...item,
        month: format(
          parse(item.month_label, "yyyy-MM", new Date()),
          "MMM yyyy",
          {
            locale: he,
          }
        ),
      }))
      .sort(
        (a, b) =>
          parse(a.month_label, "yyyy-MM", new Date()).getTime() -
          parse(b.month_label, "yyyy-MM", new Date()).getTime()
      );
  }, [serverMonthlyChartData]);

  if (
    platform === "loading" ||
    (isLoadingServerMonthlyChartData && !initialLoadAttempted)
  ) {
    return (
      <Card dir="rtl" className="bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <CardTitle>סיכום חודשי</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <p>טוען נתונים...</p>
        </CardContent>
      </Card>
    );
  }

  if (serverMonthlyChartDataError && serverMonthlyChartData.length === 0) {
    return (
      <Card dir="rtl" className="bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <CardTitle>סיכום חודשי</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <p className="text-red-500">
            שגיאה בטעינת נתונים: {serverMonthlyChartDataError}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (
    serverMonthlyChartData.length === 0 &&
    initialLoadAttempted &&
    !isLoadingServerMonthlyChartData
  ) {
    return (
      <Card dir="rtl" className="bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <CardTitle>סיכום חודשי</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <p>לא נמצאו נתונים להצגה.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card dir="rtl" className="bg-gradient-to-br from-background to-muted/20">
      <CardHeader>
        <CardTitle>סיכום חודשי</CardTitle>
      </CardHeader>
      <CardContent className="h-[450px]">
        {serverMonthlyChartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={formattedChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  className="text-sm font-medium"
                  tick={{ fill: "currentColor" }}
                />
                <YAxis
                  orientation="right"
                  className="text-sm font-medium"
                  tick={{ fill: "currentColor" }}
                  tickFormatter={(value) => `₪${value.toLocaleString()}`}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "rgba(200, 200, 200, 0.1)" }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: "20px" }}
                  formatter={(value) => (
                    <span className="text-sm font-medium">
                      {nameMapping[value] || value}
                    </span>
                  )}
                />
                <Bar
                  dataKey="income"
                  fill="hsl(142.1 70.6% 45.3%)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  fill="hsl(0 72.2% 50.6%)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="donations"
                  fill="hsl(47.9 95.8% 53.1%)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center items-center gap-4 mt-4">
              {canLoadMoreChartData && (
                <Button
                  onClick={() => loadData(true, false)}
                  disabled={isLoadingServerMonthlyChartData}
                >
                  {isLoadingServerMonthlyChartData &&
                  serverMonthlyChartData.length > 0
                    ? "טוען עוד..."
                    : "טען עוד חודשים"}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleResetChart}
                disabled={isLoadingServerMonthlyChartData}
                title="איפוס תרשים"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="sr-only">איפוס תרשים</span>
              </Button>
            </div>
          </>
        ) : (
          <div className="h-[400px] flex items-center justify-center">
            <p>לא נמצאו נתונים להצגה.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
