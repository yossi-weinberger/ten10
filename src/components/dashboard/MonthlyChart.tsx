import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDonationStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { format, parse, subMonths } from "date-fns";
import { he, enUS } from "date-fns/locale";
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
import { logger } from "@/lib/logger";

const NUM_MONTHS_TO_FETCH = 6;

export function MonthlyChart() {
  const { t, i18n } = useTranslation("dashboard");
  const { user } = useAuth();
  const userId = user?.id;
  const { platform } = usePlatform();
  const dateLocale = i18n.language === "he" ? he : enUS;

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
        logger.log(
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

      logger.log(
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
      logger.log(
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
              locale: dateLocale,
            }
          ),
          income: item.income,
          donations: item.donations,
          expenses: item.expenses,
        }));
    }, [serverMonthlyChartData, i18n.language, dateLocale]);

  if (
    !platformReady ||
    (isLoadingServerMonthlyChartData &&
      !initialLoadAttempted &&
      serverMonthlyChartData.length === 0)
  ) {
    return (
      <Card
        dir={i18n.dir()}
        className="bg-gradient-to-br from-background to-muted/20"
      >
        <CardHeader className="p-4 sm:p-6">
          <CardTitle>{t("monthlyChart.title")}</CardTitle>
        </CardHeader>
        <CardContent className="h-[450px] flex items-center justify-center">
          <p>{t("monthlyChart.loading")}</p>
        </CardContent>
      </Card>
    );
  }

  if (serverMonthlyChartDataError && serverMonthlyChartData.length === 0) {
    return (
      <Card
        dir={i18n.dir()}
        className="bg-gradient-to-br from-background to-muted/20"
      >
        <CardHeader className="p-4 sm:p-6">
          <CardTitle>{t("monthlyChart.title")}</CardTitle>
        </CardHeader>
        <CardContent className="h-[450px] flex items-center justify-center">
          <p className="text-red-500">
            {t("monthlyChart.error")}: {serverMonthlyChartDataError}
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
      <Card
        dir={i18n.dir()}
        className="bg-gradient-to-br from-background to-muted/20"
      >
        <CardHeader className="p-4 sm:p-6">
          <CardTitle>{t("monthlyChart.title")}</CardTitle>
        </CardHeader>
        <CardContent className="h-[450px] flex items-center justify-center">
          <p>{t("monthlyChart.noData")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      dir={i18n.dir()}
      className="bg-gradient-to-br from-background to-muted/20"
    >
      <CardHeader className="p-4 sm:p-6">
        <CardTitle>{t("monthlyChart.title")}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
        {formattedChartDataForAreaChart.length > 0 ? (
          <>
            <AreaChartInteractive
              chartData={formattedChartDataForAreaChart}
              chartConfig={monthlyChartConfig}
              withCard={false}
              className="min-h-[320px] h-[55vh] md:h-[450px] w-full"
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
                    : t("monthlyChart.loadMore")}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleResetChart}
                disabled={isLoadingServerMonthlyChartData}
                title={t("monthlyChart.reset")}
              >
                <RotateCcw className="h-4 w-4" />
                <span className="sr-only">{t("monthlyChart.reset")}</span>
              </Button>
            </div>
          </>
        ) : (
          <div className="h-[400px] flex items-center justify-center">
            <p>{t("monthlyChart.noData")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
