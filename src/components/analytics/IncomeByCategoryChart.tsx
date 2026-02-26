import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { Pie, PieChart, Cell, Tooltip as RechartsTooltip } from "recharts";
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
import type { CategoryBreakdown } from "@/lib/data-layer/category-analytics.service";

interface IncomeByCategoryChartProps {
  data: CategoryBreakdown[];
  isLoading: boolean;
  periodLabel: string;
}

const PIE_COLORS = [
  "#2a9d8f", "#e9c46a", "#264653", "#e76e50", "#f4a261",
  "#6a4c93", "#1982c4", "#8ac926",
];

export function IncomeByCategoryChart({
  data,
  isLoading,
  periodLabel,
}: IncomeByCategoryChartProps) {
  const { t } = useTranslation("analytics");

  const chartData = useMemo(
    () => data.map((item) => ({ name: item.category, value: item.total_amount })),
    [data]
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {t("categories.incomeTitle")}
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-foreground focus:outline-none rounded p-1">
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs z-50">
              <p className="text-sm">{t("categories.incomesTooltip")}</p>
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
          <p className="text-sm text-muted-foreground py-8 text-center">{t("noData")}</p>
        ) : (
          <div className="flex flex-col items-center">
            <PieChart width={260} height={220}>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={3}
              >
                {chartData.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip
                formatter={(value: number) => [`₪${value.toLocaleString("he-IL")}`, ""]}
              />
            </PieChart>
            <div className="flex flex-wrap justify-center gap-3 mt-1">
              {chartData.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="text-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
