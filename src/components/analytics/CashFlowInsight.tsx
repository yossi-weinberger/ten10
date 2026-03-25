import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
import { TrendingUp } from "lucide-react";
import { DateRangeObject } from "@/hooks/useDateControls";
import { logger } from "@/lib/logger";

interface KpiCardProps {
  label: string;
  value: string;
  colorClass: string;
  deltaContent?: React.ReactNode;
}

function KpiCard({ label, value, colorClass, deltaContent }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground mb-1 truncate">{label}</p>
      <p className={`text-base sm:text-lg font-bold ${colorClass}`}>{value}</p>
      {deltaContent && <div className="mt-1">{deltaContent}</div>}
    </div>
  );
}

interface CashFlowInsightProps {
  activeDateRangeObject: DateRangeObject;
  // KPI values from useServerStats (passed down to avoid double-fetching)
  serverTotalIncome: number | null | undefined;
  serverTotalExpenses: number | null | undefined;
  isLoadingStats: boolean;
  // delta props (from comparison todo — passed as undefined until implemented)
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

  // Calculate number of months in the range
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

  const fmt = (v: number) => formatCurrency(v, defaultCurrency, i18n.language);

  const income = serverTotalIncome ?? 0;
  const expenses = serverTotalExpenses ?? 0;
  const net = income - expenses;
  const savingsRate = income > 0 ? (net / income) * 100 : 0;

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

  const isLoading = isLoadingStats || isLoadingChart;

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label={t("analytics.cashFlow.income")}
            value={isLoadingStats ? "..." : fmt(income)}
            colorClass="text-green-500"
            deltaContent={
              prevIncome != null && prevIncome > 0 ? (
                <DeltaBadge current={income} previous={prevIncome} />
              ) : undefined
            }
          />
          <KpiCard
            label={t("analytics.cashFlow.expenses")}
            value={isLoadingStats ? "..." : fmt(expenses)}
            colorClass="text-destructive"
            deltaContent={
              prevExpenses != null && prevExpenses > 0 ? (
                <DeltaBadge current={expenses} previous={prevExpenses} />
              ) : undefined
            }
          />
          <KpiCard
            label={t("analytics.cashFlow.net")}
            value={isLoadingStats ? "..." : fmt(net)}
            colorClass={net >= 0 ? "text-blue-500" : "text-destructive"}
          />
          <KpiCard
            label={t("analytics.cashFlow.savingsRate")}
            value={isLoadingStats ? "..." : `${savingsRate.toFixed(1)}%`}
            colorClass={savingsRate >= 10 ? "text-purple-500" : "text-muted-foreground"}
          />
        </div>

        {/* Chart */}
        {isLoading && chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">{t("analytics.loading")}</p>
          </div>
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
