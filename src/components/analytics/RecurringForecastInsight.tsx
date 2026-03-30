import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RecurringTransaction } from "@/types/transaction";
import { useDonationStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils/currency";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { CalendarClock } from "lucide-react";
import { ListRowsSkeleton } from "./AnalyticsSkeleton";

const INCOME_TYPES = ["income", "exempt-income"];
const EXPENSE_TYPES = ["expense", "recognized-expense"];
const DONATION_TYPES = ["donation", "non_tithe_donation"];

type RecurringTab = "expense" | "income" | "donation";

interface RecurringForecastInsightProps {
  activeRecurring: RecurringTransaction[];
  isLoading: boolean;
  error: string | null;
}

interface RecurringItemCardProps {
  item: RecurringTransaction;
  defaultCurrency: string;
  language: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
  dir: string;
  index: number;
}

function RecurringItemCard({ item, defaultCurrency, language, t, dir, index }: RecurringItemCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.2), duration: 0.2 }}
      className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-1.5"
      dir={dir}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground truncate">
          {item.description || t("analytics.forecast.noDescription")}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {t("analytics.forecast.dayOfMonth", { day: item.day_of_month ?? 1 })}
          {item.category ? ` · ${item.category}` : ""}
        </p>
      </div>
      <p className="text-xs font-semibold text-foreground shrink-0">
        {formatCurrency(item.amount, defaultCurrency, language)}
      </p>
    </motion.div>
  );
}

function TabTotal({
  items,
  isLoading,
  defaultCurrency,
  language,
  label,
  colorClass,
}: {
  items: RecurringTransaction[];
  isLoading: boolean;
  defaultCurrency: string;
  language: string;
  label: string;
  colorClass: string;
}) {
  const total = useMemo(
    () => items.reduce((sum, r) => sum + r.amount, 0),
    [items]
  );
  const { displayValue, startAnimateValue } = useAnimatedCounter({
    serverValue: total,
    isLoading,
  });

  return (
    <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/50">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-bold ${colorClass}`}>
        <CountUp
          start={startAnimateValue}
          end={displayValue}
          duration={0.6}
          decimals={2}
          formattingFn={(v) => formatCurrency(v, defaultCurrency, language)}
        />
      </span>
    </div>
  );
}

export function RecurringForecastInsight({
  activeRecurring,
  isLoading,
  error,
}: RecurringForecastInsightProps) {
  const { t, i18n } = useTranslation("dashboard");
  const defaultCurrency = useDonationStore((s) => s.settings.defaultCurrency);
  const [activeTab, setActiveTab] = useState<RecurringTab>("expense");

  const expenseItems = useMemo(
    () => activeRecurring.filter((r) => EXPENSE_TYPES.includes(r.type)),
    [activeRecurring]
  );
  const incomeItems = useMemo(
    () => activeRecurring.filter((r) => INCOME_TYPES.includes(r.type)),
    [activeRecurring]
  );
  const donationItems = useMemo(
    () => activeRecurring.filter((r) => DONATION_TYPES.includes(r.type)),
    [activeRecurring]
  );

  const tabItems: Record<RecurringTab, RecurringTransaction[]> = {
    expense: expenseItems,
    income: incomeItems,
    donation: donationItems,
  };

  const tabColors: Record<RecurringTab, string> = {
    expense: "text-destructive",
    income: "text-green-500",
    donation: "text-yellow-500",
  };

  const tabLabels: Record<RecurringTab, string> = {
    expense: t("analytics.categories.tabExpenses"),
    income: t("analytics.categories.tabIncome"),
    donation: t("statsCards.donations.title"),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card
        dir={i18n.dir()}
        className="bg-gradient-to-br from-background to-muted/20 h-full"
      >
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CalendarClock className="h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
            {t("analytics.forecast.title")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {t("analytics.forecast.subtitle")}
            {!isLoading && activeRecurring.length > 0 && (
              <span className="ms-1">
                ({t("analytics.forecast.activeRecurring", { count: activeRecurring.length })})
              </span>
            )}
          </p>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {isLoading && activeRecurring.length === 0 ? (
            <ListRowsSkeleton rows={4} />
          ) : error ? (
            <p className="text-sm text-destructive">{t("analytics.error")}</p>
          ) : activeRecurring.length === 0 ? (
            <div className="h-32 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {t("analytics.forecast.noData")}
              </p>
            </div>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as RecurringTab)}
              dir={i18n.dir()}
            >
              <TabsList className="h-8 mb-3">
                {(["expense", "income", "donation"] as RecurringTab[]).map((tab) => (
                  <TabsTrigger key={tab} value={tab} className="text-xs px-3 gap-1">
                    {tabLabels[tab]}
                    {tabItems[tab].length > 0 && (
                      <span className="inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px] h-4 min-w-[16px] px-1">
                        {tabItems[tab].length}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Single AnimatePresence for smooth slide when switching tabs */}
              <div className="overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    {tabItems[activeTab].length === 0 ? (
                      <div className="h-20 flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">
                          {t("analytics.forecast.noData")}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="max-h-52 overflow-y-auto space-y-1.5 pr-0.5">
                          {tabItems[activeTab].map((item, index) => (
                            <RecurringItemCard
                              key={item.id}
                              item={item}
                              defaultCurrency={defaultCurrency}
                              language={i18n.language}
                              t={t}
                              dir={i18n.dir()}
                              index={index}
                            />
                          ))}
                        </div>
                        <TabTotal
                          items={tabItems[activeTab]}
                          isLoading={isLoading}
                          defaultCurrency={defaultCurrency}
                          language={i18n.language}
                          label={t("analytics.forecast.monthlyTotal")}
                          colorClass={tabColors[activeTab]}
                        />
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
