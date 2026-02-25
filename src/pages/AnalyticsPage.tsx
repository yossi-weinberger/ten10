import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatform } from "@/contexts/PlatformContext";
import {
  useDateControls,
  DateRangeSelectionType,
} from "@/hooks/useDateControls";
import { useServerStats } from "@/hooks/useServerStats";
import { fetchServerMonthlyChartData } from "@/lib/data-layer/chart.service";
import type { MonthlyDataPoint } from "@/lib/data-layer/chart.service";
import { fetchPreviousPeriodData } from "@/lib/data-layer";
import type { PreviousPeriodData } from "@/lib/data-layer";
import { FinancialHealthScore } from "@/components/analytics/FinancialHealthScore";
import { SmartInsights } from "@/components/analytics/SmartInsights";
import { TopDrivers } from "@/components/analytics/TopDrivers";
import { CashFlowChart } from "@/components/analytics/CashFlowChart";
import {
  calculateHealthScore,
  generateInsights,
  generateTopDrivers,
} from "@/lib/insights-engine";
import type { AnalyticsData } from "@/lib/insights-engine";
import { formatCurrency } from "@/lib/utils/currency";
import { useDonationStore } from "@/lib/store";
import { logger } from "@/lib/logger";
import { format } from "date-fns";
import { he, enUS } from "date-fns/locale";
import { formatHebrewDate } from "@/lib/utils/hebrew-date";

