import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChartConfig } from "@/components/ui/chart";
import { CategoryBreakdownResponse, CategoryType } from "@/lib/data-layer/insights.service";
import { useDonationStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils/currency";
import { LayoutList } from "lucide-react";
import { BreakdownBarPieChart } from "./BreakdownBarPieChart";
import { ChartViewToggle } from "./ChartViewToggle";

type ChartViewType = "bar" | "pie";

interface CategoryBreakdownChartProps {
  data: CategoryBreakdownResponse;
  isLoading: boolean;
  error: string | null;
  categoryType: CategoryType;
  onCategoryTypeChange: (t: CategoryType) => void;
}

function getBarColor(type: CategoryType, index: number, total: number): string {
  const pct = total <= 1 ? 0 : index / (total - 1);
  switch (type) {
    case "expense":
      return `hsl(0 ${Math.round(75 - pct * 15)}% ${Math.round(45 + pct * 23)}%)`;
    case "income":
      return `hsl(145 ${Math.round(65 - pct * 15)}% ${Math.round(38 + pct * 22)}%)`;
    case "donation":
      return `hsl(42 ${Math.round(90 - pct * 15)}% ${Math.round(45 + pct * 20)}%)`;
    default:
      return `hsl(210 ${Math.round(70 - pct * 15)}% ${Math.round(45 + pct * 20)}%)`;
  }
}


export function CategoryBreakdownChart({
  data,
  isLoading,
  error,
  categoryType,
  onCategoryTypeChange,
}: CategoryBreakdownChartProps) {
  const { t, i18n } = useTranslation("dashboard");
  const defaultCurrency = useDonationStore((s) => s.settings.defaultCurrency);
  const [chartView, setChartView] = useState<ChartViewType>("bar");
  const fmt = useCallback(
    (v: number) => formatCurrency(v, defaultCurrency, i18n.language),
    [defaultCurrency, i18n.language]
  );

  // ChartContainer injects --color-slice-0..4 as resolved CSS values;
  // Cell uses var(--color-slice-N) which works in SVG (unlike hsl(var(--chart-N)))
  const chartConfig = useMemo<ChartConfig>(
    () => ({
      total_amount: { label: t("monthlyChart.amount"), color: "hsl(var(--chart-red))" },
    }),
    [t]
  );

  const localizedData = useMemo(() =>
    data.map((item, index) => ({
      ...item,
      label: item.category === "other" ? t("analytics.categories.other") : item.category,
      fill: getBarColor(categoryType, index, data.length),
    })),
    [data, categoryType, t]
  );

  const totalAmount = useMemo(
    () => localizedData.reduce((s, d) => s + d.total_amount, 0),
    [localizedData]
  );

  const ROW_HEIGHT = 40;
  const VISIBLE_ROWS = 7;
  const SCROLL_HEIGHT = VISIBLE_ROWS * ROW_HEIGHT; // 280px fixed container
  const fullBarHeight = Math.max(SCROLL_HEIGHT, localizedData.length * ROW_HEIGHT);
  const pieHeight = 280;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="h-full">
      <Card dir={i18n.dir()} className="bg-gradient-to-br from-background to-muted/20 h-full">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <LayoutList className="h-4 w-4 shrink-0 text-yellow-500" aria-hidden="true" />
              {t("analytics.categories.title")}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Tabs value={categoryType} onValueChange={(v) => onCategoryTypeChange(v as CategoryType)} dir={i18n.dir()}>
                <TabsList className="h-8">
                  <TabsTrigger value="expense" className="text-xs px-3">{t("analytics.categories.tabExpenses")}</TabsTrigger>
                  <TabsTrigger value="income" className="text-xs px-3">{t("analytics.categories.tabIncome")}</TabsTrigger>
                </TabsList>
              </Tabs>
              <ChartViewToggle value={chartView} onChange={setChartView} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {isLoading ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">{t("analytics.loading")}</p>
            </div>
          ) : error ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-sm text-destructive">{t("analytics.error")}</p>
            </div>
          ) : localizedData.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">{t("analytics.categories.noData")}</p>
            </div>
          ) : (
            <div id="pdf-chart-categories">
              <BreakdownBarPieChart
                data={localizedData}
                totalAmount={totalAmount}
                chartConfig={chartConfig}
                chartView={chartView}
                motionKeyPrefix={`${categoryType}-`}
                pieHeight={pieHeight}
                scrollHeight={SCROLL_HEIGHT}
                fullBarHeight={fullBarHeight}
                fmt={fmt}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
