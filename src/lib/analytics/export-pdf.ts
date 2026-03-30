import regularFontUrl from "/fonts/Rubik-Regular.ttf?url";
import mediumFontUrl from "/fonts/Rubik-Medium.ttf?url";
import { drawRtlText } from "@/lib/utils/pdf-helpers";
import { formatPaymentMethod } from "@/lib/payment-methods";
import { getPlatform } from "@/lib/platformManager";
import { CategoryBreakdownResponse } from "@/lib/data-layer/insights.service";
import { PaymentMethodBreakdownResponse } from "@/lib/data-layer/insights.service";
import { DonationRecipientsResponse } from "@/lib/data-layer/insights.service";
import { RecurringTransaction } from "@/types/transaction";
import { toast } from "sonner";

export interface AnalyticsPdfParams {
  categoryData: CategoryBreakdownResponse;
  paymentMethodData: PaymentMethodBreakdownResponse;
  recipientsData: DonationRecipientsResponse;
  activeRecurring: RecurringTransaction[];
  recurringTotals: { expenses: number; income: number; donations: number };
  defaultCurrency: string;
  language: string;
  isRtl: boolean;
  displayRange: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
  toastSuccess: string;
  toastExporting: string;
  serverTotalIncome?: number | null;
  serverTotalExpenses?: number | null;
  prevIncome?: number | null;
  textInsights?: string[];
}

async function captureChart(
  toPng: (el: HTMLElement, opts: object) => Promise<string>,
  id: string
): Promise<string | null> {
  const el = document.getElementById(id);
  if (!el) return null;
  const opts = { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true };
  await toPng(el, opts).catch(() => {});
  return toPng(el, opts).catch(() => null);
}

