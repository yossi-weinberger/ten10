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

const RING_R = 30;
const RING_C = 2 * Math.PI * RING_R; // ≈ 188.5

function TypeRingChart({
  label,
  recurringAmount,
  totalAmount,
  isLoading,
  strokeColor,
  defaultCurrency,
  language,
  index,
}: {
  label: string;
  recurringAmount: number;
  totalAmount: number | null | undefined;
  isLoading: boolean;
  strokeColor: string;
  defaultCurrency: string;
  language: string;
  index: number;
}) {
  const pct = totalAmount && totalAmount > 0 ? Math.min((recurringAmount / totalAmount) * 100, 100) : 0;
  const { displayValue, startAnimateValue } = useAnimatedCounter({ serverValue: recurringAmount, isLoading });

  if (totalAmount == null || totalAmount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.12, duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center gap-1.5"
    >
      {/* Ring */}
      <div className="relative w-[72px] h-[72px]">
        <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
          {/* Track */}
          <circle
            cx="36" cy="36" r={RING_R} fill="none"
            style={{ stroke: "hsl(var(--muted))" }}
            strokeWidth="7"
          />
          {/* Progress */}
          <motion.circle
            cx="36" cy="36" r={RING_R} fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            style={{ stroke: strokeColor }}
            strokeDasharray={RING_C}
            initial={{ strokeDashoffset: RING_C }}
            animate={{ strokeDashoffset: RING_C * (1 - pct / 100) }}
            transition={{ duration: 1, ease: "easeOut", delay: index * 0.12 }}
          />
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-foreground">{pct.toFixed(0)}%</span>
        </div>
      </div>

      {/* Recurring amount */}
      <p className="text-xs font-semibold text-foreground">
        <CountUp
          start={startAnimateValue}
          end={displayValue}
          duration={0.75}
          decimals={0}
          formattingFn={(v) => formatCurrency(v, defaultCurrency, language)}
        />
      </p>

      {/* Type label */}
      <p className="text-[11px] text-muted-foreground text-center leading-tight">{label}</p>
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
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("analytics.recurringRatioByType.subtitle")}
          </p>
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
            <div className="flex justify-around items-start pt-2 pb-1">
              {([
                { labelKey: "expenses",  recurring: recurringExpenses,  total: totalExpenses,  strokeColor: "hsl(0, 68%, 54%)" },
                { labelKey: "income",    recurring: recurringIncome,    total: totalIncome,    strokeColor: "hsl(145, 58%, 44%)" },
                { labelKey: "donations", recurring: recurringDonations, total: totalDonations, strokeColor: "hsl(42, 78%, 48%)" },
              ] as const).map(({ labelKey, recurring, total, strokeColor }, i) => (
                <TypeRingChart
                  key={labelKey}
                  label={t(`analytics.recurringRatioByType.${labelKey}`)}
                  recurringAmount={recurring}
                  totalAmount={total}
                  isLoading={isLoading}
                  strokeColor={strokeColor}
                  defaultCurrency={defaultCurrency}
                  language={i18n.language}
                  index={i}
                />
              ))}
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
