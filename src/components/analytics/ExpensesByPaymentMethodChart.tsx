import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  Tooltip as RechartsTooltip,
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
} from "@/components/ui/card";
import type { PaymentMethodBreakdown } from "@/lib/data-layer/category-analytics.service";

interface ExpensesByPaymentMethodChartProps {
  data: PaymentMethodBreakdown[];
  isLoading: boolean;
  periodLabel: string;
}

const BAR_COLORS = [
  "#e76e50", "#2a9d8f", "#e9c46a", "#264653", "#f4a261",
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

  const chartData = useMemo(
    () =>
      data.map((item) => ({
        name: item.payment_method,
        value: item.total_amount,
      })),
    [data]
  );

  const chartHeight = Math.max(180, chartData.length * 50 + 40);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {t("categories.paymentMethodTitle")}
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-foreground focus:outline-none rounded p-1">
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
          <p className="text-sm text-muted-foreground py-8 text-center">{t("noData")}</p>
        ) : (
          <BarChart
            width={350}
            height={chartHeight}
            data={chartData}
            layout="vertical"
            margin={{
              left: isSmallScreen ? 4 : 8,
              right: isSmallScreen ? 4 : 16,
              top: 8,
              bottom: 8,
            }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.3} />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              width={isSmallScreen ? 60 : 80}
              tick={{ fill: "currentColor", fontSize: 12 }}
            />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `₪${Number(value).toLocaleString("he-IL")}`}
              tick={{ fill: "currentColor", fontSize: 11 }}
            />
            <RechartsTooltip
              formatter={(value: number) => [`₪${value.toLocaleString("he-IL")}`, ""]}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
              {chartData.map((_, idx) => (
                <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        )}
      </CardContent>
    </Card>
  );
}
