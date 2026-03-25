import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { DonationRecipientsResponse } from "@/lib/data-layer/insights.service";
import { useDonationStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils/currency";
import { HandCoins } from "lucide-react";

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
  const fmt = (v: number) => formatCurrency(v, defaultCurrency, i18n.language);

  const chartConfig: ChartConfig = {
    total_amount: {
      label: t("monthlyChart.amount"),
      color: "hsl(var(--chart-yellow))",
    },
  };

  const localizedData = data.map((item, index) => {
    // Show description first; if no description fall back to recipient name
    const displayLabel = (() => {
      if (item.recipient === "other") return t("analytics.recipients.other");
      if (item.last_description && item.last_description.trim()) {
        // Show "description (recipient)" when both are available and different
        const desc = item.last_description.trim();
        const rec = item.recipient && item.recipient !== "other" ? item.recipient.trim() : "";
        if (rec && rec.toLowerCase() !== desc.toLowerCase()) {
          return `${desc} (${rec})`;
        }
        return desc;
      }
      return item.recipient || t("analytics.recipients.other");
    })();

    return {
      ...item,
      label: displayLabel,
      // Yellow-amber gradient: darkest for top recipient
      fill: `hsl(42 ${Math.round(90 - index * 8)}% ${Math.round(45 + index * 6)}%)`,
    };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="h-full"
    >
      <Card
        dir={i18n.dir()}
        className="bg-gradient-to-br from-background to-muted/20 h-full"
      >
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <HandCoins className="h-4 w-4 shrink-0 text-yellow-500" />
            {t("analytics.recipients.title")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {t("analytics.recipients.subtitle")}
          </p>
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
              <p className="text-sm text-muted-foreground">
                {t("analytics.recipients.noData")}
              </p>
            </div>
          ) : (
            <div dir="ltr">
              <ChartContainer
                config={chartConfig}
                className="w-full min-h-[160px]"
                style={{ height: Math.max(160, localizedData.length * 44) }}
              >
                <BarChart
                  data={localizedData}
                  layout="vertical"
                  margin={{ top: 0, right: 70, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <YAxis
                    dataKey="label"
                    type="category"
                    width={95}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => fmt(v)}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => fmt(Number(value))}
                      />
                    }
                  />
                  <Bar dataKey="total_amount" radius={[0, 4, 4, 0]} isAnimationActive>
                    {localizedData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
