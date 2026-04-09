import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatform } from "@/contexts/PlatformContext";
import { useDateControls, DateRangeSelectionType } from "@/hooks/useDateControls";
import { useInsights } from "@/hooks/useInsights";
import { getPreviousPeriodRange } from "@/lib/utils/date-range";
import { useServerStats } from "@/hooks/useServerStats";
import { usePeriodComparison } from "@/hooks/usePeriodComparison";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Calendar as CalendarIcon, Download } from "lucide-react";
import { CategoryBreakdownChart } from "@/components/analytics/CategoryBreakdownChart";
import { RecurringForecastInsight } from "@/components/analytics/RecurringForecastInsight";
import { PaymentMethodInsight } from "@/components/analytics/PaymentMethodInsight";
import { RecurringRatioInsight } from "@/components/analytics/RecurringRatioInsight";
import { DonationRecipientsInsight } from "@/components/analytics/DonationRecipientsInsight";
import { InsightsSummaryRow } from "@/components/analytics/InsightsSummaryRow";
import { TextInsightsCard } from "@/components/analytics/TextInsightsCard";
import { TransactionHeatmap } from "@/components/analytics/TransactionHeatmap";
import { format } from "date-fns";
import { he, enUS } from "date-fns/locale";
import { formatHebrewDate } from "@/lib/utils/hebrew-date";
import { useDonationStore } from "@/lib/store";
import { generateAnalyticsPdf, computeRecurringTotals } from "@/lib/analytics/export-pdf";
import { formatCurrency } from "@/lib/utils/currency";
import { formatCategory } from "@/lib/category-registry";

