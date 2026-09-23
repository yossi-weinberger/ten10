import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDonationStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
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
import { buildPeriodBoundaries } from "@/lib/calendar/calendar-period";
import { formatLocalDate } from "@/lib/utils/local-date";
import {
  formatMonthlyChartData,
  getPreviousChartAnchor,
  shouldLoadInitialChart,
} from "./monthly-chart.utils";

const NUM_MONTHS_TO_FETCH = 6;

export function MonthlyChart() {
  const { t, i18n } = useTranslation("dashboard");
  const { user } = useAuth();
  const userId = user?.id;
  const { platform } = usePlatform();
  const language = i18n.language;

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
    calendarType,
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
      calendarType: state.settings.calendarType,
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

      let anchorDate: string;
      if (loadMore && currentChartEndDate && !isReset) {
        anchorDate = getPreviousChartAnchor(
          currentChartEndDate,
          calendarType,
        );
      } else {
        anchorDate = formatLocalDate(new Date());
      }
      const boundaries = buildPeriodBoundaries(
        anchorDate,
        NUM_MONTHS_TO_FETCH,
        calendarType,
      );

      logger.log(
        "MonthlyChart: Preparing to fetch data. boundaries:",
        boundaries,
        "LoadMore:",
        loadMore,
        "IsReset:",
        isReset
      );

      try {
        const data = await fetchServerMonthlyChartData(
          userId ?? null,
          boundaries,
          calendarType,
        );
        if (data) {
          if (data.length < NUM_MONTHS_TO_FETCH && (loadMore || !isReset)) {
            setCanLoadMoreChartData(false);
          }
          setServerMonthlyChartData(data, loadMore && !isReset);

          if (data.length > 0) {
            setCurrentChartEndDate(data[0].period_start);
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
      calendarType,
    ]
  );

  const handleResetChart = () => {
    loadData(false, true);
  };

  useEffect(() => {
    if (
      shouldLoadInitialChart({
        platformReady,
        platform,
        userId: user?.id,
        isLoading: isLoadingServerMonthlyChartData,
        hasError: serverMonthlyChartDataError !== null,
        initialLoadAttempted,
        dataLength: serverMonthlyChartData.length,
      })
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
    serverMonthlyChartData.length,
    serverMonthlyChartDataError,
  ]);

  const formattedChartDataForAreaChart: MonthlyChartDataPoint[] =
    React.useMemo(() => {
      return formatMonthlyChartData(
        serverMonthlyChartData,
        calendarType,
        language,
      );
    }, [serverMonthlyChartData, calendarType, language]);

  // Consistent container height to prevent CLS
  const chartContainerHeight = "min-h-[400px] md:min-h-[500px]";

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
        <CardContent
          className={`${chartContainerHeight} flex items-center justify-center`}
        >
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
        <CardContent
          className={`${chartContainerHeight} flex items-center justify-center`}
        >
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
        <CardContent
          className={`${chartContainerHeight} flex items-center justify-center`}
        >
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
          <div className={chartContainerHeight}>
            <AreaChartInteractive
              chartData={formattedChartDataForAreaChart}
              chartConfig={monthlyChartConfig}
              withCard={false}
              className="min-h-[320px] h-[55vh] w-full"
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
          </div>
        ) : (
          <div
            className={`${chartContainerHeight} flex items-center justify-center`}
          >
            <p>{t("monthlyChart.noData")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
