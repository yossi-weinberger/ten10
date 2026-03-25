import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
  PieChart, Pie, Legend, Tooltip,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { DonationRecipientsResponse } from "@/lib/data-layer/insights.service";
import { useDonationStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils/currency";
import { HandCoins, BarChart2, PieChart as PieChartIcon } from "lucide-react";

const ROW_HEIGHT = 40;
const VISIBLE_ROWS = 7;
const SCROLL_HEIGHT = VISIBLE_ROWS * ROW_HEIGHT; // 280px visible area

type ChartViewType = "bar" | "pie";

interface DonationRecipientsInsightProps {
  data: DonationRecipientsResponse;
  isLoading: boolean;
  error: string | null;
}

function PieCustomTooltip({
  active,
  payload,
  total,
  fmt,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  total: number;
  fmt: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-foreground">{name}</p>
      <p className="text-muted-foreground">{fmt(value)} ({pct}%)</p>
    </div>
  );
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
      "slice-0": { color: "hsl(var(--chart-yellow))" },
      "slice-1": { color: "hsl(var(--chart-orange))" },
      "slice-2": { color: "hsl(var(--chart-teal))" },
      "slice-3": { color: "hsl(var(--chart-blue))" },
      "slice-4": { color: "hsl(var(--chart-purple))" },
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
            {/* Chart type toggle */}
            <div className="flex border border-border rounded-md overflow-hidden shrink-0">
              <Button
                size="icon"
                variant={chartView === "bar" ? "secondary" : "ghost"}
                className="h-8 w-8 rounded-none"
                onClick={() => setChartView("bar")}
                title={t("analytics.chartTypeBar")}
              >
                <BarChart2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant={chartView === "pie" ? "secondary" : "ghost"}
                className="h-8 w-8 rounded-none border-s border-border"
                onClick={() => setChartView("pie")}
                title={t("analytics.chartTypePie")}
              >
                <PieChartIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
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
              <AnimatePresence mode="wait">
                {chartView === "bar" ? (
                  <motion.div
                    key="bar"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full"
                    dir="ltr"
                  >
                    {/* Scroll wrapper — fixed visible height, full chart inside */}
                    <div style={{ maxHeight: SCROLL_HEIGHT, overflowY: "auto", width: "100%" }}>
                      <ChartContainer
                        config={chartConfig}
                        className="w-full"
                        style={{ height: fullBarHeight, minHeight: fullBarHeight }}
                      >
                        <BarChart data={localizedData} layout="vertical" margin={{ top: 0, right: 70, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <YAxis dataKey="label" type="category" width={110} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} tickLine={false} axisLine={false} />
                          <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmt(Number(value))} />} />
                          <Bar dataKey="total_amount" radius={[0, 4, 4, 0]} isAnimationActive>
                            {localizedData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ChartContainer>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="pie"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full"
                    dir="ltr"
                  >
                    <ChartContainer
                      config={chartConfig}
                      className="w-full"
                      style={{ height: SCROLL_HEIGHT, minHeight: SCROLL_HEIGHT }}
                    >
                      <PieChart>
                        <Pie
                          data={localizedData}
                          dataKey="total_amount"
                          nameKey="label"
                          cx="50%"
                          cy="45%"
                          outerRadius={90}
                          isAnimationActive
                        >
                          {localizedData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={`var(--color-slice-${index % 5})`} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieCustomTooltip total={totalAmount} fmt={fmt} />} />
                        <Legend
                          layout="horizontal"
                          verticalAlign="bottom"
                          align="center"
                          iconType="circle"
                          iconSize={8}
                          formatter={(value) => <span style={{ fontSize: 11 }}>{value}</span>}
                        />
                      </PieChart>
                    </ChartContainer>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
