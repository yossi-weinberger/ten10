import regularFontUrl from "/fonts/Rubik-Regular.ttf?url";
import mediumFontUrl from "/fonts/Rubik-Medium.ttf?url";
import { drawRtlText } from "@/lib/utils/pdf-helpers";
import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatform } from "@/contexts/PlatformContext";
import { useDateControls, DateRangeSelectionType } from "@/hooks/useDateControls";
import { useInsights, getPreviousPeriodRange } from "@/hooks/useInsights";
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
import { formatPaymentMethod } from "@/lib/payment-methods";
import { toast } from "sonner";

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

  const { prevIncome, prevExpenses } = usePeriodComparison(activeDateRangeObject, user, platform);

  // Compute previous period dates for tooltip display
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
  } = useInsights(activeDateRangeObject, user, platform);

  const formatDate = useCallback(
    (date: Date) => {
      if (settings.calendarType === "hebrew") return formatHebrewDate(date);
      const locale = i18n.language === "he" ? he : enUS;
      return format(date, "dd/MM/yyyy", { locale });
    },
    [settings.calendarType, i18n.language]
  );

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const { toPng } = await import("html-to-image");
      const { PDFDocument, rgb } = await import("pdf-lib");
      const fontkit = (await import("@pdf-lib/fontkit")).default;
      const { formatCurrency } = await import("@/lib/utils/currency");

      // Helper: capture a DOM element by ID as PNG (double-call primes SVG cache)
      const captureChart = async (id: string): Promise<string | null> => {
        const el = document.getElementById(id);
        if (!el) return null;
        const opts = { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true };
        await toPng(el, opts).catch(() => {});
        return toPng(el, opts).catch(() => null);
      };

      // Capture all chart elements before building PDF
      const [catPng, paymentPng, heatmapPng, donationsPng] = await Promise.all([
        captureChart("pdf-chart-categories"),
        captureChart("pdf-chart-payment"),
        captureChart("pdf-chart-heatmap"),
        captureChart("pdf-chart-donations"),
      ]);

      const [regularFontBytes, mediumFontBytes] = await Promise.all([
        fetch(regularFontUrl).then((r) => r.arrayBuffer()),
        fetch(mediumFontUrl).then((r) => r.arrayBuffer()),
      ]);

      const pdfDoc = await PDFDocument.create();
      pdfDoc.registerFontkit(fontkit);
      const regularFont = await pdfDoc.embedFont(regularFontBytes);
      const boldFont = await pdfDoc.embedFont(mediumFontBytes);

      const [catImg, paymentImg, heatmapImg, donationsImg] = await Promise.all([
        catPng ? pdfDoc.embedPng(catPng).catch(() => null) : null,
        paymentPng ? pdfDoc.embedPng(paymentPng).catch(() => null) : null,
        heatmapPng ? pdfDoc.embedPng(heatmapPng).catch(() => null) : null,
        donationsPng ? pdfDoc.embedPng(donationsPng).catch(() => null) : null,
      ]);

      let logoImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
      try {
        const logoBytes = await fetch("/logo/logo-wide.png").then((r) => r.arrayBuffer());
        logoImage = await pdfDoc.embedPng(logoBytes);
      } catch { /* logo optional */ }

      const isRtl = i18n.language === "he";
      const margin = 40;
      const fmt = (v: number) => formatCurrency(v, defaultCurrency, i18n.language);
      const primaryColor = rgb(0.07, 0.4, 0.42);
      const textColor = rgb(0, 0, 0);
      const mutedColor = rgb(0.4, 0.4, 0.4);

      // Use object wrapper so closures always read the latest page/y/width/height
      const state = {
        page: pdfDoc.addPage(),
        y: 0,
        width: 0,
        height: 0,
      };
      ({ width: state.width, height: state.height } = state.page.getSize());
      state.y = state.height - margin - 10;

      const rightEdge = () => state.width - margin;
      const contentWidth = () => state.width - 2 * margin;

      const ensureSpace = (needed: number) => {
        if (state.y < margin + needed) {
          state.page = pdfDoc.addPage();
          ({ width: state.width, height: state.height } = state.page.getSize());
          state.y = state.height - margin - 10;
        }
      };

      // RTL-aware line drawing using shared pdf-helpers (handles comma-separated numbers)
      const drawLine = (text: string, yPos: number, size = 10, font = regularFont, color = textColor) => {
        if (isRtl) drawRtlText(state.page, text, rightEdge(), yPos, font, size, color);
        else state.page.drawText(text, { x: margin, y: yPos, font, size, color });
      };

      const drawChartImageFull = (img: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null, imgHeight: number) => {
        if (!img) return;
        ensureSpace(imgHeight + 10);
        const cw = contentWidth();
        const aspectRatio = img.width / img.height;
        const drawH = Math.min(imgHeight, cw / aspectRatio);
        const x = isRtl ? rightEdge() - cw : margin;
        state.page.drawImage(img, { x, y: state.y - drawH, width: cw, height: drawH });
        state.y -= drawH + 8;
      };

      // Draw section: text list on one side, chart image on the other (side by side)
      const drawSectionWithChart = (
        title: string,
        lines: string[],
        img: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null,
        imgHeight: number
      ) => {
        ensureSpace(imgHeight + 20);
        drawLine(title, state.y, 12, boldFont, primaryColor);
        state.y -= 16;

        if (img && lines.length > 0) {
          // Side-by-side layout: text column + chart column
          const cw = contentWidth();
          const halfW = (cw - 8) / 2;
          const aspectRatio = img.width / img.height;
          const drawH = Math.min(imgHeight, halfW / aspectRatio);
          const sectionTop = state.y;

          // Text column
          const textX = isRtl ? rightEdge() : margin;
          lines.forEach((line, i) => {
            const lineY = sectionTop - i * 11;
            if (isRtl) drawRtlText(state.page, line, textX, lineY, regularFont, 8, textColor);
            else state.page.drawText(line, { x: textX, y: lineY, font: regularFont, size: 8, color: textColor });
          });

          // Chart image on opposite side
          const imgX = isRtl ? margin : margin + halfW + 8;
          state.page.drawImage(img, { x: imgX, y: sectionTop - drawH, width: halfW, height: drawH });

          state.y -= Math.max(lines.length * 11, drawH) + 8;
        } else {
          // No image: just text, then full-width chart
          lines.forEach((line) => {
            drawLine(line, state.y, 9);
            state.y -= 12;
          });
          state.y -= 4;
          drawChartImageFull(img, imgHeight);
          state.y -= 4;
        }
      };

      const displayRange =
        activeDateRangeObject.startDate === "1970-01-01"
          ? t("dateRange.all")
          : `${activeDateRangeObject.startDate} – ${activeDateRangeObject.endDate}`;

      // Logo
      if (logoImage) {
        const logoH = 22;
        const logoW = Math.min(120, logoH * (logoImage.width / logoImage.height));
        const logoX = isRtl ? margin : rightEdge() - logoW;
        state.page.drawImage(logoImage, { x: logoX, y: state.y - logoH + 10, width: logoW, height: logoH });
      }

      // Title + date range
      drawLine(t("analytics.title"), state.y, 18, boldFont, primaryColor);
      state.y -= 28;
      drawLine(displayRange, state.y, 9, regularFont, mutedColor);
      state.y -= 24;

      // Section: Category breakdown — list + chart side by side
      if (categoryData.length > 0) {
        const catLines = categoryData.slice(0, 7).map((item) => {
          const label = item.category === "other" ? t("analytics.categories.other") : item.category;
          return `${label}: ${fmt(item.total_amount)}`;
        });
        drawSectionWithChart(t("analytics.categories.title"), catLines, catImg, 140);
      }

      // Section: Payment methods — list + chart side by side
      if (paymentMethodData.length > 0) {
        const payLines = paymentMethodData.slice(0, 6).map((item) => {
          const label = formatPaymentMethod(item.payment_method, i18n.language, t("analytics.paymentMethods.other"));
          return `${label}: ${fmt(item.total_amount)}`;
        });
        drawSectionWithChart(t("analytics.paymentMethods.title"), payLines, paymentImg, 120);
      }

      // Section: Donation recipients — list + chart side by side
      if (recipientsData.length > 0) {
        const donLines = recipientsData.slice(0, 7).map((item) => {
          const label = item.recipient === "other" ? t("analytics.recipients.other") : item.recipient;
          return `${label}: ${fmt(item.total_amount)}`;
        });
        drawSectionWithChart(t("analytics.recipients.title"), donLines, donationsImg, 120);
      }

      // Section: Standing orders (text only)
      if (activeRecurring.length > 0) {
        ensureSpace(40);
        drawLine(t("analytics.forecast.title"), state.y, 12, boldFont, primaryColor);
        state.y -= 16;
        const incomeTotal = activeRecurring.filter(r => ["income","exempt-income"].includes(r.type)).reduce((s,r) => s+r.amount, 0);
        const expenseTotal = activeRecurring.filter(r => ["expense","recognized-expense"].includes(r.type)).reduce((s,r) => s+r.amount, 0);
        if (incomeTotal > 0) { drawLine(`${t("analytics.forecast.recurringIncome")}: ${fmt(incomeTotal)}`, state.y, 9); state.y -= 12; }
        if (expenseTotal > 0) { drawLine(`${t("analytics.forecast.recurringExpenses")}: ${fmt(expenseTotal)}`, state.y, 9); state.y -= 12; }
        state.y -= 4;
      }

      // Section: Heatmap (full width)
      if (heatmapImg) {
        ensureSpace(40);
        drawLine(t("analytics.heatmap.title"), state.y, 12, boldFont, primaryColor);
        state.y -= 16;
        drawChartImageFull(heatmapImg, 90);
      }

      // Footer: page numbers on every page
      const allPages = pdfDoc.getPages();
      allPages.forEach((p, i) => {
        const pageText = `${i + 1} / ${allPages.length}`;
        const tw = regularFont.widthOfTextAtSize(pageText, 8);
        p.drawText(pageText, { x: state.width / 2 - tw / 2, y: margin / 2, font: regularFont, size: 8, color: mutedColor });
      });

      const pdfBytes = await pdfDoc.save();
      const filename = `ten10-analytics-${activeDateRangeObject.endDate}.pdf`;
      const isDesktop = !!(window as any).__TAURI_INTERNALS__;

      if (isDesktop) {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeFile } = await import("@tauri-apps/plugin-fs");
        const savePath = await save({
          defaultPath: filename,
          filters: [{ name: "PDF", extensions: ["pdf"] }],
        });
        if (savePath) {
          await writeFile(savePath, pdfBytes);
          toast.success(t("analytics.pdfExported"));
        }
      } else {
        const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        toast.success(t("analytics.pdfExported"));
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  const isAllTime = activeDateRangeObject.startDate === "1970-01-01";

  const recurringTotals = useMemo(() => ({
    expenses: activeRecurring.filter(r => ["expense","recognized-expense"].includes(r.type)).reduce((s,r) => s + r.amount, 0),
    income:   activeRecurring.filter(r => ["income","exempt-income"].includes(r.type)).reduce((s,r) => s + r.amount, 0),
    donations:activeRecurring.filter(r => ["donation","non_tithe_donation"].includes(r.type)).reduce((s,r) => s + r.amount, 0),
  }), [activeRecurring]);

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

      {/* Insights summary + Heatmap — side by side on large screens, equal height */}
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
            isLoading={isLoadingServerIncome || isLoadingServerExpenses}
          />
        </div>
        <TransactionHeatmap
          data={heatmapData}
          isLoading={isLoadingHeatmap}
          error={heatmapError}
          typeGroup={heatmapTypeGroup}
          onTypeGroupChange={setHeatmapTypeGroup}
          className="h-full"
        />
      </div>

      {/* Category + Payment Methods — side by side, equal height */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
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
      </div>

      {/* Standing Orders + Recurring Ratio + Donation Recipients — 3 columns on xl, equal height */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
        <RecurringForecastInsight
          activeRecurring={activeRecurring}
          isLoading={isLoadingRecurring}
          error={recurringError}
        />
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
        <DonationRecipientsInsight
          data={recipientsData}
          isLoading={isLoadingRecipients}
          error={recipientsError}
        />
      </div>
    </div>
  );
}
