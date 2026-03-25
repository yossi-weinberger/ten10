import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecurringVsOnetimeResponse } from "@/lib/data-layer/insights.service";
import { useDonationStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils/currency";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { Repeat } from "lucide-react";

interface RecurringRatioInsightProps {
  data: RecurringVsOnetimeResponse;
  recurringExpenses?: number;
  totalExpenses?: number | null;
  recurringIncome?: number;
  totalIncome?: number | null;
  recurringDonations?: number;
  totalDonations?: number | null;
  isLoading: boolean;
  error: string | null;
}

function TypeProgressBar({
  label,
  recurringAmount,
  totalAmount,
  isLoading,
  barColor,
  defaultCurrency,
  language,
  index,
}: {
  label: string;
  recurringAmount: number;
  totalAmount: number | null | undefined;
  isLoading: boolean;
  barColor: string;
  defaultCurrency: string;
  language: string;
  index: number;
}) {
  const pct = totalAmount && totalAmount > 0 ? Math.min((recurringAmount / totalAmount) * 100, 100) : 0;
  const { displayValue, startAnimateValue } = useAnimatedCounter({ serverValue: recurringAmount, isLoading });
  const { i18n } = useTranslation("dashboard");

  if (totalAmount == null || totalAmount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="space-y-1.5"
    >
      <div className="flex items-center justify-between text-xs" dir={i18n.dir()}>
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">
          <CountUp
            start={startAnimateValue}
            end={displayValue}
            duration={0.65}
            decimals={2}
            formattingFn={(v) => formatCurrency(v, defaultCurrency, language)}
          />
          <span className="text-muted-foreground ms-1">({pct.toFixed(0)}%)</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut", delay: index * 0.08 }}
        />
      </div>
    </motion.div>
  );
}

export function RecurringRatioInsight({
  data,
  recurringExpenses = 0,
  totalExpenses,
  recurringIncome = 0,
  totalIncome,
  recurringDonations = 0,
  totalDonations,
  isLoading,
  error,
}: RecurringRatioInsightProps) {
  const { t, i18n } = useTranslation("dashboard");
  const defaultCurrency = useDonationStore((s) => s.settings.defaultCurrency);

  // Determine if we have per-type data
  const hasPerTypeData =
    (totalExpenses != null && totalExpenses > 0) ||
    (totalIncome != null && totalIncome > 0) ||
    (totalDonations != null && totalDonations > 0);

  // Fallback to original combined view from `data` prop
  const { recurringAmount, onetimeAmount } = useMemo(() => {
    const recurring = data.find((d) => d.is_recurring);
    const onetime = data.find((d) => !d.is_recurring);
    return {
      recurringAmount: recurring?.total_amount ?? 0,
      onetimeAmount: onetime?.total_amount ?? 0,
    };
  }, [data]);

  const noData = !isLoading && !error && !hasPerTypeData && recurringAmount === 0 && onetimeAmount === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      className="h-full"
    >
      <Card dir={i18n.dir()} className="bg-gradient-to-br from-background to-muted/20 h-full">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Repeat className="h-4 w-4 shrink-0 text-purple-500" />
            {t("analytics.recurringRatioByType.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {isLoading ? (
            <div className="h-28 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">{t("analytics.loading")}</p>
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{t("analytics.error")}</p>
          ) : noData ? (
            <div className="h-28 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">{t("analytics.recurringRatio.noData")}</p>
            </div>
          ) : hasPerTypeData ? (
            <div className="space-y-4">
              <TypeProgressBar
                label={t("analytics.recurringRatioByType.expenses")}
                recurringAmount={recurringExpenses}
                totalAmount={totalExpenses}
                isLoading={isLoading}
                barColor="bg-destructive"
                defaultCurrency={defaultCurrency}
                language={i18n.language}
                index={0}
              />
              <TypeProgressBar
                label={t("analytics.recurringRatioByType.income")}
                recurringAmount={recurringIncome}
                totalAmount={totalIncome}
                isLoading={isLoading}
                barColor="bg-green-500"
                defaultCurrency={defaultCurrency}
                language={i18n.language}
                index={1}
              />
              <TypeProgressBar
                label={t("analytics.recurringRatioByType.donations")}
                recurringAmount={recurringDonations}
                totalAmount={totalDonations}
                isLoading={isLoading}
                barColor="bg-yellow-500"
                defaultCurrency={defaultCurrency}
                language={i18n.language}
                index={2}
              />
            </div>
          ) : (
            // Fallback: original combined split bar
            <div className="space-y-4">
              <div className="h-3 rounded-full overflow-hidden flex gap-0.5">
                <motion.div
                  className="bg-purple-500 rounded-s-full"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${
                      recurringAmount + onetimeAmount > 0
                        ? (recurringAmount / (recurringAmount + onetimeAmount)) * 100
                        : 0
                    }%`,
                  }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
                <div className="bg-muted flex-1 rounded-e-full" />
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground mb-0.5">{t("analytics.recurringRatio.recurring")}</p>
                  <p className="font-bold text-purple-500">
                    {formatCurrency(recurringAmount, defaultCurrency, i18n.language)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">{t("analytics.recurringRatio.onetime")}</p>
                  <p className="font-bold text-foreground">
                    {formatCurrency(onetimeAmount, defaultCurrency, i18n.language)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
