import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp,
  TrendingDown,
  Heart,
  DollarSign,
  Info,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AdminFinanceStats } from "@/lib/data-layer/admin.service";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminCurrencyFilter } from "@/components/admin/AdminCurrencyFilter";
import { useAdminCurrencySelection } from "@/lib/admin/use-admin-currency-selection";
import {
  formatAdminMixedAmount,
  sortAdminCurrencies,
  sumSelectedCurrencyTotals,
} from "@/lib/admin/trend-chart.utils";

interface AdminFinanceSectionProps {
  finance: AdminFinanceStats;
}

export function AdminFinanceSection({ finance }: AdminFinanceSectionProps) {
  const { t, i18n } = useTranslation("admin");
  const locale = i18n.language === "he" ? "he-IL" : "en-US";

  const currencies = useMemo(
    () => sortAdminCurrencies(Object.keys(finance.by_currency ?? {})),
    [finance.by_currency]
  );
  const [selected, setSelected] = useAdminCurrencySelection(currencies);
  const hasByCurrency = currencies.length > 0;

  const totals = hasByCurrency
    ? sumSelectedCurrencyTotals(finance.by_currency, selected)
    : {
        income: finance.total_income,
        expenses: finance.total_expenses,
        donations: finance.total_donations,
        exempt_income: finance.total_exempt_income,
        recognized_expenses: finance.total_recognized_expenses,
        non_tithe_donation: finance.total_non_tithe_donation,
        total_managed:
          finance.total_income +
          finance.total_expenses +
          finance.total_donations,
      };

  const formatAmount = (amount: number, codes: string[] = selected) =>
    formatAdminMixedAmount(amount, codes, locale);

  return (
    <div className="space-y-4" dir={i18n.dir()}>
      <h2 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
        <DollarSign className="h-6 w-6 text-primary" />
        {t("finance.title")}
      </h2>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>{t("finance.disclaimer")}</AlertDescription>
      </Alert>

      {hasByCurrency && (
        <AdminCurrencyFilter
          currencies={currencies}
          selected={selected}
          onChange={setSelected}
        />
      )}

      <Card className="border-border bg-card">
        <CardHeader className="text-center">
          <CardTitle className="text-xl text-muted-foreground sm:text-2xl">
            {t("finance.totalManaged")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-4xl font-bold tabular-nums text-primary sm:text-5xl md:text-6xl">
            {formatAmount(totals.total_managed)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("finance.totalManagedHint")}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <AdminMetricCard
          title={t("finance.totalIncome")}
          tooltip={t("finance.tooltips.totalIncome")}
          value={formatAmount(totals.income)}
          icon={TrendingUp}
          subtitle={
            totals.exempt_income > 0
              ? `${formatAmount(totals.exempt_income)} ${t("finance.exemptIncome")}`
              : undefined
          }
        />
        <AdminMetricCard
          title={t("finance.totalExpenses")}
          tooltip={t("finance.tooltips.totalExpenses")}
          value={formatAmount(totals.expenses)}
          icon={TrendingDown}
          subtitle={
            totals.recognized_expenses > 0
              ? `${formatAmount(totals.recognized_expenses)} ${t("finance.recognizedExpenses")}`
              : undefined
          }
        />
        <AdminMetricCard
          title={t("finance.totalDonations")}
          tooltip={t("finance.tooltips.totalDonations")}
          value={formatAmount(totals.donations)}
          icon={Heart}
          subtitle={
            totals.non_tithe_donation > 0
              ? `${formatAmount(totals.non_tithe_donation)} ${t("finance.nonTitheDonation")}`
              : undefined
          }
        />
      </div>

      {hasByCurrency && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>{t("finance.byCurrency")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currencies
                .filter((currency) => selected.includes(currency))
                .map((currency) => {
                  const amounts = finance.by_currency[currency];
                  if (!amounts) return null;
                  return (
                    <div
                      key={currency}
                      className="border-b border-border pb-4 last:border-b-0"
                    >
                      <h3 className="mb-2 font-semibold">{currency}</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                        <div>
                          <span className="text-muted-foreground">
                            {t("finance.income")}:{" "}
                          </span>
                          <span className="font-medium tabular-nums">
                            {formatAmount(amounts.income, [currency])}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            {t("finance.expenses")}:{" "}
                          </span>
                          <span className="font-medium tabular-nums">
                            {formatAmount(amounts.expenses, [currency])}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            {t("finance.donations")}:{" "}
                          </span>
                          <span className="font-medium tabular-nums">
                            {formatAmount(amounts.donations, [currency])}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            {t("finance.total")}:{" "}
                          </span>
                          <span className="font-bold tabular-nums">
                            {formatAmount(
                              amounts.total_managed ??
                                amounts.income +
                                  amounts.expenses +
                                  amounts.donations,
                              [currency]
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
