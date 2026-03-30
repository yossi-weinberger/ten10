import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import CountUp from "react-countup";
import { parse, format, subMonths } from "date-fns";
import { he, enUS } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig } from "@/components/ui/chart";
import {
  AreaChartInteractive,
  MonthlyChartDataPoint,
} from "@/components/charts/area-chart-interactive";
import { fetchServerMonthlyChartData } from "@/lib/data-layer/chart.service";
import { useDonationStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils/currency";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatform } from "@/contexts/PlatformContext";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { TrendingUp } from "lucide-react";
import { DateRangeObject } from "@/hooks/useDateControls";
import { logger } from "@/lib/logger";
import { KpiGridSkeleton, ChartAreaSkeleton } from "./AnalyticsSkeleton";

interface AnimatedCurrencyProps {
  value: number;
  isLoading: boolean;
  colorClass: string;
  defaultCurrency: string;
  language: string;
}

function AnimatedCurrency({ value, isLoading, colorClass, defaultCurrency, language }: AnimatedCurrencyProps) {
  const { displayValue, startAnimateValue } = useAnimatedCounter({ serverValue: value, isLoading });
  return (
    <p className={`text-base sm:text-lg font-bold ${colorClass}`}>
      <CountUp
        start={startAnimateValue}
        end={displayValue}
        duration={0.75}
        decimals={2}
        formattingFn={(v) => formatCurrency(v, defaultCurrency, language)}
      />
    </p>
  );
}

interface KpiCardProps {
  label: string;
  colorClass: string;
  deltaContent?: React.ReactNode;
  children: React.ReactNode;
}

function KpiCard({ label, colorClass: _colorClass, deltaContent, children }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground mb-1 truncate">{label}</p>
      {children}
      {deltaContent && <div className="mt-1">{deltaContent}</div>}
    </div>
  );
}

interface CashFlowInsightProps {
  activeDateRangeObject: DateRangeObject;
  serverTotalIncome: number | null | undefined;
  serverTotalExpenses: number | null | undefined;
  isLoadingStats: boolean;
  prevIncome?: number | null;
  prevExpenses?: number | null;
}

