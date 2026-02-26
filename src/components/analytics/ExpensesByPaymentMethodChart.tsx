import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import type { PaymentMethodBreakdown } from "@/lib/data-layer/category-analytics.service";

interface ExpensesByPaymentMethodChartProps {
  data: PaymentMethodBreakdown[];
  isLoading: boolean;
  periodLabel: string;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function ExpensesByPaymentMethodChart({
  data,
  isLoading,
  periodLabel,
}: ExpensesByPaymentMethodChartProps) {
  const { t } = useTranslation("analytics");

  const [isSmallScreen, setIsSmallScreen] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 640px)");
    const onChange = () => setIsSmallScreen(mql.matches);
    onChange();
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);

  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};
    data.forEach((item, idx) => {
      config[item.payment_method] = {
        label: item.payment_method,
        color: CHART_COLORS[idx % CHART_COLORS.length],
      };
    });
    return config;
  }, [data]);

  const chartData = useMemo(
    () =>
      data.map((item) => ({
        name: item.payment_method,
        value: item.total_amount,
        fill: `var(--color-${item.payment_method})`,
      })),
    [data]
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {t("categories.paymentMethodTitle")}
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground focus:outline-none rounded p-1"
              >
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs z-50">
              <p className="text-sm">{t("categories.paymentMethodTooltip")}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-xs text-muted-foreground">{periodLabel}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          </div>
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {t("noData")}
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{
                left: isSmallScreen ? 4 : 8,
                right: isSmallScreen ? 4 : 12,
                top: 8,
                bottom: 8,
              }}
            >
              <CartesianGrid horizontal={false} className="stroke-muted" />
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
                width={isSmallScreen ? 60 : 100}
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  const num = Number(value);
                  if (!Number.isFinite(num)) return "";
                  return `₪${num.toLocaleString("he-IL")}`;
                }}
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent />}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
