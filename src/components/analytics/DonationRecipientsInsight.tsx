import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartConfig } from "@/components/ui/chart";
import { DonationRecipientsResponse } from "@/lib/data-layer/insights.service";
import { useDonationStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils/currency";
import { HandCoins } from "lucide-react";
import { BreakdownBarPieChart } from "./BreakdownBarPieChart";
import { ChartViewToggle } from "./ChartViewToggle";

const ROW_HEIGHT = 40;
const VISIBLE_ROWS = 7;
const SCROLL_HEIGHT = VISIBLE_ROWS * ROW_HEIGHT; // 280px visible area

type ChartViewType = "bar" | "pie";

interface DonationRecipientsInsightProps {
  data: DonationRecipientsResponse;
  isLoading: boolean;
  error: string | null;
}


export function DonationRecipientsInsight({
  data,
  isLoading,
  error,
}: DonationRecipientsInsightProps) {
  const { t, i18n } = useTranslation("dashboard");
  const defaultCurrency = useDonationStore((s) => s.settings.defaultCurrency);
  const [chartView, setChartView] = useState<ChartViewType>("bar");
  const fmt = useCallback(
    (v: number) => formatCurrency(v, defaultCurrency, i18n.language),
    [defaultCurrency, i18n.language]
  );

  // ChartContainer CSS var injection for pie colors
  const chartConfig = useMemo<ChartConfig>(
    () => ({
      total_amount: { label: t("monthlyChart.amount"), color: "hsl(var(--chart-yellow))" },
    }),
    [t]
  );

  const localizedData = useMemo(() =>
    data.map((item, index) => ({
      ...item,
      label: item.recipient === "other"
        ? t("analytics.recipients.other")
        : (item.last_description || item.recipient || t("analytics.recipients.other")),
      fill: `hsl(42 ${Math.round(90 - index * 8)}% ${Math.round(45 + index * 5)}%)`,
    })),
    [data, t]
  );

  const totalAmount = useMemo(
    () => localizedData.reduce((s, d) => s + d.total_amount, 0),
    [localizedData]
  );

  const fullBarHeight = Math.max(SCROLL_HEIGHT, localizedData.length * ROW_HEIGHT);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="h-full"
    >
      <Card dir={i18n.dir()} className="bg-gradient-to-br from-background to-muted/20 h-full">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <HandCoins className="h-4 w-4 shrink-0 text-yellow-500" />
                {t("analytics.recipients.title")}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{t("analytics.recipients.subtitle")}</p>
            </div>
            <ChartViewToggle value={chartView} onChange={setChartView} />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center" style={{ height: SCROLL_HEIGHT }}>
              <p className="text-sm text-muted-foreground">{t("analytics.loading")}</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center" style={{ height: SCROLL_HEIGHT }}>
              <p className="text-sm text-destructive">{t("analytics.error")}</p>
            </div>
          ) : localizedData.length === 0 ? (
            <div className="flex items-center justify-center" style={{ height: SCROLL_HEIGHT }}>
              <p className="text-sm text-muted-foreground">{t("analytics.recipients.noData")}</p>
            </div>
          ) : (
            <div id="pdf-chart-donations">
              <BreakdownBarPieChart
                data={localizedData}
                totalAmount={totalAmount}
                chartConfig={chartConfig}
                chartView={chartView}
                pieHeight={SCROLL_HEIGHT}
                scrollHeight={SCROLL_HEIGHT}
                fullBarHeight={fullBarHeight}
                fmt={fmt}
                yAxisWidth={110}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