export function CashFlowInsight({
  activeDateRangeObject,
  serverTotalIncome,
  serverTotalExpenses,
  isLoadingStats,
  prevIncome,
  prevExpenses,
}: CashFlowInsightProps) {
  const { t, i18n } = useTranslation("dashboard");
  const { user } = useAuth();
  const { platform } = usePlatform();
  const defaultCurrency = useDonationStore((s) => s.settings.defaultCurrency);
  const dateLocale = i18n.language === "he" ? he : enUS;

  const [chartData, setChartData] = useState<MonthlyChartDataPoint[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

  const { startDate, endDate } = activeDateRangeObject;

  const numMonths = useMemo(() => {
    if (!startDate || !endDate) return 6;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()) +
      1;
    return Math.max(1, Math.min(months, 60));
  }, [startDate, endDate]);

  const loadChartData = useCallback(async () => {
    if (!startDate || !endDate) return;
    if (platform === "loading") return;
    if (platform === "web" && !user?.id) return;

    setIsLoadingChart(true);
    setChartError(null);
    try {
      const endDateObj = new Date(endDate);
      const data = await fetchServerMonthlyChartData(
        user?.id ?? null,
        endDateObj,
        numMonths
      );
      if (data) {
        const formatted = data
          .slice()
          .sort((a, b) =>
            parse(a.month_label, "yyyy-MM", new Date()) <
            parse(b.month_label, "yyyy-MM", new Date())
              ? -1
              : 1
          )
          .map((item) => ({
            month: format(
              parse(item.month_label, "yyyy-MM", new Date()),
              "MMM yyyy",
              { locale: dateLocale }
            ),
            income: item.income,
            donations: item.donations,
            expenses: item.expenses,
          }));
        setChartData(formatted);
      }
    } catch (err) {
      logger.error("CashFlowInsight: chart load error:", err);
      setChartError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingChart(false);
    }
  }, [startDate, endDate, platform, user?.id, numMonths, dateLocale]);

  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

  const income = serverTotalIncome ?? 0;
  const expenses = serverTotalExpenses ?? 0;
  const net = income - expenses;
  const savingsRate = income > 0 ? (net / income) * 100 : 0;

  const { displayValue: savingsDisplay, startAnimateValue: savingsStart } = useAnimatedCounter({
    serverValue: savingsRate,
    isLoading: isLoadingStats,
  });

  const chartConfig: ChartConfig = {
    income: {
      label: t("analytics.cashFlow.income"),
      color: "hsl(var(--chart-green))",
    },
    expenses: {
      label: t("analytics.cashFlow.expenses"),
      color: "hsl(var(--chart-red))",
    },
    donations: {
      label: t("monthlyChart.donations"),
      color: "hsl(var(--chart-yellow))",
    },
  };

  // Show skeleton only on first load (no data in store yet)
  const isInitialLoad = isLoadingStats && serverTotalIncome == null;
  const isChartInitialLoad = isLoadingChart && chartData.length === 0;

  return (
    <Card
      dir={i18n.dir()}
      className="bg-gradient-to-br from-background to-muted/20"
    >
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <TrendingUp className="h-4 w-4 shrink-0 text-green-500" />
          {t("analytics.cashFlow.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
        {/* KPI row */}
        {isInitialLoad ? (
          <KpiGridSkeleton count={4} className="grid-cols-2 lg:grid-cols-4" />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label={t("analytics.cashFlow.income")}
              colorClass="text-green-500"
              deltaContent={
                prevIncome != null && prevIncome > 0 ? (
                  <DeltaBadge current={income} previous={prevIncome} />
                ) : undefined
              }
            >
              <AnimatedCurrency
                value={income}
                isLoading={isLoadingStats}
                colorClass="text-green-500"
                defaultCurrency={defaultCurrency}
                language={i18n.language}
              />
            </KpiCard>
            <KpiCard
              label={t("analytics.cashFlow.expenses")}
              colorClass="text-destructive"
              deltaContent={
                prevExpenses != null && prevExpenses > 0 ? (
                  <DeltaBadge current={expenses} previous={prevExpenses} />
                ) : undefined
              }
            >
              <AnimatedCurrency
                value={expenses}
                isLoading={isLoadingStats}
                colorClass="text-destructive"
                defaultCurrency={defaultCurrency}
                language={i18n.language}
              />
            </KpiCard>
            <KpiCard label={t("analytics.cashFlow.net")} colorClass={net >= 0 ? "text-blue-500" : "text-destructive"}>
              <AnimatedCurrency
                value={net}
                isLoading={isLoadingStats}
                colorClass={net >= 0 ? "text-blue-500" : "text-destructive"}
                defaultCurrency={defaultCurrency}
                language={i18n.language}
              />
            </KpiCard>
            <KpiCard
              label={t("analytics.cashFlow.savingsRate")}
              colorClass={savingsRate >= 10 ? "text-purple-500" : "text-muted-foreground"}
            >
              <p className={`text-base sm:text-lg font-bold ${savingsRate >= 10 ? "text-purple-500" : "text-muted-foreground"}`}>
                <CountUp
                  start={savingsStart}
                  end={savingsDisplay}
                  duration={0.75}
                  decimals={1}
                  suffix="%"
                />
              </p>
            </KpiCard>
          </div>
        )}

        {/* Chart */}
        {isChartInitialLoad ? (
          <ChartAreaSkeleton height={220} />
        ) : chartError ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-sm text-destructive">{t("analytics.error")}</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">{t("analytics.cashFlow.noData")}</p>
          </div>
        ) : (
          <div dir="ltr">
            <AreaChartInteractive
              chartData={chartData}
              chartConfig={chartConfig}
              withCard={false}
              className="min-h-[220px] h-[40vh] w-full"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Delta Badge ──────────────────────────────────────────────────────────────

function DeltaBadge({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  const { t } = useTranslation("dashboard");
  if (previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const isUp = pct > 0;
  const isNeutral = Math.abs(pct) < 0.1;

  if (isNeutral)
    return (
      <span className="text-[10px] text-muted-foreground">
        {t("analytics.noChange")}
      </span>
    );

  return (
    <span
      className={`inline-flex items-center text-[10px] font-medium px-1 rounded ${
        isUp
          ? "bg-green-500/10 text-green-600 dark:text-green-400"
          : "bg-destructive/10 text-destructive"
      }`}
    >
      {isUp ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}
