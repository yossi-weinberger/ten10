import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Info, ScrollText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MaaserYearSummary } from "@/lib/analytics/maaser-year-summary";
import { useDisplayDate } from "@/lib/calendar/use-display-date";
import { formatHebrewYear } from "@/lib/halacha/hebrew-numeral";
import { isMaaserYearCloseWindow } from "@/lib/calendar";
import { formatCurrency } from "@/lib/utils/currency";
import { getCurrentLocalDate } from "@/lib/utils/local-date";
import type { CurrencyCode } from "@/lib/currencies";

interface MaaserYearSummaryCardProps {
  summary: MaaserYearSummary;
  isLoading: boolean;
  error: string | null;
  canGoNext: boolean;
  onPreviousYear: () => void;
  onNextYear: () => void;
  currency: CurrencyCode;
}

function formatRangeDate(
  isoDate: string,
  formatDisplayDate: ReturnType<typeof useDisplayDate>,
): string {
  const displayDate = formatDisplayDate(isoDate, "short");
  return displayDate.secondary
    ? `${displayDate.primary} (${displayDate.secondary})`
    : displayDate.primary;
}

function StatCell({
  label,
  value,
  tooltip,
  tone = "default",
}: {
  label: string;
  value: string;
  tooltip?: string;
  tone?: "default" | "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "text-primary"
      : tone === "negative"
        ? "text-destructive"
        : "text-foreground";

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <div className="mb-1 flex items-center gap-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        {tooltip ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground" type="button">
                  <Info className="h-3 w-3" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>
      <p className={`text-lg font-semibold tracking-tight ${toneClass}`}>{value}</p>
    </div>
  );
}

export function MaaserYearSummaryCard({
  summary,
  isLoading,
  error,
  canGoNext,
  onPreviousYear,
  onNextYear,
  currency,
}: MaaserYearSummaryCardProps) {
  const { t, i18n } = useTranslation("dashboard");
  const formatDisplayDate = useDisplayDate();
  const today = getCurrentLocalDate();
  const showCloseBanner =
    summary.isCurrentYear && isMaaserYearCloseWindow(today);
  const money = (value: number) =>
    formatCurrency(value, currency, i18n.language);
  const yearLabel =
    i18n.language.startsWith("he")
      ? formatHebrewYear(summary.range.hebrewYear)
      : String(summary.range.hebrewYear);
  const deltaTone =
    summary.yearDelta.total_balance > 0.005
      ? "negative"
      : summary.yearDelta.total_balance < -0.005
        ? "positive"
        : "default";

  return (
    <Card className="bg-gradient-to-br from-background to-muted/20" dir={i18n.dir()}>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 pb-3">
        <div className="grid gap-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <ScrollText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {t("analytics.maaserYear.title")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {t("analytics.maaserYear.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={onPreviousYear}
            aria-label={t("analytics.maaserYear.previousYear")}
          >
            {i18n.dir() === "rtl" ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
          <p className="min-w-20 text-center text-sm font-semibold">{yearLabel}</p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={onNextYear}
            disabled={!canGoNext}
            aria-label={t("analytics.maaserYear.nextYear")}
          >
            {i18n.dir() === "rtl" ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-xs text-muted-foreground">
          {formatRangeDate(summary.range.startDate, formatDisplayDate)}
          {" – "}
          {formatRangeDate(summary.reportEndDate, formatDisplayDate)}
        </p>
        {showCloseBanner ? (
          <p className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-50">
            {t("analytics.maaserYear.closeBanner")}
          </p>
        ) : null}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-[68px] rounded-md" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{t("analytics.maaserYear.error")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            <StatCell
              label={t("analytics.maaserYear.opening")}
              value={money(summary.opening.total_balance)}
              tooltip={t("analytics.maaserYear.openingTooltip")}
            />
            <StatCell
              label={t("analytics.maaserYear.closing")}
              value={money(summary.closing.total_balance)}
              tooltip={t("analytics.maaserYear.closingTooltip")}
            />
            <StatCell
              label={t("analytics.maaserYear.yearChange")}
              value={money(summary.yearDelta.total_balance)}
              tooltip={t("analytics.maaserYear.yearChangeTooltip")}
              tone={deltaTone}
            />
            <StatCell
              label={t("analytics.maaserYear.income")}
              value={money(summary.incomeInRange)}
            />
            <StatCell
              label={t("analytics.maaserYear.estimatedMaaser")}
              value={money(summary.estimatedMaaserFromIncome)}
              tooltip={t("analytics.maaserYear.estimatedMaaserTooltip")}
            />
            <StatCell
              label={t("analytics.maaserYear.donations")}
              value={money(summary.donationsInRange)}
            />
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          {t("analytics.maaserYear.balanceUnchangedNote")}
        </p>
      </CardContent>
    </Card>
  );
}
