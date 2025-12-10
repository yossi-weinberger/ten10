import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
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
import { TrendingUp, Calendar as CalendarIcon } from "lucide-react";
import {
  MonthlyTrend,
  fetchAdminMonthlyTrends,
} from "@/lib/data-layer/admin.service";
import {
  useDateControls,
  DateRangeSelectionType,
} from "@/hooks/useDateControls";

interface AdminTrendsChartProps {
  initialTrends: MonthlyTrend[];
  earliestDate: string;
}

export function AdminTrendsChart({
  initialTrends,
  earliestDate,
}: AdminTrendsChartProps) {
  const { t, i18n } = useTranslation("admin");
  const [trends, setTrends] = useState<MonthlyTrend[]>(initialTrends);
  const [loading, setLoading] = useState(false);

  const {
    dateRangeSelection,
    setDateRangeSelection,
    activeDateRangeObject,
    dateRangeLabels,
    customDateRange,
    setCustomDateRange,
  } = useDateControls();

  // Fetch trends when date range changes
  useEffect(() => {
    async function loadTrends() {
      setLoading(true);
      try {
        // Override "all" to use earliest date instead of 1970
        const startDate =
          dateRangeSelection === "all"
            ? earliestDate
            : activeDateRangeObject.startDate;

        const data = await fetchAdminMonthlyTrends(
          startDate,
          activeDateRangeObject.endDate
        );
        if (data) {
          setTrends(data);
        }
      } catch (error) {
        console.error("Failed to fetch trends:", error);
      } finally {
        setLoading(false);
      }
    }
    loadTrends();
  }, [
    activeDateRangeObject.startDate,
    activeDateRangeObject.endDate,
    dateRangeSelection,
    earliestDate,
  ]);

  // Chart configurations using the same colors as the main dashboard
  const userGrowthConfig = {
    new_users: {
      label: t("trends.newUsers"),
      color: "hsl(var(--chart-1))",
    },
  };

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
  };

  const activityConfig = {
    transaction_count: {
      label: t("trends.transactionCount"),
      color: "hsl(38, 92%, 50%)",
    },
    active_users: {
      label: t("trends.activeUsers"),
      color: "hsl(262, 83%, 58%)",
    },
  };

  return (
    <div className="space-y-4" dir={i18n.dir()}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          {t("trends.title")}
        </h2>

        {/* Date Range Controls */}
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

      {/* User Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t("trends.userGrowth")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={userGrowthConfig}
            className="h-[300px] w-full"
          >
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-muted-foreground"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-muted-foreground"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="new_users"
                stroke="var(--color-new_users)"
                strokeWidth={3}
                dot={{
                  fill: "hsl(var(--background))",
                  stroke: "var(--color-new_users)",
                  strokeWidth: 2,
                  r: 5,
                }}
                activeDot={{
                  r: 7,
                  fill: "var(--color-new_users)",
                  stroke: "hsl(var(--background))",
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Financial Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t("trends.financialTrends")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={financialConfig} className="h-[400px] w-full">
            <AreaChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-muted-foreground"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-muted-foreground"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="total_income"
                stroke="var(--color-total_income)"
                fill="var(--color-total_income)"
                fillOpacity={0.6}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="total_donations"
                stroke="var(--color-total_donations)"
                fill="var(--color-total_donations)"
                fillOpacity={0.6}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="total_expenses"
                stroke="var(--color-total_expenses)"
                fill="var(--color-total_expenses)"
                fillOpacity={0.6}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Transaction Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t("trends.activityTrends")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={activityConfig} className="h-[300px] w-full">
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-muted-foreground"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-muted-foreground"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="transaction_count"
                stroke="var(--color-transaction_count)"
                strokeWidth={3}
                dot={{
                  fill: "hsl(var(--background))",
                  stroke: "var(--color-transaction_count)",
                  strokeWidth: 2,
                  r: 5,
                }}
                activeDot={{
                  r: 7,
                  fill: "var(--color-transaction_count)",
                  stroke: "hsl(var(--background))",
                  strokeWidth: 2,
                }}
              />
              <Line
                type="monotone"
                dataKey="active_users"
                stroke="var(--color-active_users)"
                strokeWidth={3}
                dot={{
                  fill: "hsl(var(--background))",
                  stroke: "var(--color-active_users)",
                  strokeWidth: 2,
                  r: 5,
                }}
                activeDot={{
                  r: 7,
                  fill: "var(--color-active_users)",
                  stroke: "hsl(var(--background))",
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
