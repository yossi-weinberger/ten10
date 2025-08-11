import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDonationStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { formatCurrency } from "@/lib/utils";
import { format, parse, subMonths } from "date-fns";
import { he } from "date-fns/locale";
import { fetchServerMonthlyChartData } from "@/lib/data-layer/chart.service";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatform } from "@/contexts/PlatformContext";
import { RotateCcw } from "lucide-react";
import {
  AreaChartInteractive,
  MonthlyChartDataPoint,
} from "@/components/charts/area-chart-interactive";
import { ChartConfig } from "@/components/ui/chart";

const NUM_MONTHS_TO_FETCH = 6;

export function MonthlyChart() {
  const { t, i18n } = useTranslation("dashboard");
  const { user } = useAuth();
  const userId = user?.id;
  const { platform } = usePlatform();

  const monthlyChartConfig: ChartConfig = {
    income: {
      label: t("monthlyChart.income"),
      color: "hsl(var(--chart-green))",
    },
    donations: {
      label: t("monthlyChart.donations"),
      color: "hsl(var(--chart-yellow))",
    },
    expenses: {
      label: t("monthlyChart.expenses"),
      color: "hsl(var(--chart-red))",
    },
  };
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
  } = useDonationStore(
    useShallow((state) => ({
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
    }))
  );

  const [initialLoadAttempted, setInitialLoadAttempted] = useState(false);
  const [platformReady, setPlatformReady] = useState(false);

  useEffect(() => {
    if (platform !== "loading") {
      setPlatformReady(true);
    }
  }, [platform]);

  const loadData = useCallback(
    async (loadMore = false, isReset = false) => {
      if (!platformReady) {
        console.log(
          "MonthlyChart: loadData called but platform is not ready. Aborting."
        );
        return;
      }
      setIsLoadingServerMonthlyChartData(true);
      setServerMonthlyChartDataError(null);

      if (isReset) {
        setCurrentChartEndDate(null);
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
        "LoadMore:",
        loadMore,
        "IsReset:",
        isReset
      );

      try {
        const data = await fetchServerMonthlyChartData(
          userId ?? null,
          endDateForFetch,
          NUM_MONTHS_TO_FETCH
        );
        if (data) {
          if (data.length < NUM_MONTHS_TO_FETCH && (loadMore || !isReset)) {
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
      platformReady,
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
      platformReady &&
      (platform === "desktop" || (user?.id && platform === "web"));

    if (
      canFetchData &&
      !isLoadingServerMonthlyChartData &&
      !initialLoadAttempted
    ) {
      console.log(
        "[MonthlyChart] useEffect [platformReady, user, ...]: Initial data fetch conditions met. Platform:",
        platform,
        "User ID:",
        user?.id
      );
      loadData(false, false);
      setInitialLoadAttempted(true);
    }
  }, [
    platformReady,
    user?.id,
    platform,
    isLoadingServerMonthlyChartData,
    loadData,
    initialLoadAttempted,
  ]);

  const formattedChartDataForAreaChart: MonthlyChartDataPoint[] =
    React.useMemo(() => {
      if (!serverMonthlyChartData) return [];

      return serverMonthlyChartData
        .slice()
        .sort((itemA, itemB) => {
          const dateA = parse(
            itemA.month_label,
            "yyyy-MM",
            new Date()
          ).getTime();
          const dateB = parse(
            itemB.month_label,
            "yyyy-MM",
            new Date()
          ).getTime();
          return dateA - dateB;
        })
        .map((item) => ({
          month: format(
            parse(item.month_label, "yyyy-MM", new Date()),
            "MMM yyyy",
            {
              locale: he,
            }
          ),
          income: item.income,
          donations: item.donations,
          expenses: item.expenses,
        }));
    }, [serverMonthlyChartData]);

  if (
    !platformReady ||
    (isLoadingServerMonthlyChartData &&
      !initialLoadAttempted &&
      serverMonthlyChartData.length === 0)
  ) {
    return (
      <Card dir="rtl" className="bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <CardTitle>סיכום חודשי</CardTitle>
        </CardHeader>
        <CardContent className="h-[450px] flex items-center justify-center">
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
        <CardContent className="h-[450px] flex items-center justify-center">
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
        <CardContent className="h-[450px] flex items-center justify-center">
          <p>לא נמצאו נתונים להצגה.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card dir="rtl" className="bg-gradient-to-br from-background to-muted/20">
      <CardHeader>
        <CardTitle>{t("monthlyChart.title")}</CardTitle>
      </CardHeader>
      <CardContent className="">
        {formattedChartDataForAreaChart.length > 0 ? (
          <>
            <AreaChartInteractive
              chartData={formattedChartDataForAreaChart}
              chartConfig={monthlyChartConfig}
            />
            <div className="flex justify-center items-center gap-4 mt-4">
              {canLoadMoreChartData && (
                <Button
                  onClick={() => loadData(true, false)}
                  disabled={isLoadingServerMonthlyChartData}
                >
                  {isLoadingServerMonthlyChartData &&
                  serverMonthlyChartData.length > 0
                    ? t("monthlyChart.loading")
                    : t("monthlyChart.loadMore", "טען עוד חודשים")}
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
