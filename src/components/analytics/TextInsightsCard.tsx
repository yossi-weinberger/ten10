import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecurringTransaction } from "@/types/transaction";
import { CategoryBreakdownResponse } from "@/lib/data-layer/insights.service";
import { useDonationStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils/currency";
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Info,
  Lightbulb,
} from "lucide-react";

type InsightSeverity = "positive" | "negative" | "neutral" | "tip";

interface Insight {
  id: string;
  text: string;
  severity: InsightSeverity;
}

interface TextInsightsCardProps {
  serverTotalIncome: number | null | undefined;
  serverTotalExpenses: number | null | undefined;
  prevIncome: number | null | undefined;
  prevExpenses: number | null | undefined;
  activeRecurring: RecurringTransaction[];
  categoryData: CategoryBreakdownResponse;
  isLoading: boolean;
}

const SEVERITY_CONFIG: Record<InsightSeverity, { icon: React.ElementType; className: string }> = {
  positive: { icon: CheckCircle2, className: "text-green-500" },
  negative: { icon: AlertCircle, className: "text-destructive" },
  neutral: { icon: Info, className: "text-blue-500" },
  tip: { icon: Lightbulb, className: "text-yellow-500" },
};

export function TextInsightsCard({
  serverTotalIncome,
  serverTotalExpenses,
  prevIncome,
  prevExpenses,
  activeRecurring,
  categoryData,
  isLoading,
}: TextInsightsCardProps) {
  const { t, i18n } = useTranslation("dashboard");
  const defaultCurrency = useDonationStore((s) => s.settings.defaultCurrency);

  const insights: Insight[] = useMemo(() => {
    // Define fmt inside useMemo to avoid stale closure and broken memoization
    const fmt = (v: number) => formatCurrency(v, defaultCurrency, i18n.language);
    const list: Insight[] = [];
    const income = serverTotalIncome ?? 0;
    const expenses = serverTotalExpenses ?? 0;

    if (income <= 0 || expenses <= 0) return list;

    // 1. Savings rate
    const savingsRate = ((income - expenses) / income) * 100;
    if (savingsRate >= 20) {
      list.push({
        id: "savings-good",
        text: t("analytics.insights.savingsGood", { percentage: savingsRate.toFixed(1) }),
        severity: "positive",
      });
    } else if (savingsRate < 0) {
      list.push({
        id: "savings-negative",
        text: t("analytics.insights.savingsNegative", { amount: fmt(expenses - income) }),
        severity: "negative",
      });
    } else {
      list.push({
        id: "savings-ok",
        text: t("analytics.insights.savingsOk", { percentage: savingsRate.toFixed(1) }),
        severity: "neutral",
      });
    }

    // 2. Recurring expenses ratio
    const recurringExpenses = activeRecurring
      .filter((r) => ["expense", "recognized-expense"].includes(r.type))
      .reduce((s, r) => s + r.amount, 0);
    const recurringPct = expenses > 0 ? (recurringExpenses / expenses) * 100 : 0;
    if (recurringPct > 60) {
      list.push({
        id: "recurring-high",
        text: t("analytics.insights.recurringHighPct", { percentage: recurringPct.toFixed(0) }),
        severity: "neutral",
      });
    }

    // 3. Period comparison — expenses
    if (prevExpenses != null && prevExpenses > 0) {
      const expDelta = ((expenses - prevExpenses) / prevExpenses) * 100;
      if (Math.abs(expDelta) >= 10) {
        list.push({
          id: "expenses-delta",
          text:
            expDelta > 0
              ? t("analytics.insights.expensesUp", { percentage: expDelta.toFixed(0) })
              : t("analytics.insights.expensesDown", { percentage: Math.abs(expDelta).toFixed(0) }),
          severity: expDelta > 0 ? "negative" : "positive",
        });
      }
    }

    // 4. Period comparison — income
    if (prevIncome != null && prevIncome > 0) {
      const incDelta = ((income - prevIncome) / prevIncome) * 100;
      if (Math.abs(incDelta) >= 10) {
        list.push({
          id: "income-delta",
          text:
            incDelta > 0
              ? t("analytics.insights.incomeUp", { percentage: incDelta.toFixed(0) })
              : t("analytics.insights.incomeDown", { percentage: Math.abs(incDelta).toFixed(0) }),
          severity: incDelta > 0 ? "positive" : "negative",
        });
      }
    }

    // 5. No categories set
    const hasCategories = categoryData.some((c) => c.category !== "other" && c.category !== "");
    if (!hasCategories && categoryData.length > 0) {
      list.push({
        id: "no-categories",
        text: t("analytics.insights.noCategories"),
        severity: "tip",
      });
    }

    return list.slice(0, 4);
  // fmt is defined inside useMemo — remove it from deps (no longer an external reference)
  }, [serverTotalIncome, serverTotalExpenses, prevIncome, prevExpenses, activeRecurring, categoryData, t, defaultCurrency, i18n.language]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading || insights.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card dir={i18n.dir()} className="bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="p-4 sm:p-5 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            {t("analytics.insights.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0">
          <ul className="space-y-2.5">
            {insights.map((insight, i) => {
              const { icon: Icon, className } = SEVERITY_CONFIG[insight.severity];
              return (
                <motion.li
                  key={insight.id}
                  initial={{ opacity: 0, x: i18n.dir() === "rtl" ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-start gap-2.5"
                  dir={i18n.dir()}
                >
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${className}`} />
                  <span className="text-sm text-foreground leading-snug">{insight.text}</span>
                </motion.li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
}
