import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useTranslation } from "react-i18next";
import { AlertCircle, TrendingUp, Calendar as CalendarIcon } from "lucide-react";
import {
  MonthlyTrend,
  fetchAdminMonthlyTrends,
} from "@/lib/data-layer/admin.service";
import {
  useDateControls,
  DateRangeSelectionType,
} from "@/hooks/useDateControls";
import {
  formatCompactAmount,
  formatTrendBucketLabel,
} from "@/lib/admin/trend-chart.utils";

interface AdminTrendsChartProps {
  earliestDate: string;
}

export function AdminTrendsChart({ earliestDate }: AdminTrendsChartProps) {
  const { t, i18n } = useTranslation("admin");
  const [trends, setTrends] = useState<MonthlyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    dateRangeSelection,
    setDateRangeSelection,
    activeDateRangeObject,
    dateRangeLabels,
    customDateRange,
    setCustomDateRange,
  } = useDateControls();

  useEffect(() => {
    let cancelled = false;

    async function loadTrends() {
      setLoading(true);
      setError(null);
      try {
        const startDate =
          dateRangeSelection === "all"
            ? earliestDate
            : activeDateRangeObject.startDate;

        const data = await fetchAdminMonthlyTrends(
          startDate,
          activeDateRangeObject.endDate
        );
        if (cancelled) return;
        if (data) {
          setTrends(data);
        } else {
          setTrends([]);
          setError(t("trends.loadFailed"));
        }
      } catch (err) {
        console.error("Failed to fetch trends:", err);
        if (cancelled) return;
        setTrends([]);
        setError(t("trends.loadFailed"));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadTrends();
    return () => {
      cancelled = true;
    };
    // Language changes must not refetch; `t` is only used for error copy.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- omit t
  }, [
    activeDateRangeObject.startDate,
    activeDateRangeObject.endDate,
    dateRangeSelection,
    earliestDate,
  ]);

  const userGrowthConfig = {
    new_users: {
      label: t("trends.newUsers"),
      color: "hsl(var(--chart-teal))",
    },
  } satisfies ChartConfig;

  const financialConfig = {
    total_income: {
      label: t("finance.income"),
      color: "hsl(var(--chart-green))",
    },
    total_donations: {
      label: t("finance.donations"),
      color: "hsl(var(--chart-yellow))",
    },
    total_expenses: {
      label: t("finance.expenses"),
      color: "hsl(var(--chart-red))",
    },
  } satisfies ChartConfig;

  const activityConfig = {
    transaction_count: {
      label: t("trends.transactionCount"),
      color: "hsl(var(--chart-orange))",
    },
    active_users: {
      label: t("trends.activeUsers"),
      color: "hsl(var(--chart-blue))",
    },
  } satisfies ChartConfig;

  const locale = i18n.language === "he" ? "he-IL" : "en-US";
  const isDailyBuckets =
    trends.length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(trends[0].month);

  const formatBucketLabel = (value: string) =>
    formatTrendBucketLabel(value, locale, isDailyBuckets);

  const tooltipLabelFormatter = (value: unknown) =>
    formatTrendBucketLabel(String(value), locale, isDailyBuckets);

  const compactCountTick = (value: unknown) =>
    formatCompactAmount(Number(value), locale);

  return (
    <div className="space-y-4" dir={i18n.dir()}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          {t("trends.title")}
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          {(["month", "year", "all"] as DateRangeSelectionType[]).map(
            (type) => (
              <Button
                key={type}
                variant={dateRangeSelection === type ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRangeSelection(type)}
                disabled={loading}
              >
                {dateRangeLabels[type]}
              </Button>
            )
          )}
          <DatePickerWithRange
            date={customDateRange}
            onDateChange={(range) => {
              setCustomDateRange(range);
              if (range?.from) {
                setDateRangeSelection("custom");
              }
            }}
            triggerButton={
              <Button
                variant={
                  dateRangeSelection === "custom" ? "default" : "outline"
                }
                size="sm"
                className="whitespace-nowrap flex-shrink-0"
                disabled={loading}
              >
                <CalendarIcon className="h-4 w-4" />
                <span className="hidden md:inline ms-2">
                  {dateRangeLabels.custom}
                </span>
              </Button>
            }
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      )}

      {!loading && !error && trends.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t("trends.noData")}</AlertDescription>
        </Alert>
      )}

      {!loading && trends.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t("trends.userGrowth")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={userGrowthConfig}
                className="aspect-auto h-[300px] w-full"
                dir="ltr"
              >
                <AreaChart data={trends}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={isDailyBuckets ? 28 : 8}
                    className="text-muted-foreground"
                    tickFormatter={formatBucketLabel}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-muted-foreground"
                    tickFormatter={compactCountTick}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={tooltipLabelFormatter}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    type="monotone"
                    dataKey="new_users"
                    stroke="var(--color-new_users)"
                    fill="var(--color-new_users)"
                    fillOpacity={0.4}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("trends.financialTrends")}</CardTitle>
              <p className="text-sm text-muted-foreground font-normal">
                {t("trends.financialDisclaimer")}
              </p>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={financialConfig}
                className="aspect-auto h-[400px] w-full"
                dir="ltr"
              >
                <AreaChart data={trends}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={isDailyBuckets ? 28 : 8}
                    className="text-muted-foreground"
                    tickFormatter={formatBucketLabel}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={56}
                    className="text-muted-foreground"
                    tickFormatter={(value) =>
                      formatCompactAmount(Number(value), locale)
                    }
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={tooltipLabelFormatter}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    type="monotone"
                    dataKey="total_income"
                    stroke="var(--color-total_income)"
                    fill="var(--color-total_income)"
                    fillOpacity={0.5}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="total_donations"
                    stroke="var(--color-total_donations)"
                    fill="var(--color-total_donations)"
                    fillOpacity={0.5}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="total_expenses"
                    stroke="var(--color-total_expenses)"
                    fill="var(--color-total_expenses)"
                    fillOpacity={0.5}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("trends.activityTrends")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={activityConfig}
                className="aspect-auto h-[300px] w-full"
                dir="ltr"
              >
                <LineChart data={trends}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={isDailyBuckets ? 28 : 8}
                    className="text-muted-foreground"
                    tickFormatter={formatBucketLabel}
                  />
                  <YAxis
                    yAxisId="tx"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-muted-foreground"
                    tickFormatter={compactCountTick}
                  />
                  <YAxis
                    yAxisId="users"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={40}
                    className="text-muted-foreground"
                    tickFormatter={compactCountTick}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={tooltipLabelFormatter}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    yAxisId="tx"
                    type="monotone"
                    dataKey="transaction_count"
                    stroke="var(--color-transaction_count)"
                    strokeWidth={2}
                    dot={
                      isDailyBuckets
                        ? false
                        : {
                            fill: "hsl(var(--background))",
                            stroke: "var(--color-transaction_count)",
                            strokeWidth: 2,
                            r: 5,
                          }
                    }
                    activeDot={{
                      r: 6,
                      fill: "var(--color-transaction_count)",
                      stroke: "hsl(var(--background))",
                      strokeWidth: 2,
                    }}
                  />
                  <Line
                    yAxisId="users"
                    type="monotone"
                    dataKey="active_users"
                    stroke="var(--color-active_users)"
                    strokeWidth={2}
                    dot={
                      isDailyBuckets
                        ? false
                        : {
                            fill: "hsl(var(--background))",
                            stroke: "var(--color-active_users)",
                            strokeWidth: 2,
                            r: 5,
                          }
                    }
                    activeDot={{
                      r: 6,
                      fill: "var(--color-active_users)",
                      stroke: "hsl(var(--background))",
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
