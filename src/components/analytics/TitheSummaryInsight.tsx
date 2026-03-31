import CountUp from "react-countup";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDonationStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils/currency";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { Scale } from "lucide-react";
import { KpiGridSkeleton } from "./AnalyticsSkeleton";

interface TitheSummaryInsightProps {
  serverTitheBalance: number | null | undefined;
  serverMaaserBalance: number | null | undefined;
  serverChomeshBalance: number | null | undefined;
  serverTotalIncome: number | null | undefined;
  serverTotalDonations: number | null | undefined;
  serverNonTitheDonations: number | null | undefined;
  isLoading: boolean;
  error: string | null;
}

interface AnimatedAmountProps {
  value: number;
  isLoading: boolean;
  defaultCurrency: string;
  language: string;
  colorClass: string;
}

function AnimatedAmount({ value, isLoading, defaultCurrency, language, colorClass }: AnimatedAmountProps) {
  const { displayValue, startAnimateValue } = useAnimatedCounter({ serverValue: value, isLoading });
  return (
    <p className={`text-lg sm:text-xl font-bold ${colorClass}`}>
      <CountUp
        start={startAnimateValue}
        end={displayValue}
        duration={0.75}
        decimals={2}
        formattingFn={(v) => formatCurrency(v, defaultCurrency, language)}
      />
    </p>
  );
}

export function TitheSummaryInsight({
  serverTitheBalance,
  serverMaaserBalance,
  serverChomeshBalance,
  serverTotalIncome,
  serverTotalDonations,
  serverNonTitheDonations,
  isLoading,
  error,
}: TitheSummaryInsightProps) {
  const { t, i18n } = useTranslation("dashboard");
  const defaultCurrency = useDonationStore((s) => s.settings.defaultCurrency);
  const trackChomeshSeparately = useDonationStore(
    (s) => s.settings.trackChomeshSeparately
  );

  const balance = serverTitheBalance ?? 0;
  const maaserBalance = serverMaaserBalance ?? 0;
  const chomeshBalance = serverChomeshBalance ?? 0;
  const totalDonations = serverTotalDonations ?? 0;
  const nonTitheDonations = serverNonTitheDonations ?? 0;
  const titheOnlyDonations = Math.max(0, totalDonations - nonTitheDonations);
  const totalIncome = serverTotalIncome ?? 0;
  const donationRate =
    totalIncome > 0 ? (totalDonations / totalIncome) * 100 : 0;

  const donationProgress = (() => {
    if (balance <= 0) return 100;
    const denom = titheOnlyDonations + Math.max(0, balance);
    if (denom === 0) return 0;
    return Math.min(100, Math.max(0, (titheOnlyDonations / denom) * 100));
  })();

  const isInitialLoad = isLoading && serverTitheBalance == null;

  return (
    <Card dir={i18n.dir()} className="bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Scale className="h-4 w-4 shrink-0 text-blue-500" />
          {t("analytics.tithe.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {isInitialLoad ? (
          <div className="space-y-4">
            <KpiGridSkeleton count={3} className="grid-cols-3" />
            <div className="space-y-2">
              <div className="h-2 rounded-full bg-muted" />
            </div>
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{t("analytics.error")}</p>
        ) : (
          <div className="space-y-4">
            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-card p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  {t("analytics.tithe.balance")}
                </p>
                <AnimatedAmount
                  value={balance}
                  isLoading={isLoading}
                  defaultCurrency={defaultCurrency}
                  language={i18n.language}
                  colorClass={balance > 0 ? "text-destructive" : "text-green-500"}
                />
              </div>

              {trackChomeshSeparately ? (
                <>
                  <div className="rounded-lg border border-border bg-card p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("analytics.tithe.maaser")}
                    </p>
                    <AnimatedAmount
                      value={maaserBalance}
                      isLoading={isLoading}
                      defaultCurrency={defaultCurrency}
                      language={i18n.language}
                      colorClass={maaserBalance > 0 ? "text-destructive" : "text-green-500"}
                    />
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("analytics.tithe.chomesh")}
                    </p>
                    <AnimatedAmount
                      value={chomeshBalance}
                      isLoading={isLoading}
                      defaultCurrency={defaultCurrency}
                      language={i18n.language}
                      colorClass={chomeshBalance > 0 ? "text-destructive" : "text-green-500"}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-lg border border-border bg-card p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("analytics.tithe.titheOnlyDonations")}
                    </p>
                    <AnimatedAmount
                      value={titheOnlyDonations}
                      isLoading={isLoading}
                      defaultCurrency={defaultCurrency}
                      language={i18n.language}
                      colorClass="text-yellow-500"
                    />
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("analytics.tithe.donationRate")}
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-blue-500">
                      {donationRate.toFixed(1)}%
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground" dir={i18n.dir()}>
                <span>
                  {balance < 0
                    ? t("analytics.tithe.goalExceeded", { amount: formatCurrency(Math.abs(balance), defaultCurrency, i18n.language) })
                    : balance === 0
                    ? t("analytics.tithe.goalReached")
                    : t("analytics.tithe.goalProgress", {
                        percentage: donationProgress.toFixed(1),
                      })}
                </span>
                <span className="font-semibold text-blue-500">
                  {donationProgress.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-sky-400 transition-all duration-700"
                  style={{ width: `${Math.min(donationProgress, 100)}%` }}
                />
              </div>
            </div>

            {/* Donation breakdown row */}
            {totalDonations > 0 && (
              <div
                className="grid grid-cols-2 gap-2 text-xs text-muted-foreground"
                dir={i18n.dir()}
              >
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">
                    {formatCurrency(titheOnlyDonations, defaultCurrency, i18n.language)}
                  </span>
                  <span>{t("analytics.tithe.titheOnlyDonations")}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">
                    {formatCurrency(nonTitheDonations, defaultCurrency, i18n.language)}
                  </span>
                  <span>{t("analytics.tithe.personalDonations")}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
