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

interface AdminFinanceSectionProps {
  finance: AdminFinanceStats;
}

export function AdminFinanceSection({ finance }: AdminFinanceSectionProps) {
  const { t, i18n } = useTranslation("admin");

  const formatCurrency = (amount: number, currency: string = "ILS") => {
    const locale = i18n.language === "he" ? "he-IL" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Sum of primary types only (not FX-converted across currencies).
  const totalManaged =
    finance.total_income + finance.total_expenses + finance.total_donations;

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

      <Card className="border-border bg-card">
        <CardHeader className="text-center">
          <CardTitle className="text-xl text-muted-foreground sm:text-2xl">
            {t("finance.totalManaged")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-4xl font-bold tabular-nums text-primary sm:text-5xl md:text-6xl">
            {formatCurrency(totalManaged, "ILS")}
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
          value={formatCurrency(finance.total_income, "ILS")}
          icon={TrendingUp}
          subtitle={
            finance.total_exempt_income > 0
              ? `${formatCurrency(finance.total_exempt_income, "ILS")} ${t("finance.exemptIncome")}`
              : undefined
          }
        />
        <AdminMetricCard
          title={t("finance.totalExpenses")}
          tooltip={t("finance.tooltips.totalExpenses")}
          value={formatCurrency(finance.total_expenses, "ILS")}
          icon={TrendingDown}
          subtitle={
            finance.total_recognized_expenses > 0
              ? `${formatCurrency(finance.total_recognized_expenses, "ILS")} ${t("finance.recognizedExpenses")}`
              : undefined
          }
        />
        <AdminMetricCard
          title={t("finance.totalDonations")}
          tooltip={t("finance.tooltips.totalDonations")}
          value={formatCurrency(finance.total_donations, "ILS")}
          icon={Heart}
          subtitle={
            finance.total_non_tithe_donation > 0
              ? `${formatCurrency(finance.total_non_tithe_donation, "ILS")} ${t("finance.nonTitheDonation")}`
              : undefined
          }
        />
      </div>

      {Object.keys(finance.by_currency).length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>{t("finance.byCurrency")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(finance.by_currency)
                .sort(([currencyA], [currencyB]) => {
                  if (currencyA === "ILS") return -1;
                  if (currencyB === "ILS") return 1;
                  if (currencyA === "USD") return -1;
                  if (currencyB === "USD") return 1;
                  return currencyA.localeCompare(currencyB);
                })
                .map(([currency, amounts]) => (
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
                          {formatCurrency(amounts.income, currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {t("finance.expenses")}:{" "}
                        </span>
                        <span className="font-medium tabular-nums">
                          {formatCurrency(amounts.expenses, currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {t("finance.donations")}:{" "}
                        </span>
                        <span className="font-medium tabular-nums">
                          {formatCurrency(amounts.donations, currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {t("finance.total")}:{" "}
                        </span>
                        <span className="font-bold tabular-nums">
                          {formatCurrency(amounts.total_managed, currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
