import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartConfig } from "@/components/ui/chart";
import { PaymentMethodBreakdownResponse } from "@/lib/data-layer/insights.service";
import { useDonationStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils/currency";
import { isPredefinedPaymentMethod } from "@/lib/payment-methods";
import { CreditCard } from "lucide-react";
import { BreakdownBarPieChart } from "./BreakdownBarPieChart";
import { ChartViewToggle } from "./ChartViewToggle";

type ChartViewType = "bar" | "pie";

interface PaymentMethodInsightProps {
  data: PaymentMethodBreakdownResponse;
  isLoading: boolean;
  error: string | null;
}


export function PaymentMethodInsight({ data, isLoading, error }: PaymentMethodInsightProps) {
  const { t, i18n } = useTranslation("dashboard");
  // Use the transactions namespace to resolve payment method option labels
  const { t: tTx } = useTranslation("transactions");
  const defaultCurrency = useDonationStore((s) => s.settings.defaultCurrency);
  const [chartView, setChartView] = useState<ChartViewType>("bar");
  const fmt = useCallback(
    (v: number) => formatCurrency(v, defaultCurrency, i18n.language),
    [defaultCurrency, i18n.language]
  );

  // ChartContainer injects --color-slice-0..4 as resolved CSS values
  const chartConfig = useMemo<ChartConfig>(
    () => ({
      total_amount: { label: t("monthlyChart.amount"), color: "hsl(var(--chart-blue))" },
    }),
    [t]
  );

  const localizedData = useMemo(() =>
    data.map((item, index) => {
      // Resolve payment method label using the transactions namespace directly
      const label = isPredefinedPaymentMethod(item.payment_method)
        ? tTx(`transactionForm.paymentMethod.options.${item.payment_method}`, {
            defaultValue: item.payment_method,
          })
        : (item.payment_method || t("analytics.paymentMethods.other"));

      return {
        ...item,
        label,
        fill: `hsl(210 ${Math.round(85 - index * 6)}% ${Math.round(45 + index * 5)}%)`,
      };
    }),
    [data, tTx, t, i18n.language]
  );

  const totalAmount = useMemo(
    () => localizedData.reduce((s, d) => s + d.total_amount, 0),
    [localizedData]
  );

  const ROW_HEIGHT = 40;
  const VISIBLE_ROWS = 7;
  const SCROLL_HEIGHT = Math.max(160, VISIBLE_ROWS * ROW_HEIGHT); // 280px
  const fullBarHeight = Math.max(SCROLL_HEIGHT, localizedData.length * ROW_HEIGHT);
  const pieHeight = 240;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="h-full">
      <Card dir={i18n.dir()} className="bg-gradient-to-br from-background to-muted/20 h-full">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <CreditCard className="h-4 w-4 shrink-0 text-blue-500" aria-hidden="true" />
                {t("analytics.paymentMethods.title")}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{t("analytics.paymentMethods.subtitle")}</p>
            </div>
            <ChartViewToggle value={chartView} onChange={setChartView} />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {isLoading ? (
            <div className="h-40 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">{t("analytics.loading")}</p>
            </div>
          ) : error ? (
            <div className="h-40 flex items-center justify-center">
              <p className="text-sm text-destructive">{t("analytics.error")}</p>
            </div>
          ) : localizedData.length === 0 ? (
            <div className="h-40 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">{t("analytics.paymentMethods.noData")}</p>
            </div>
          ) : (
            <div id="pdf-chart-payment">
              <BreakdownBarPieChart
                data={localizedData}
                totalAmount={totalAmount}
                chartConfig={chartConfig}
                chartView={chartView}
                pieHeight={pieHeight}
                scrollHeight={SCROLL_HEIGHT}
                fullBarHeight={fullBarHeight}
                fmt={fmt}
                outerRadius={80}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
