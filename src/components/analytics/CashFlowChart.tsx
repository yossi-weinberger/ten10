import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import type { MonthlyDataPoint } from "@/lib/data-layer/chart.service";
import { formatCurrency } from "@/lib/utils/currency";
import { useDonationStore } from "@/lib/store";

interface CashFlowChartProps {
  monthlyData: MonthlyDataPoint[];
  isLoading: boolean;
  periodLabel: string;
}

export function CashFlowChart({
  monthlyData,
  isLoading,
  periodLabel,
}: CashFlowChartProps) {
  const { t, i18n } = useTranslation("analytics");
  const defaultCurrency = useDonationStore(
    (state) => state.settings.defaultCurrency
  );

  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 640px)");
    const onChange = () => setIsSmallScreen(mql.matches);
    onChange();
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);

  const chartData = useMemo(
    () =>
      monthlyData.map((point) => ({
        month: point.month_label,
        income: point.income,
        expenses: point.expenses,
        net: point.income - point.expenses,
      })),
    [monthlyData]
  );

  const totalNet = useMemo(
    () => chartData.reduce((sum, d) => sum + d.net, 0),
    [chartData]
  );

  const chartConfig: ChartConfig = {
    income: {
      label: t("cashFlow.income"),
      color: "#2a9d8f",
    },
    expenses: {
      label: t("cashFlow.expenses"),
      color: "#e76e50",
    },
    net: {
      label: t("cashFlow.net"),
      color: "#264653",
    },
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              {t("cashFlow.title")}
            </CardTitle>
            <CardDescription>{t("cashFlow.subtitle")}</CardDescription>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded p-1"
                aria-label={t("cashFlow.tooltipTitle")}
              >
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs z-50">
              <p className="font-semibold mb-1">{t("cashFlow.tooltipTitle")}</p>
              <p className="text-sm">{t("cashFlow.tooltipBody")}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-xs text-muted-foreground">{periodLabel}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          </div>
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {t("noData")}
          </p>
        ) : (
          <>
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[300px] w-full"
            >
              <BarChart
                data={chartData}
                margin={{
                  left: isSmallScreen ? 4 : 12,
                  right: isSmallScreen ? 4 : 12,
                  top: 10,
                  bottom: 10,
                }}
              >
                <CartesianGrid vertical={false} className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={isSmallScreen ? 4 : 8}
                  className="text-sm"
                  tick={{ fill: "currentColor" }}
                />
                <YAxis
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={isSmallScreen ? 4 : 8}
                  width={isSmallScreen ? 42 : undefined}
                  tickFormatter={(value) => {
                    const num = Number(value);
                    if (!Number.isFinite(num)) return "";
                    if (isSmallScreen) {
                      return `₪${new Intl.NumberFormat("he-IL", {
                        notation: "compact",
                        maximumFractionDigits: 1,
                      }).format(num)}`;
                    }
                    return `₪${num.toLocaleString("he-IL")}`;
                  }}
                  className="text-sm"
                  tick={{ fill: "currentColor" }}
                />
                <ChartTooltip
                  cursor={true}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <ChartLegend
                  content={<ChartLegendContent />}
                  wrapperStyle={{ paddingTop: isSmallScreen ? "8px" : "16px" }}
                />
                <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.3} />
                <Bar
                  dataKey="income"
                  fill="var(--color-income)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  fill="var(--color-expenses)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="net"
                  fill="var(--color-net)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {totalNet >= 0
                  ? t("cashFlow.totalSavings")
                  : t("cashFlow.totalDeficit")}
                :
              </span>
              <span
                className={`font-bold ${
                  totalNet >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {formatCurrency(
                  Math.abs(totalNet),
                  defaultCurrency,
                  i18n.language
                )}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
