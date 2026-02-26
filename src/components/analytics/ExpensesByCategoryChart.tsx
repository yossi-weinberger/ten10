import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { Pie, PieChart } from "recharts";
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
  ChartLegend,
  ChartLegendContent,
  ChartConfig,
} from "@/components/ui/chart";
import type { CategoryBreakdown } from "@/lib/data-layer/category-analytics.service";

interface ExpensesByCategoryChartProps {
  data: CategoryBreakdown[];
  isLoading: boolean;
  periodLabel: string;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(210, 70%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(30, 80%, 55%)",
];

export function ExpensesByCategoryChart({
  data,
  isLoading,
  periodLabel,
}: ExpensesByCategoryChartProps) {
  const { t } = useTranslation("analytics");

  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};
    data.forEach((item, idx) => {
      const key = `cat${idx}`;
      config[key] = {
        label: item.category,
        color: CHART_COLORS[idx % CHART_COLORS.length],
      };
    });
    return config;
  }, [data]);

  const chartData = useMemo(
    () =>
      data.map((item, idx) => ({
        name: `cat${idx}`,
        displayName: item.category,
        value: item.total_amount,
        fill: `var(--color-cat${idx})`,
      })),
    [data]
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {t("categories.expensesTitle")}
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
              <p className="text-sm">{t("categories.expensesTooltip")}</p>
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
          <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[280px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="displayName" />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={100}
                paddingAngle={2}
              />
              <ChartLegend content={<ChartLegendContent nameKey="displayName" />} />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
