import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { RecurringTransaction } from "@/types/transaction";
import { Info, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface InsightsSummaryRowProps {
  serverTotalIncome: number | null | undefined;
  serverTotalExpenses: number | null | undefined;
  prevIncome: number | null | undefined;
  activeRecurring: RecurringTransaction[];
  isLoading: boolean;
  isAllTime?: boolean;
}

// Defined at module level — not inside render — to avoid unmount/remount on every render
function DeltaBadge({ pct, t }: { pct: number; t: (key: string) => string }) {
  const isUp = pct > 0.5;
  const isDown = pct < -0.5;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-medium mt-1 ${
        isUp ? "text-green-500" : isDown ? "text-destructive" : "text-muted-foreground"
      }`}
    >
      {isUp ? <TrendingUp className="h-3 w-3" /> : isDown ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}%{" "}
      {isUp ? t("analytics.increase") : isDown ? t("analytics.decrease") : t("analytics.noChange")}
    </span>
  );
}

function NotApplicableBadge({ label }: { label: string }) {
  return (
    <p className="text-xs text-muted-foreground mt-1 italic">{label}</p>
  );
}

function InsightKpiCard({
  label,
  value,
  isLoading,
  colorClass,
  tooltip,
  deltaNode,
  index,
}: {
  label: string;
  value: number;
  isLoading: boolean;
  colorClass: string;
  tooltip?: string;
  deltaNode?: React.ReactNode;
  index: number;
}) {
  const { displayValue, startAnimateValue } = useAnimatedCounter({ serverValue: value, isLoading });
  const { i18n } = useTranslation("dashboard");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
    >
      <Card className="bg-gradient-to-br from-background to-muted/20 h-full">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-1 mb-2" dir={i18n.dir()}>
            <p className="text-xs text-muted-foreground leading-tight">{label}</p>
            {tooltip && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground shrink-0">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs" dir={i18n.dir()}>{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className={`text-2xl font-bold ${colorClass}`}>
            <CountUp
              start={startAnimateValue}
              end={displayValue}
              duration={0.7}
              decimals={1}
              suffix="%"
            />
          </p>
          {deltaNode}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function InsightsSummaryRow({
  serverTotalIncome,
  serverTotalExpenses,
  prevIncome,
  activeRecurring,
  isLoading,
  isAllTime = false,
}: InsightsSummaryRowProps) {
  const { t } = useTranslation("dashboard");

  const income = serverTotalIncome ?? 0;
  const expenses = serverTotalExpenses ?? 0;

  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : null;

  const recurringExpenses = useMemo(
    () =>
      activeRecurring
        .filter((r) => ["expense", "recognized-expense"].includes(r.type))
        .reduce((s, r) => s + r.amount, 0),
    [activeRecurring]
  );
  const recurringPct =
    expenses > 0 && recurringExpenses > 0
      ? (recurringExpenses / expenses) * 100
      : null;

  const incomeDelta =
    !isAllTime && prevIncome != null && prevIncome > 0 && income > 0
      ? ((income - prevIncome) / prevIncome) * 100
      : null;

  // Hide entirely only if truly no data and not all-time
  if (!isLoading && savingsRate === null && recurringPct === null && !isAllTime) {
    return null;
  }

  const notApplicableLabel = t("analytics.insightsSummary.notApplicable");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {savingsRate !== null && (
        <InsightKpiCard
          label={t("analytics.insightsSummary.savingsRate")}
          value={savingsRate}
          isLoading={isLoading}
          colorClass={savingsRate >= 20 ? "text-green-500" : savingsRate >= 0 ? "text-blue-500" : "text-destructive"}
          tooltip={t("analytics.insightsSummary.savingsRateTooltip")}
          index={0}
        />
      )}
      {recurringPct !== null && (
        <InsightKpiCard
          label={t("analytics.insightsSummary.recurringPct")}
          value={recurringPct}
          isLoading={isLoading}
          colorClass={recurringPct > 70 ? "text-yellow-500" : "text-purple-500"}
          tooltip={t("analytics.insightsSummary.recurringPctTooltip")}
          index={1}
        />
      )}
      {/* Period comparison — always show card, but "not applicable" for all-time */}
      {(incomeDelta !== null || isAllTime) && (
        <InsightKpiCard
          label={t("analytics.insightsSummary.periodComparison")}
          value={incomeDelta !== null ? Math.abs(incomeDelta) : 0}
          isLoading={isLoading && !isAllTime}
          colorClass={
            isAllTime
              ? "text-muted-foreground"
              : incomeDelta !== null && incomeDelta >= 0
              ? "text-green-500"
              : "text-destructive"
          }
          tooltip={t("analytics.insightsSummary.periodComparisonTooltip")}
          deltaNode={
            isAllTime ? (
              <NotApplicableBadge label={notApplicableLabel} />
            ) : incomeDelta !== null ? (
              <DeltaBadge pct={incomeDelta} t={t} />
            ) : null
          }
          index={2}
        />
      )}
    </div>
  );
}