export function AnalyticsPage() {
  const { t, i18n } = useTranslation("analytics");
  const { user } = useAuth();
  const { platform } = usePlatform();
  const defaultCurrency = useDonationStore(
    (state) => state.settings.defaultCurrency
  );
  const settings = useDonationStore((state) => state.settings);

  const {
    dateRangeSelection,
    setDateRangeSelection,
    activeDateRangeObject,
    dateRangeLabels,
    customDateRange,
    setCustomDateRange,
  } = useDateControls();

  const {
    serverTotalIncome,
    serverTotalExpenses,
    serverTotalDonations,
    serverTitheBalance,
    isLoadingServerIncome,
    isLoadingServerExpenses,
    isLoadingServerDonations,
    isLoadingServerTitheBalance,
  } = useServerStats(activeDateRangeObject, user, platform);

  const [monthlyData, setMonthlyData] = useState<MonthlyDataPoint[]>([]);
  const [isLoadingMonthly, setIsLoadingMonthly] = useState(false);
  const [prevPeriod, setPrevPeriod] = useState<PreviousPeriodData>({
    prevIncome: null,
    prevExpenses: null,
    prevDonations: null,
  });
  const [isLoadingPrev, setIsLoadingPrev] = useState(false);

  const isLoadingAny =
    isLoadingServerIncome ||
    isLoadingServerExpenses ||
    isLoadingServerDonations ||
    isLoadingServerTitheBalance ||
    isLoadingMonthly ||
    isLoadingPrev;

  // Fetch monthly chart data
  useEffect(() => {
    const effectiveUserId = platform === "web" ? user?.id ?? null : null;
    if (platform === "loading") return;
    if (platform === "web" && !effectiveUserId) return;

    let cancelled = false;

    const load = async () => {
      setIsLoadingMonthly(true);
      try {
        const data = await fetchServerMonthlyChartData(
          effectiveUserId,
          new Date(),
          12
        );
        if (!cancelled && data) setMonthlyData(data);
      } catch (err) {
        logger.error("AnalyticsPage: Error fetching monthly data:", err);
      } finally {
        if (!cancelled) setIsLoadingMonthly(false);
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [platform, user]);

  // Fetch previous period data for comparisons
  useEffect(() => {
    const effectiveUserId = platform === "web" ? user?.id ?? null : null;
    if (platform === "loading") return;
    if (platform === "web" && !effectiveUserId) return;
    if (
      !activeDateRangeObject.startDate ||
      !activeDateRangeObject.endDate
    )
      return;

    let cancelled = false;

    const load = async () => {
      setIsLoadingPrev(true);
      try {
        const data = await fetchPreviousPeriodData(
          effectiveUserId,
          activeDateRangeObject.startDate,
          activeDateRangeObject.endDate
        );
        if (!cancelled) setPrevPeriod(data);
      } catch (err) {
        logger.error("AnalyticsPage: Error fetching previous period:", err);
      } finally {
        if (!cancelled) setIsLoadingPrev(false);
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [platform, user, activeDateRangeObject]);

  const formatCurrencyFn = useCallback(
    (amount: number) => formatCurrency(amount, defaultCurrency, i18n.language),
    [defaultCurrency, i18n.language]
  );

  const analyticsData: AnalyticsData = useMemo(
    () => ({
      income: serverTotalIncome,
      expenses: serverTotalExpenses,
      donations: serverTotalDonations,
      titheBalance: serverTitheBalance,
      monthlyData,
      prevIncome: prevPeriod.prevIncome,
      prevExpenses: prevPeriod.prevExpenses,
      prevDonations: prevPeriod.prevDonations,
    }),
    [
      serverTotalIncome,
      serverTotalExpenses,
      serverTotalDonations,
      serverTitheBalance,
      monthlyData,
      prevPeriod,
    ]
  );

  const healthScore = useMemo(
    () => calculateHealthScore(analyticsData),
    [analyticsData]
  );

  const insights = useMemo(
    () => generateInsights(analyticsData, formatCurrencyFn),
    [analyticsData, formatCurrencyFn]
  );

  const topDrivers = useMemo(
    () => generateTopDrivers(analyticsData, formatCurrencyFn),
    [analyticsData, formatCurrencyFn]
  );

  const formatDateFn = useCallback(
    (date: Date) => {
      if (settings.calendarType === "hebrew") {
        return formatHebrewDate(date);
      }
      const currentLocale = i18n.language === "he" ? he : enUS;
      return format(date, "dd/MM/yyyy", { locale: currentLocale });
    },
    [settings.calendarType, i18n.language]
  );

  const periodLabel = useMemo(() => {
    const start = activeDateRangeObject.startDate;
    const end = activeDateRangeObject.endDate;
    if (!start || !end) return "";

    const startFormatted = formatDateFn(new Date(start + "T00:00:00"));
    const endFormatted = formatDateFn(new Date(end + "T00:00:00"));
    return `${t("period")}: ${startFormatted} – ${endFormatted}`;
  }, [activeDateRangeObject, t, formatDateFn]);

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold text-foreground">
          {t("pageTitle")}
        </h2>
        <p className="text-muted-foreground">{t("pageSubtitle")}</p>
      </div>

      {/* Global Date Range Filter */}
      <div className="flex justify-end gap-2 items-center flex-wrap">
        {(Object.keys(dateRangeLabels) as DateRangeSelectionType[])
          .filter((rangeKey) => rangeKey !== "custom")
          .map((rangeKey) => (
            <Button
              key={rangeKey}
              variant={dateRangeSelection === rangeKey ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRangeSelection(rangeKey)}
              className={
                dateRangeSelection !== rangeKey
                  ? "bg-transparent text-foreground hover:bg-muted/50"
                  : ""
              }
            >
              {dateRangeLabels[rangeKey]}
            </Button>
          ))}
        <DatePickerWithRange
          date={customDateRange}
          onDateChange={(range) => {
            setCustomDateRange(range);
            if (range?.from && range?.to) {
              setDateRangeSelection("custom");
            }
          }}
          triggerButton={
            <Button
              variant={dateRangeSelection === "custom" ? "default" : "outline"}
              size="sm"
              className={`whitespace-nowrap flex-shrink-0 ${
                dateRangeSelection !== "custom"
                  ? "bg-transparent text-foreground hover:bg-muted/50"
                  : ""
              }`}
            >
              <CalendarIcon className="h-4 w-4 md:ml-2" />
              <span className="hidden md:inline">
                {customDateRange?.from && customDateRange?.to
                  ? `${formatDateFn(customDateRange.from)} - ${formatDateFn(
                      customDateRange.to
                    )}`
                  : dateRangeLabels.custom}
              </span>
            </Button>
          }
          className="w-auto"
        />
      </div>

      {/* Row 1: Health Score + Insights + Drivers */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <FinancialHealthScore
          score={healthScore}
          isLoading={isLoadingAny}
          periodLabel={periodLabel}
        />
        <SmartInsights
          insights={insights}
          isLoading={isLoadingAny}
          periodLabel={periodLabel}
        />
        <TopDrivers
          drivers={topDrivers}
          isLoading={isLoadingAny}
          periodLabel={periodLabel}
        />
      </div>

      {/* Row 2: Cash Flow Chart */}
      <CashFlowChart
        monthlyData={monthlyData}
        isLoading={isLoadingMonthly}
        periodLabel={periodLabel}
      />
    </div>
  );
}
