import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Heart, DollarSign } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AdminFinanceStats } from "@/lib/data-layer/admin.service";
import { StatCard } from "@/components/dashboard/StatCards/StatCard";

interface AdminFinanceSectionProps {
  finance: AdminFinanceStats;
}

export function AdminFinanceSection({ finance }: AdminFinanceSectionProps) {
  const { t, i18n } = useTranslation("admin");

  const formatCurrency = (amount: number, currency: string = "ILS") => {
    const locale = i18n.language === "he" ? "he-IL" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalManaged =
    finance.total_income + finance.total_expenses + finance.total_donations;

  // Calculate percentages for exceptions
  const exemptIncomePercentage =
    finance.total_income > 0
      ? ((finance.total_exempt_income / finance.total_income) * 100).toFixed(1)
      : "0.0";

  const recognizedExpensesPercentage =
    finance.total_expenses > 0
      ? (
          (finance.total_recognized_expenses / finance.total_expenses) *
          100
        ).toFixed(1)
      : "0.0";

  const nonTitheDonationPercentage =
    finance.total_donations > 0
      ? (
          (finance.total_non_tithe_donation / finance.total_donations) *
          100
        ).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-4" dir={i18n.dir()}>
      <h2 className="text-2xl font-semibold flex items-center gap-2">
        <DollarSign className="h-6 w-6" />
        {t("finance.title")}
      </h2>

      {/* Total Managed - Highlighted Card */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
        <CardHeader className="text-center">
          <CardTitle className="text-xl sm:text-2xl">
            {t("finance.totalManaged")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-green-700 dark:text-green-400">
            {formatCurrency(totalManaged)}
          </div>
        </CardContent>
      </Card>

      {/* Main Categories using StatCard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Income */}
        <StatCard
          title={t("finance.totalIncome")}
          value={finance.total_income}
          isLoading={false}
          error={null}
          icon={TrendingUp}
          titleIcon={TrendingUp}
          colorScheme="green"
          subtitleContent={
            finance.total_exempt_income > 0 ? (
              <span className="text-xs text-muted-foreground">
                {formatCurrency(finance.total_exempt_income)}{" "}
                {t("finance.exemptIncome")} ({exemptIncomePercentage}%)
              </span>
            ) : null
          }
        />

        {/* Total Expenses */}
        <StatCard
          title={t("finance.totalExpenses")}
          value={finance.total_expenses}
          isLoading={false}
          error={null}
          icon={TrendingDown}
          titleIcon={TrendingDown}
          colorScheme="red"
          subtitleContent={
            finance.total_recognized_expenses > 0 ? (
              <span className="text-xs text-muted-foreground">
                {formatCurrency(finance.total_recognized_expenses)}{" "}
                {t("finance.recognizedExpenses")} (
                {recognizedExpensesPercentage}%)
              </span>
            ) : null
          }
        />

        {/* Total Donations */}
        <StatCard
          title={t("finance.totalDonations")}
          value={finance.total_donations}
          isLoading={false}
          error={null}
          icon={Heart}
          titleIcon={Heart}
          colorScheme="yellow"
          subtitleContent={
            finance.total_non_tithe_donation > 0 ? (
              <span className="text-xs text-muted-foreground">
                {formatCurrency(finance.total_non_tithe_donation)}{" "}
                {t("finance.nonTitheDonation")} ({nonTitheDonationPercentage}%)
              </span>
            ) : null
          }
        />
      </div>

      {/* By Currency - Detailed Breakdown */}
      {Object.keys(finance.by_currency).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("finance.byCurrency")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(finance.by_currency)
                .sort(([currencyA], [currencyB]) => {
                  // Sort: ILS first, then USD, then others alphabetically
                  if (currencyA === "ILS") return -1;
                  if (currencyB === "ILS") return 1;
                  if (currencyA === "USD") return -1;
                  if (currencyB === "USD") return 1;
                  return currencyA.localeCompare(currencyB);
                })
                .map(([currency, amounts]) => (
                  <div
                    key={currency}
                    className="border-b pb-4 last:border-b-0 dark:border-border"
                  >
                    <h3 className="font-semibold mb-2">{currency}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          {t("finance.income")}:{" "}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(amounts.income, currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {t("finance.expenses")}:{" "}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(amounts.expenses, currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {t("finance.donations")}:{" "}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(amounts.donations, currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {t("finance.total")}:{" "}
                        </span>
                        <span className="font-bold">
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