export async function generateAnalyticsPdf(params: AnalyticsPdfParams): Promise<void> {
  const {
    categoryData, paymentMethodData, recipientsData,
    activeRecurring, recurringTotals,
    defaultCurrency, language, isRtl, displayRange, t, toastSuccess,
    serverTotalIncome, serverTotalExpenses, prevIncome, textInsights,
  } = params;

  const totalIncome   = serverTotalIncome ?? 0;
  const totalExpenses = serverTotalExpenses ?? 0;
  const savingsRate   = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : null;
  const recurringPct  = totalExpenses > 0 && recurringTotals.expenses > 0
    ? (recurringTotals.expenses / totalExpenses) * 100 : null;
  const incomeDelta   = prevIncome != null && prevIncome > 0 && totalIncome > 0
    ? ((totalIncome - prevIncome) / prevIncome) * 100 : null;

  const { toPng }       = await import("html-to-image");
  const { PDFDocument, rgb } = await import("pdf-lib");
  const fontkit         = (await import("@pdf-lib/fontkit")).default;
  const { formatCurrency } = await import("@/lib/utils/currency");

  const [catPng, paymentPng, donationsPng] = await Promise.all([
    captureChart(toPng, "pdf-chart-categories"),
    captureChart(toPng, "pdf-chart-payment"),
    captureChart(toPng, "pdf-chart-donations"),
  ]);

  const [regularFontBytes, mediumFontBytes] = await Promise.all([
    fetch(regularFontUrl).then((r) => r.arrayBuffer()),
    fetch(mediumFontUrl).then((r) => r.arrayBuffer()),
  ]);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const regularFont = await pdfDoc.embedFont(regularFontBytes);
  const boldFont    = await pdfDoc.embedFont(mediumFontBytes);

  const [catImg, paymentImg, donationsImg] = await Promise.all([
    catPng     ? pdfDoc.embedPng(catPng).catch(() => null)     : null,
    paymentPng ? pdfDoc.embedPng(paymentPng).catch(() => null) : null,
    donationsPng ? pdfDoc.embedPng(donationsPng).catch(() => null) : null,
  ]);

  let logoImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
  try {
    logoImage = await pdfDoc.embedPng(
      await fetch("/logo/logo-wide.png").then((r) => r.arrayBuffer())
    );
  } catch { /* logo is optional */ }

  // ─── Colors ────────────────────────────────────────────────────────────────
  const primaryColor = rgb(0.07, 0.40, 0.42);
  const accentColor  = rgb(0.09, 0.52, 0.54);
  const textColor    = rgb(0.10, 0.10, 0.10);
  const mutedColor   = rgb(0.45, 0.45, 0.45);
  const borderColor  = rgb(0.82, 0.86, 0.88);
  const bgCard       = rgb(0.97, 0.98, 0.99);
  const bgHeader     = rgb(0.93, 0.97, 0.97);
  const whiteColor   = rgb(1, 1, 1);

  // ─── Page state ────────────────────────────────────────────────────────────
  const margin = 20;
  const fmt    = (v: number) => formatCurrency(v, defaultCurrency, language);

  const state = { page: pdfDoc.addPage(), y: 0, width: 0, height: 0 };
  ({ width: state.width, height: state.height } = state.page.getSize());
  state.y = state.height - margin - 8;

  const rightEdge    = () => state.width - margin;
  const contentWidth = () => state.width - 2 * margin;

  const ensureSpace = (needed: number) => {
    if (state.y < margin + needed + 30) {
      state.page = pdfDoc.addPage();
      ({ width: state.width, height: state.height } = state.page.getSize());
      state.y = state.height - margin - 8;
    }
  };

  // ─── Drawing helpers ───────────────────────────────────────────────────────

  const drawText = (
    text: string, yPos: number, size = 9, font = regularFont, color = textColor
  ) => {
    if (isRtl) drawRtlText(state.page, text, rightEdge(), yPos, font, size, color);
    else state.page.drawText(text, { x: margin, y: yPos, font, size, color });
  };

  const drawTextAt = (
    text: string, ltrX: number, y: number, size = 8,
    font = regularFont, color = textColor, rtlRight?: number
  ) => {
    if (isRtl && rtlRight !== undefined)
      drawRtlText(state.page, text, rtlRight, y, font, size, color);
    else
      state.page.drawText(text, { x: ltrX, y, font, size, color });
  };

  const drawBox = (x: number, y: number, w: number, h: number, filled = false) => {
    state.page.drawRectangle({
      x, y: y - h, width: w, height: h,
      color: filled ? bgCard : undefined,
      borderColor, borderWidth: 0.5,
    });
  };

  const drawDivider = (gap = 8) => {
    state.page.drawLine({
      start: { x: margin, y: state.y }, end: { x: rightEdge(), y: state.y },
      thickness: 0.4, color: borderColor,
    });
    state.y -= gap;
  };

  // Section title — text vertically centred in the tinted band
  const TITLE_H = 17;
  const drawSectionTitle = (title: string) => {
    ensureSpace(TITLE_H + 6);
    state.page.drawRectangle({
      x: margin, y: state.y - TITLE_H, width: contentWidth(), height: TITLE_H,
      color: bgHeader, borderColor: accentColor, borderWidth: 0.5,
    });
    // Baseline for 9pt text centred in TITLE_H band: centre - fontHeight/2 ≈ centre - 4.5
    const textBaseline = state.y - TITLE_H + (TITLE_H / 2) - 3;
    drawText(title, textBaseline, 9, boldFont, primaryColor);
    state.y -= TITLE_H + 6;
  };

  // Section with text list on one side and chart image on the other.
  // Aspect ratio is preserved by computing drawH from the actual inner image width.
  const drawSectionWithChart = (
    title: string,
    lines: string[],
    img: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null,
    maxImgH: number
  ) => {
    ensureSpace(maxImgH + TITLE_H + 20);
    drawSectionTitle(title);

    if (img && lines.length > 0) {
      const cw     = contentWidth();
      const halfW  = (cw - 8) / 2;
      const innerW = halfW - 8;               // available draw width inside the box
      const ar     = img.width / img.height;  // captured image aspect ratio

      // Compute (drawW, drawH) that fit in innerW × maxImgH while preserving AR.
      // Step 1: scale to fit width → compute resulting height.
      // Step 2: if height exceeds maxImgH, scale down by height → recompute width.
      let drawW = innerW;
      let drawH = innerW / ar;
      if (drawH > maxImgH) {
        drawH = maxImgH;
        drawW = maxImgH * ar;
        if (drawW > innerW) { drawW = innerW; drawH = innerW / ar; } // safety clamp
      }

      const lineH  = 10;
      const textH  = lines.length * lineH;
      const boxH   = Math.max(textH + 14, drawH + 10);
      const top    = state.y;

      // Text box — vertically centred
      const tBoxX  = isRtl ? margin + halfW + 8 : margin;
      drawBox(tBoxX, top + 2, halfW, boxH, true);
      const tPad   = Math.max(5, (boxH - textH) / 2);
      lines.forEach((line, i) => {
        const ly = top + 2 - tPad - i * lineH;
        drawTextAt(line, tBoxX + 6, ly, 8, regularFont, textColor, tBoxX + halfW - 6);
      });

      // Chart box — image centred both horizontally and vertically
      const iBoxX   = isRtl ? margin : margin + halfW + 8;
      drawBox(iBoxX, top + 2, halfW, boxH, true);
      const imgTopPad  = Math.max(4, (boxH - drawH) / 2);
      const imgLeftPad = Math.max(4, (innerW - drawW) / 2);  // centre if narrower than box
      state.page.drawImage(img, {
        x: iBoxX + 4 + imgLeftPad,
        y: top + 2 - imgTopPad - drawH,
        width: drawW,
        height: drawH,
      });

      state.y -= boxH + 10;
    } else {
      // No image — text only
      const lineH = 10;
      const textH = lines.length * lineH;
      const boxH  = textH + 14;
      drawBox(margin, state.y + 2, contentWidth(), boxH, true);
      const tPad  = Math.max(5, (boxH - textH) / 2);
      lines.forEach((line, i) => {
        drawText(line, state.y + 2 - tPad - i * lineH, 8);
      });
      state.y -= boxH + 10;
    }
  };

  // ─── HEADER — logo + title on same row, date range below ───────────────────

  const BAR_H    = 40;
  const logoH    = 22;
  const logoW    = logoImage ? Math.min(105, logoH * (logoImage.width / logoImage.height)) : 0;
  const logoPad  = 8;

  // Outer colored bar
  state.page.drawRectangle({
    x: margin, y: state.y - BAR_H + 4, width: contentWidth(), height: BAR_H,
    color: primaryColor,
  });

  // Logo: white rect inset so logo is visible regardless of logo color
  if (logoImage) {
    const lx = isRtl ? rightEdge() - logoW - logoPad : margin + logoPad;
    state.page.drawRectangle({
      x: lx - 4, y: state.y - BAR_H + 4, width: logoW + 8, height: BAR_H,
      color: whiteColor,
    });
    state.page.drawImage(logoImage, {
      x: lx, y: state.y - BAR_H + 4 + (BAR_H - logoH) / 2,
      width: logoW, height: logoH,
    });
  }

  // Title (bold white) — vertically centred on top half of bar
  const titleAreaLeft  = isRtl ? margin + logoPad         : margin + logoW + 2 * logoPad;
  const titleAreaRight = isRtl ? rightEdge() - logoW - 2 * logoPad : rightEdge() - logoPad;
  const titleY  = state.y - 11;
  const dateY   = state.y - 26;

  const titleText = t("analytics.title");
  if (isRtl) {
    drawRtlText(state.page, titleText,   titleAreaRight, titleY, boldFont,    13, whiteColor);
    drawRtlText(state.page, displayRange, titleAreaRight, dateY,  regularFont,  8, whiteColor);
  } else {
    state.page.drawText(titleText,   { x: titleAreaLeft, y: titleY, font: boldFont,    size: 13, color: whiteColor });
    state.page.drawText(displayRange, { x: titleAreaLeft, y: dateY,  font: regularFont, size:  8, color: whiteColor });
  }

  state.y -= BAR_H + 2;
  drawDivider(6);

  // ─── KPI CARDS ─────────────────────────────────────────────────────────────

  const kpiItems: { label: string; value: string }[] = [];
  if (savingsRate !== null) kpiItems.push({ label: t("analytics.insightsSummary.savingsRate"),  value: `${savingsRate.toFixed(1)}%` });
  if (recurringPct !== null) kpiItems.push({ label: t("analytics.insightsSummary.recurringPct"), value: `${recurringPct.toFixed(1)}%` });
  if (incomeDelta !== null) {
    const sign = incomeDelta >= 0 ? "+" : "";
    kpiItems.push({ label: t("analytics.insightsSummary.periodComparison"), value: `${sign}${incomeDelta.toFixed(1)}%` });
  }

  if (kpiItems.length > 0) {
    const gap   = 6;
    const cardW = (contentWidth() - (kpiItems.length - 1) * gap) / kpiItems.length;
    const cardH = 44;
    ensureSpace(cardH + 10);

    kpiItems.forEach((kpi, idx) => {
      const cx = isRtl
        ? rightEdge() - (idx + 1) * cardW - idx * gap
        : margin + idx * (cardW + gap);

      drawBox(cx, state.y + 2, cardW, cardH, true);
      // Accent top stripe
      state.page.drawRectangle({ x: cx, y: state.y + 2 - 3, width: cardW, height: 3, color: primaryColor });

      const labelY = state.y + 2 - 3 - (cardH - 3 - 22) / 2 - 6;
      const valueY = labelY - 13;
      drawTextAt(kpi.label, cx + 7, labelY, 7, regularFont, mutedColor, cx + cardW - 7);
      drawTextAt(kpi.value, cx + 7, valueY, 13, boldFont,   primaryColor, cx + cardW - 7);
    });

    state.y -= cardH + 10;
  }

  // ─── INSIGHTS ──────────────────────────────────────────────────────────────

  if (textInsights && textInsights.length > 0) {
    const lineH    = 11;
    const textH    = textInsights.length * lineH;
    const insightH = textH + 14;
    ensureSpace(insightH + TITLE_H + 8);
    drawSectionTitle(t("analytics.insights.title"));
    drawBox(margin, state.y + 2, contentWidth(), insightH, true);
    const tPad = Math.max(5, (insightH - textH) / 2);
    textInsights.forEach((insight, i) => {
      drawText(`• ${insight}`, state.y + 2 - tPad - i * lineH, 8);
    });
    state.y -= insightH + 10;
  }

  // ─── CATEGORY BREAKDOWN ────────────────────────────────────────────────────

  if (categoryData.length > 0) {
    const catLines = categoryData.slice(0, 7).map((item) => {
      const label = item.category === "other" ? t("analytics.categories.other") : item.category;
      return `${label}: ${fmt(item.total_amount)}`;
    });
    drawSectionWithChart(t("analytics.categories.title"), catLines, catImg, 100);
  }

  // ─── PAYMENT METHODS ───────────────────────────────────────────────────────

  if (paymentMethodData.length > 0) {
    const payLines = paymentMethodData.slice(0, 6).map((item) => {
      const label = formatPaymentMethod(item.payment_method, language, t("analytics.paymentMethods.other"));
      return `${label}: ${fmt(item.total_amount)}`;
    });
    drawSectionWithChart(t("analytics.paymentMethods.title"), payLines, paymentImg, 90);
  }

  // ─── DONATION RECIPIENTS ───────────────────────────────────────────────────

  if (recipientsData.length > 0) {
    const donLines = recipientsData.slice(0, 7).map((item) => {
      const label = item.recipient === "other" ? t("analytics.recipients.other") : item.recipient;
      return `${label}: ${fmt(item.total_amount)}`;
    });
    drawSectionWithChart(t("analytics.recipients.title"), donLines, donationsImg, 100);
  }

  // ─── STANDING ORDERS ───────────────────────────────────────────────────────

  const hasRecurring = activeRecurring.length > 0 &&
    (recurringTotals.income > 0 || recurringTotals.expenses > 0 || recurringTotals.donations > 0);

  if (hasRecurring) {
    const rows: { label: string; value: string }[] = [];
    if (recurringTotals.income > 0)    rows.push({ label: t("analytics.forecast.recurringIncome"),    value: fmt(recurringTotals.income) });
    if (recurringTotals.expenses > 0)  rows.push({ label: t("analytics.forecast.recurringExpenses"),  value: fmt(recurringTotals.expenses) });
    if (recurringTotals.donations > 0) rows.push({ label: t("statsCards.donations.title"),            value: fmt(recurringTotals.donations) });

    const lineH = 14;
    const boxH  = rows.length * lineH + 12;
    ensureSpace(boxH + TITLE_H + 10);
    drawSectionTitle(t("analytics.forecast.title"));
    drawBox(margin, state.y + 2, contentWidth(), boxH, true);
    const tPad = Math.max(5, (boxH - rows.length * lineH) / 2);
    rows.forEach((row, i) => {
      drawText(`${row.label}: ${row.value}`, state.y + 2 - tPad - i * lineH, 9);
    });
    state.y -= boxH + 10;
  }

  // ─── FOOTER ────────────────────────────────────────────────────────────────

  pdfDoc.getPages().forEach((p, i, all) => {
    const txt = `${i + 1} / ${all.length}`;
    const tw  = regularFont.widthOfTextAtSize(txt, 7);
    p.drawRectangle({ x: margin, y: 14, width: state.width - 2 * margin, height: 14, color: bgHeader });
    p.drawText(txt, { x: state.width / 2 - tw / 2, y: 19, font: regularFont, size: 7, color: mutedColor });
  });

  // ─── SAVE ──────────────────────────────────────────────────────────────────

  const pdfBytes = await pdfDoc.save();
  const today    = new Date().toISOString().split("T")[0];
  const filename = `ten10-analytics-${today}.pdf`;

  if (getPlatform() === "desktop") {
    const { save }      = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    const savePath = await save({ defaultPath: filename, filters: [{ name: "PDF", extensions: ["pdf"] }] });
    if (savePath) { await writeFile(savePath, pdfBytes); toast.success(toastSuccess); }
  } else {
    const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success(toastSuccess);
  }
}

export function computeRecurringTotals(activeRecurring: RecurringTransaction[]): {
  expenses: number; income: number; donations: number;
} {
  return {
    expenses:  activeRecurring.filter((r) => ["expense", "recognized-expense"].includes(r.type)).reduce((s, r) => s + r.amount, 0),
    income:    activeRecurring.filter((r) => ["income", "exempt-income"].includes(r.type)).reduce((s, r) => s + r.amount, 0),
    donations: activeRecurring.filter((r) => ["donation", "non_tithe_donation"].includes(r.type)).reduce((s, r) => s + r.amount, 0),
  };
}