export function AnalyticsPage() {
  const { t, i18n } = useTranslation("dashboard");
  const { user } = useAuth();
  const { platform } = usePlatform();
  const settings = useDonationStore((s) => s.settings);
  const defaultCurrency = useDonationStore((s) => s.settings.defaultCurrency);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const {
    dateRangeSelection,
    setDateRangeSelection,
    activeDateRangeObject,
    dateRangeLabels,
    customDateRange,
    setCustomDateRange,
  } = useDateControls();

  const {
    serverTotalIncome,
    isLoadingServerIncome,
    serverTotalExpenses,
    isLoadingServerExpenses,
    serverCalculatedDonationsData,
  } = useServerStats(activeDateRangeObject, user, platform);

  const {
    prevIncome,
    prevExpenses,
    isLoading: isLoadingPeriodComparison,
  } = usePeriodComparison(activeDateRangeObject, user, platform);

  const prevPeriodDates = useMemo(() => {
    const { startDate, endDate } = activeDateRangeObject;
    if (!startDate || !endDate || startDate === "1970-01-01") return null;
    return getPreviousPeriodRange(startDate, endDate);
  }, [activeDateRangeObject]);

  const {
    categoryData,
    isLoadingCategory,
    categoryError,
    categoryType,
    setCategoryType,
    expenseCategoryTop,
    incomeCategoryTop,
    activeRecurring,
    isLoadingRecurring,
    recurringError,
    paymentMethodData,
    isLoadingPaymentMethod,
    paymentMethodError,
    recurringVsOnetimeData,
    isLoadingRecurringRatio,
    recurringRatioError,
    recipientsData,
    isLoadingRecipients,
    recipientsError,
    heatmapData,
    isLoadingHeatmap,
    heatmapError,
    heatmapTypeGroup,
    setHeatmapTypeGroup,
  } = useInsights(activeDateRangeObject, platform);

  const formatDate = useCallback(
    (date: Date) => {
      if (settings.calendarType === "hebrew") return formatHebrewDate(date);
      const locale = i18n.language === "he" ? he : enUS;
      return format(date, "dd/MM/yyyy", { locale });
    },
    [settings.calendarType, i18n.language]
  );

  const isAllTime = activeDateRangeObject.startDate === "1970-01-01";

  const recurringTotals = useMemo(
    () => computeRecurringTotals(activeRecurring),
    [activeRecurring]
  );

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const fmtDatePdf = (iso: string) => {
        const p = iso.split("-");
        return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].slice(2)}` : iso;
      };
      const displayRange = isAllTime
        ? t("dateRange.all")
        : `${fmtDatePdf(activeDateRangeObject.startDate)} – ${fmtDatePdf(activeDateRangeObject.endDate)}`;

      // Build text insights for PDF
      const fmt = (v: number) => formatCurrency(v, defaultCurrency, i18n.language);
      const income = serverTotalIncome ?? 0;
      const expenses = serverTotalExpenses ?? 0;
      const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : null;
      const pdfInsights: string[] = [];
      if (savingsRate !== null) {
        if (savingsRate >= 20) pdfInsights.push(t("analytics.insights.savingsGood", { percentage: savingsRate.toFixed(1) }));
        else if (savingsRate < 0) pdfInsights.push(t("analytics.insights.savingsNegative", { amount: fmt(expenses - income) }));
        else pdfInsights.push(t("analytics.insights.savingsOk", { percentage: savingsRate.toFixed(1) }));
      }
      // Top expense category
      if (expenseCategoryTop && expenseCategoryTop.total_amount > 0 && expenses > 0) {
        const catPct = (expenseCategoryTop.total_amount / expenses) * 100;
        const catLabel = formatCategory("expense", expenseCategoryTop.category, i18n.language) || t("analytics.categories.other");
        pdfInsights.push(t("analytics.insights.topCategoryExpense", { category: catLabel, percentage: catPct.toFixed(0), amount: fmt(expenseCategoryTop.total_amount) }));
      }
      // Top income category
      if (incomeCategoryTop && incomeCategoryTop.total_amount > 0 && income > 0) {
        const catPct = (incomeCategoryTop.total_amount / income) * 100;
        const catLabel = formatCategory("income", incomeCategoryTop.category, i18n.language) || t("analytics.categories.other");
        pdfInsights.push(t("analytics.insights.topCategoryIncome", { category: catLabel, percentage: catPct.toFixed(0), amount: fmt(incomeCategoryTop.total_amount) }));
      }
      if (!isAllTime && prevExpenses != null && prevExpenses > 0 && expenses > 0) {
        const expDelta = ((expenses - prevExpenses) / prevExpenses) * 100;
        if (Math.abs(expDelta) >= 10) {
          pdfInsights.push(expDelta > 0
            ? t("analytics.insights.expensesUp", { percentage: expDelta.toFixed(0) })
            : t("analytics.insights.expensesDown", { percentage: Math.abs(expDelta).toFixed(0) }));
        }
      }

      await generateAnalyticsPdf({
        categoryData,
        paymentMethodData,
        recipientsData,
        activeRecurring,
        recurringTotals,
        defaultCurrency,
        language: i18n.language,
        isRtl: i18n.language === "he",
        displayRange,
        t,
        toastSuccess: t("analytics.pdfExported"),
        toastExporting: t("analytics.pdfGenerating"),
        serverTotalIncome,
        serverTotalExpenses,
        prevIncome,
        textInsights: pdfInsights,
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="grid gap-6" dir={i18n.dir()}>
      {/* Page header */}
      <div className="grid gap-1">
        <h2 className="text-2xl font-bold text-foreground">
          {t("analytics.title")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("analytics.subtitle")}</p>
      </div>

      {/* Date range bar + PDF button — same row */}
      <div className="flex flex-wrap gap-2 items-center">
        {(Object.keys(dateRangeLabels) as DateRangeSelectionType[])
          .filter((k) => k !== "custom")
          .map((rangeKey) => (
            <Button
              key={rangeKey}
              variant={dateRangeSelection === rangeKey ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRangeSelection(rangeKey)}
              className={
                dateRangeSelection !== rangeKey
                  ? "bg-transparent text-foreground hover:bg-muted/50"
                  : ""
              }
            >
              {dateRangeLabels[rangeKey]}
            </Button>
          ))}
        <DatePickerWithRange
          date={customDateRange}
          onDateChange={(range) => {
            setCustomDateRange(range);
            if (range?.from && range?.to) setDateRangeSelection("custom");
          }}
          triggerButton={
            <Button
              variant={dateRangeSelection === "custom" ? "default" : "outline"}
              size="sm"
              className={`whitespace-nowrap flex-shrink-0 ${
                dateRangeSelection !== "custom"
                  ? "bg-transparent text-foreground hover:bg-muted/50"
                  : ""
              }`}
            >
              <CalendarIcon className="h-4 w-4 md:ms-2" />
              <span className="hidden md:inline">
                {customDateRange?.from && customDateRange?.to
                  ? `${formatDate(customDateRange.from)} – ${formatDate(customDateRange.to)}`
                  : dateRangeLabels.custom}
              </span>
            </Button>
          }
          className="w-auto"
        />
        {/* PDF export — end of same row */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPdf}
          disabled={isExportingPdf}
          className="ms-auto shrink-0 bg-transparent text-foreground hover:bg-muted/50"
        >
          {isExportingPdf ? (
            <span className="h-4 w-4 me-1 animate-spin inline-block border-2 border-current border-t-transparent rounded-full" />
          ) : (
            <Download className="h-4 w-4 me-1" />
          )}
          <span className="hidden sm:inline">
            {isExportingPdf ? t("analytics.pdfGenerating") : t("analytics.exportPdf")}
          </span>
        </Button>
      </div>

      {/* Row 1: Insights summary + Recurring Ratio side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="flex flex-col gap-4">
          <InsightsSummaryRow
            serverTotalIncome={serverTotalIncome}
            serverTotalExpenses={serverTotalExpenses}
            prevIncome={prevIncome}
            activeRecurring={activeRecurring}
            isLoading={isLoadingServerIncome || isLoadingServerExpenses}
            isAllTime={isAllTime}
            prevPeriodStart={prevPeriodDates?.startDate}
            prevPeriodEnd={prevPeriodDates?.endDate}
          />
          <TextInsightsCard
            serverTotalIncome={serverTotalIncome}
            serverTotalExpenses={serverTotalExpenses}
            prevIncome={prevIncome}
            prevExpenses={prevExpenses}
            activeRecurring={activeRecurring}
            categoryData={categoryData}
            isAllTime={isAllTime}
            expenseCategoryTop={expenseCategoryTop}
            incomeCategoryTop={incomeCategoryTop}
            isLoading={
              isLoadingServerIncome ||
              isLoadingServerExpenses ||
              isLoadingPeriodComparison ||
              isLoadingCategory ||
              isLoadingRecurring
            }
          />
        </div>
        <RecurringRatioInsight
          data={recurringVsOnetimeData}
          recurringExpenses={recurringTotals.expenses}
          totalExpenses={serverTotalExpenses}
          recurringIncome={recurringTotals.income}
          totalIncome={serverTotalIncome}
          recurringDonations={recurringTotals.donations}
          totalDonations={serverCalculatedDonationsData?.total_donations_amount ?? null}
          isLoading={isLoadingRecurringRatio || isLoadingServerIncome || isLoadingServerExpenses}
          error={recurringRatioError}
        />
      </div>

      {/* Row 2: Category + Payment Methods + Donation Recipients — 3 columns on xl */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
        <CategoryBreakdownChart
          data={categoryData}
          isLoading={isLoadingCategory}
          error={categoryError}
          categoryType={categoryType}
          onCategoryTypeChange={setCategoryType}
        />
        <PaymentMethodInsight
          data={paymentMethodData}
          isLoading={isLoadingPaymentMethod}
          error={paymentMethodError}
        />
        <DonationRecipientsInsight
          data={recipientsData}
          isLoading={isLoadingRecipients}
          error={recipientsError}
        />
      </div>

      {/* Row 3: Standing Orders + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <RecurringForecastInsight
          activeRecurring={activeRecurring}
          isLoading={isLoadingRecurring}
          error={recurringError}
        />
        <TransactionHeatmap
          data={heatmapData}
          isLoading={isLoadingHeatmap}
          error={heatmapError}
          typeGroup={heatmapTypeGroup}
          onTypeGroupChange={setHeatmapTypeGroup}
          className="h-full"
        />
      </div>
    </div>
  );
}
