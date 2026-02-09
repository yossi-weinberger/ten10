import { PDFDocument, rgb, PDFFont, PDFPage, RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { Transaction, TransactionForTable } from "@/types/transaction";
import { format } from "date-fns";
import { formatCurrency } from "./currency";
import { typeBadgeColors } from "@/types/transactionLabels";
import i18n from "@/lib/i18n";
import { logger } from "@/lib/logger";
import { formatPaymentMethod } from "@/lib/payment-methods";

// Import fonts directly using Vite's ?url feature for robust path handling
import regularFontUrl from "/fonts/Rubik-Regular.ttf?url";
import mediumFontUrl from "/fonts/Rubik-Medium.ttf?url";

// Types for RTL text drawing
type TextSegment = {
  text: string;
  isNumber: boolean;
};

/**
 * Splits text into segments of Hebrew/text and numbers
 * Numbers include: digits, dates (with /), times (with :), decimals
 */
function splitTextSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  // Match number sequences including dates, times, and decimal numbers
  const regex = /(\d+(?:[\/:\.\-]\d+)*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the number
    if (match.index > lastIndex) {
      segments.push({
        text: text.substring(lastIndex, match.index),
        isNumber: false,
      });
    }
    // Add the number sequence
    segments.push({ text: match[0], isNumber: true });
    lastIndex = regex.lastIndex;
  }
  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({ text: text.substring(lastIndex), isNumber: false });
  }

  return segments;
}

/**
 * Draws RTL text with proper handling of embedded numbers
 * Numbers are drawn separately to prevent reversal
 * @param page - PDF page to draw on
 * @param text - Text to draw
 * @param rightX - Right edge X position (text will extend left from here)
 * @param y - Y position
 * @param font - Font to use
 * @param size - Font size
 * @param color - Text color
 */
function drawRtlText(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB
): void {
  const segments = splitTextSegments(text);

  // For RTL: reverse segment order so first logical segment appears at right
  const reversedSegments = [...segments].reverse();

  // Calculate total width first
  let totalWidth = 0;
  const segmentWidths: number[] = [];
  for (const seg of reversedSegments) {
    const width = font.widthOfTextAtSize(seg.text, size);
    segmentWidths.push(width);
    totalWidth += width;
  }

  // Start drawing from left edge (rightX - totalWidth)
  // Draw reversed segments left-to-right, so they appear in correct RTL visual order
  let currentX = rightX - totalWidth;

  for (let i = 0; i < reversedSegments.length; i++) {
    page.drawText(reversedSegments[i].text, {
      x: currentX,
      y: y,
      font: font,
      size: size,
      color: color,
    });
    currentX += segmentWidths[i];
  }
}

// Brand colors and layout constants
const COLORS = {
  // Brand: aligned to the app logo colors (see src/index.css)
  // Primary (logo teal): oklch(0.4686 0.0751 198.61)
  primary: rgb(0.07, 0.4, 0.42),
  // Accent (logo gold): oklch(0.8267 0.168963 90.4589)
  accent: rgb(0.94, 0.75, 0),
  // Light zebra background (kept neutral for readability)
  primaryLight: rgb(0.93, 0.98, 0.94),
  text: rgb(0, 0, 0), // Pure black for contrast
  textSecondary: rgb(0, 0, 0), // Pure black for better visibility
  border: rgb(0.7, 0.7, 0.7), // Darker border
  white: rgb(1, 1, 1),
};

const LAYOUT = {
  margin: 20,
  rowHeight: 28,
  headerHeight: 24,
  fontSize: {
    header: 9,
    cell: 8,
    title: 20,
    meta: 9,
  },
};

// Helper to convert Tailwind-like CSS color strings to pdf-lib's RGB format
function parseTailwindColor(colorString: string): {
  textColor: any;
  bgColor: any;
} {
  const colorMap: Record<string, any> = {
    "green-800": rgb(0.09, 0.34, 0.16),
    "red-800": rgb(0.6, 0.16, 0.16),
    "yellow-800": rgb(0.54, 0.35, 0.04),
    "blue-800": rgb(0.12, 0.3, 0.6),
    "rose-800": rgb(0.62, 0.15, 0.29),
    "orange-800": rgb(0.6, 0.28, 0.05),
    "green-100": rgb(0.93, 0.98, 0.94),
    "red-100": rgb(0.99, 0.94, 0.94),
    "yellow-100": rgb(0.99, 0.97, 0.91),
    "blue-100": rgb(0.93, 0.95, 0.99),
    "rose-100": rgb(0.99, 0.93, 0.95),
    "orange-100": rgb(0.99, 0.95, 0.91),
    "gray-800": rgb(0.12, 0.16, 0.22), // Approximate tailwind gray-800
    "gray-100": rgb(0.96, 0.97, 0.98), // Approximate tailwind gray-100
  };

  const textColorMatch = colorString.match(/text-([a-z]+)-(\d+)/);
  const bgColorMatch = colorString.match(/bg-([a-z]+)-(\d+)/);

  const textColorKey = textColorMatch
    ? `${textColorMatch[1]}-${textColorMatch[2]}`
    : null;
  const bgColorKey = bgColorMatch
    ? `${bgColorMatch[1]}-${bgColorMatch[2]}`
    : null;

  return {
    textColor: textColorKey ? colorMap[textColorKey] : COLORS.text,
    bgColor: bgColorKey ? colorMap[bgColorKey] : COLORS.white,
  };
}

// Helper function to download the PDF
function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as BlobPart], {
    type: "application/pdf",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

// Helper to manually draw a "Ballot Box with Check" using basic vectors
// This replaces unicode characters which are failing to render properly.
function drawSafeVectorCheckbox(
  page: PDFPage,
  x: number,
  y: number,
  size: number,
  color: RGB
) {
  // Use a slightly smaller box than the full cell height
  // Ignore size param to keep it fixed logic or use it if scaling needed
  // Using size for consistent scaling logic
  const boxSize = size * 0.8;

  // Center the box at (x, y)
  const boxX = x - boxSize / 2;
  const boxY = y - boxSize / 2;

  // 1. Draw the Box (Outline)
  page.drawRectangle({
    x: boxX,
    y: boxY,
    width: boxSize,
    height: boxSize,
    borderColor: color,
    borderWidth: 1,
    color: undefined, // Transparent fill
  });

  // 2. Draw the Checkmark (V)
  // Coordinates relative to the box bottom-left corner (boxX, boxY)

  // Line 1: Short stroke (downwards)
  page.drawLine({
    start: { x: boxX + boxSize * 0.2, y: boxY + boxSize * 0.5 },
    end: { x: boxX + boxSize * 0.4, y: boxY + boxSize * 0.2 },
    thickness: 1.5,
    color: color,
  });

  // Line 2: Long stroke (upwards)
  page.drawLine({
    start: { x: boxX + boxSize * 0.4, y: boxY + boxSize * 0.2 },
    end: { x: boxX + boxSize * 0.8, y: boxY + boxSize * 0.8 },
    thickness: 1.5,
    color: color,
  });
}

export async function exportTransactionsToPDF(
  transactions: Transaction[],
  filters: {
    dateRange: {
      from?: Date;
      to?: Date;
    };
  },
  totalCount: number,
  currentLanguage: string = "he",
  sorting?: { field: string; direction: "asc" | "desc" }
) {
  try {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    // Set Metadata
    pdfDoc.setTitle(
      `Ten10 Transactions Report - ${format(new Date(), "yyyy-MM-dd")}`
    );
    pdfDoc.setAuthor("Ten10 App");
    pdfDoc.setCreator("Ten10 Export Service");
    pdfDoc.setProducer("Ten10");
    pdfDoc.setCreationDate(new Date());

    const regularFontBytes = await fetch(regularFontUrl).then((res) =>
      res.arrayBuffer()
    );
    const mediumFontBytes = await fetch(mediumFontUrl).then((res) =>
      res.arrayBuffer()
    );

    const regularFont = await pdfDoc.embedFont(regularFontBytes);
    const boldFont = await pdfDoc.embedFont(mediumFontBytes);

    // Load Logo (prefer wide logo for header)
    let logoImage;
    let logoAspectRatio = 1; // width / height
    try {
      // Prefer wide header logo
      const wideLogoBytes = await fetch("/logo/logo-wide.png").then((res) =>
        res.arrayBuffer()
      );
      logoImage = await pdfDoc.embedPng(wideLogoBytes);
      logoAspectRatio = logoImage.width / logoImage.height;
    } catch (e) {
      try {
        // Fallback to app icon (square)
        const logoBytes = await fetch("/icon-192.png").then((res) =>
          res.arrayBuffer()
        );
        logoImage = await pdfDoc.embedPng(logoBytes);
        logoAspectRatio = logoImage.width / logoImage.height;
      } catch (fallbackError) {
        logger.error("Failed to load logo for PDF", fallbackError);
      }
    }

    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const margin = LAYOUT.margin;
    const contentWidth = width - 2 * margin;
    const isRtl = currentLanguage === "he";

    let y = height - margin - 10;

    // --- 1. Header ---
    const titleX = isRtl ? width - margin : margin;

    // Logo / Brand Mark
    const logoHeight = 22;
    const logoWidth = Math.min(120, Math.max(60, logoHeight * logoAspectRatio));
    const logoX = isRtl ? margin : width - margin - logoWidth;

    if (logoImage) {
      page.drawImage(logoImage, {
        x: logoX,
        y: y - logoHeight + 10,
        width: logoWidth,
        height: logoHeight,
      });
    } else {
      // Fallback if logo fails to load
      page.drawRectangle({
        x: logoX,
        y: y - logoHeight + 10,
        width: logoWidth,
        height: logoHeight,
        color: COLORS.primary,
        opacity: 0.1,
      });
      page.drawText("Ten10", {
        x: logoX + 6,
        y: y - logoHeight / 2 + 6,
        font: boldFont,
        size: 10,
        color: COLORS.primary,
      });
    }

    // Report Title
    const titleText = i18n.t("export.pdf.title", { lng: currentLanguage });
    if (isRtl) {
      drawRtlText(
        page,
        titleText,
        titleX,
        y,
        boldFont,
        LAYOUT.fontSize.title,
        COLORS.primary
      );
    } else {
      page.drawText(titleText, {
        x: titleX,
        y: y,
        font: boldFont,
        size: LAYOUT.fontSize.title,
        color: COLORS.primary,
      });
    }
    y -= 30;

    // Meta Info
    const dateRange = filters.dateRange;
    let dateRangeText = i18n.t("export.pdf.allDates", { lng: currentLanguage });
    if (dateRange.from && dateRange.to) {
      dateRangeText = i18n.t("export.pdf.dateRange", {
        from: format(dateRange.from, "dd/MM/yy"),
        to: format(dateRange.to, "dd/MM/yy"),
        lng: currentLanguage,
      });
    }

    const creationDateText = i18n.t("export.pdf.createdOn", {
      date: format(new Date(), "dd/MM/yyyy HH:mm"),
      lng: currentLanguage,
    });

    const metaText = `${dateRangeText} | ${creationDateText}`;
    if (isRtl) {
      drawRtlText(
        page,
        metaText,
        titleX,
        y,
        regularFont,
        LAYOUT.fontSize.meta,
        COLORS.textSecondary
      );
    } else {
      page.drawText(metaText, {
        x: titleX,
        y: y,
        font: regularFont,
        size: LAYOUT.fontSize.meta,
        color: COLORS.textSecondary,
      });
    }
    y -= 15;

    const countText = i18n.t("export.pdf.showing", {
      current: transactions.length,
      total: totalCount,
      lng: currentLanguage,
    });
    if (isRtl) {
      drawRtlText(
        page,
        countText,
        titleX,
        y,
        boldFont,
        LAYOUT.fontSize.meta,
        COLORS.text
      );
    } else {
      page.drawText(countText, {
        x: titleX,
        y: y,
        font: boldFont,
        size: LAYOUT.fontSize.meta,
        color: COLORS.text,
      });
    }
    y -= 20;

    // --- 2. Table Setup ---
    let tableTop = y;

    // Columns
    const tableHeaders = [
      i18n.t("export.pdf.columns.date", { lng: currentLanguage }),
      i18n.t("export.pdf.columns.type", { lng: currentLanguage }),
      i18n.t("export.pdf.columns.amount", { lng: currentLanguage }),
      i18n.t("export.pdf.columns.details", { lng: currentLanguage }),
      i18n.t("export.pdf.columns.category", { lng: currentLanguage }),
      i18n.t("export.pdf.columns.recipient", { lng: currentLanguage }),
      i18n.t("export.pdf.columns.paymentMethod", { lng: currentLanguage }),
      i18n.t("export.pdf.columns.chomesh", { lng: currentLanguage }),
      i18n.t("export.pdf.columns.recurring", { lng: currentLanguage }),
    ];

    const columnWidths = [
      50, // Date
      65, // Type
      55, // Amount
      115, // Details
      55, // Category
      55, // Recipient
      60, // Payment Method
      35, // Chomesh
      65, // Recurring
    ];

    const drawTableHeader = (yPos: number) => {
      // Header Background
      page.drawRectangle({
        x: margin,
        y: yPos - LAYOUT.headerHeight,
        width: contentWidth,
        height: LAYOUT.headerHeight,
        color: COLORS.primary,
      });

      if (isRtl) {
        // RTL: Start from right
        let currentX = width - margin;
        tableHeaders.forEach((header, i) => {
          const colW = columnWidths[i];
          const textWidth = boldFont.widthOfTextAtSize(
            header,
            LAYOUT.fontSize.header
          );
          page.drawText(header, {
            x: currentX - colW + (colW - textWidth) / 2, // Center in column
            y: yPos - LAYOUT.headerHeight + 8,
            font: boldFont,
            size: LAYOUT.fontSize.header,
            color: COLORS.white,
          });
          currentX -= colW;
        });
      } else {
        // LTR: Start from left
        let currentX = margin;
        tableHeaders.forEach((header, i) => {
          const colW = columnWidths[i];
          const textWidth = boldFont.widthOfTextAtSize(
            header,
            LAYOUT.fontSize.header
          );
          page.drawText(header, {
            x: currentX + (colW - textWidth) / 2, // Center in column
            y: yPos - LAYOUT.headerHeight + 8,
            font: boldFont,
            size: LAYOUT.fontSize.header,
            color: COLORS.white,
          });
          currentX += colW;
        });
      }
    };

    drawTableHeader(tableTop);
    y = tableTop - LAYOUT.headerHeight;

    // Helper function to get month key from date string (YYYY-MM format)
    const getMonthKey = (dateString: string): string => {
      // Parse directly from string to avoid timezone issues with Date object
      // Expects YYYY-MM-DD format which is standard in this app
      return dateString.substring(0, 7);
    };

    // Helper function to format month label
    const formatMonthLabel = (monthKey: string): string => {
      const [year, month] = monthKey.split("-");
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString(currentLanguage, {
        year: "numeric",
        month: "long",
      });
    };

    // --- 3. Table Rows ---
    let previousMonthKey: string | null = null;
    for (const t of transactions) {
      // Check if we need to add a month separator
      const shouldAddSeparator =
        sorting?.field === "date" && previousMonthKey !== null;
      const currentMonthKey = getMonthKey(t.date);
      const monthChanged = previousMonthKey !== currentMonthKey;

      if (shouldAddSeparator && monthChanged) {
        // Check if we need a new page for the separator
        if (y < margin + LAYOUT.rowHeight * 2) {
          page = pdfDoc.addPage();
          y = height - margin;
          tableTop = y;
          drawTableHeader(tableTop);
          y = tableTop - LAYOUT.headerHeight;
        }

        // Draw month separator - just a thicker line with small month label
        const separatorY = y - LAYOUT.rowHeight * 0.5;

        // Thicker border line for separator
        page.drawLine({
          start: { x: margin, y: separatorY },
          end: { x: width - margin, y: separatorY },
          thickness: 1.5,
          color: COLORS.border,
        });

        // Small month label on the side with background
        const monthLabel = formatMonthLabel(currentMonthKey);
        const labelFontSize = LAYOUT.fontSize.cell - 1;
        const labelPadding = 4;
        const labelY = separatorY - labelFontSize / 2 - 1;

        let labelX: number;
        let labelWidth: number;

        if (isRtl) {
          // RTL: label on the right side
          labelWidth = boldFont.widthOfTextAtSize(monthLabel, labelFontSize);
          labelX = width - margin - labelWidth - labelPadding * 2;
        } else {
          // LTR: label on the left side
          labelWidth = boldFont.widthOfTextAtSize(monthLabel, labelFontSize);
          labelX = margin + labelPadding;
        }

        // Background rectangle for label
        page.drawRectangle({
          x: labelX,
          y: labelY - labelPadding / 2,
          width: labelWidth + labelPadding * 2,
          height: labelFontSize + labelPadding,
          color: COLORS.white,
        });

        // Month label text
        if (isRtl) {
          // RTL: rightX is the right edge of the text
          drawRtlText(
            page,
            monthLabel,
            labelX + labelWidth + labelPadding * 2,
            labelY,
            boldFont,
            labelFontSize,
            COLORS.textSecondary
          );
        } else {
          page.drawText(monthLabel, {
            x: labelX + labelPadding,
            y: labelY,
            font: boldFont,
            size: labelFontSize,
            color: COLORS.textSecondary,
          });
        }

        y = separatorY - LAYOUT.rowHeight * 0.5;
      }
      if (y < margin + LAYOUT.rowHeight) {
        page = pdfDoc.addPage();
        y = height - margin;
        tableTop = y;
        drawTableHeader(tableTop);
        y = tableTop - LAYOUT.headerHeight;
      }

      const rowY = y - LAYOUT.rowHeight;
      const isEven = transactions.indexOf(t) % 2 === 0;

      if (!isEven) {
        page.drawRectangle({
          x: margin,
          y: rowY,
          width: contentWidth,
          height: LAYOUT.rowHeight,
          color: COLORS.primaryLight,
          opacity: 0.5,
        });
      }

      page.drawLine({
        start: { x: margin, y: rowY },
        end: { x: width - margin, y: rowY },
        thickness: 0.8, // Slightly thicker border
        color: COLORS.border,
      });

      // Prepare Recurring Data (Detailed)
      let recurringStatusText = "";
      const txWithRec = t as TransactionForTable;
      const recFreq =
        txWithRec.recurring_info?.frequency || t.recurring_frequency;
      const recOccurrence =
        txWithRec.recurring_info?.execution_count || t.occurrence_number;
      const recTotal =
        txWithRec.recurring_info?.total_occurrences || t.total_occurrences;

      if (recOccurrence) {
        if (recTotal) {
          recurringStatusText = `(${recOccurrence}/${recTotal})`;
        } else {
          // Infinity / No end date
          recurringStatusText = `(${recOccurrence}/∞)`;
        }
      } else if (recFreq) {
        // Fallback if only frequency is known but no counts (should be rare for active recurring)
        // Keep empty to avoid clutter if not strictly necessary, or show symbol
        recurringStatusText = "";
      }

      const isChomesh = t.type === "income" && t.is_chomesh === true;

      const rowData = [
        format(new Date(t.date), "dd/MM/yy"),
        i18n.t(`export.transactionTypes.${t.type}`, { lng: currentLanguage }) ||
          t.type,
        formatCurrency(t.amount, t.currency, currentLanguage),
        t.description || "-",
        t.category || "-",
        t.recipient || "-",
        formatPaymentMethod(t.payment_method, currentLanguage, "-"),
        isChomesh ? "YES" : "", // Placeholder for drawing function
        recurringStatusText,
      ];

      let cellX = isRtl ? width - margin : margin;

      rowData.forEach((cellText, i) => {
        const colWidth = columnWidths[i];
        const fontSize = LAYOUT.fontSize.cell;
        const cellCenterY = rowY + LAYOUT.rowHeight / 2 - fontSize / 2 + 1;

        if (i === 1) {
          // TYPE
          const { textColor: badgeTextColor, bgColor: badgeBgColor } =
            parseTailwindColor(typeBadgeColors[t.type] || "");

          const textWidth = boldFont.widthOfTextAtSize(cellText, fontSize - 1);
          const badgeWidth = textWidth + 12;
          const badgeHeight = fontSize + 6;

          const badgeX = isRtl
            ? cellX - colWidth + (colWidth - badgeWidth) / 2
            : cellX + (colWidth - badgeWidth) / 2;

          const badgeY = rowY + (LAYOUT.rowHeight - badgeHeight) / 2;

          page.drawRectangle({
            x: badgeX,
            y: badgeY,
            width: badgeWidth,
            height: badgeHeight,
            color: badgeBgColor,
          });

          page.drawText(cellText, {
            x: badgeX + 6,
            y: badgeY + 3,
            font: boldFont,
            size: fontSize - 1,
            color: badgeTextColor,
          });
        } else if (i === 7) {
          // CHOMESH
          const iconCenterX = isRtl
            ? cellX - colWidth + colWidth / 2
            : cellX + colWidth / 2;
          const iconCenterY = rowY + LAYOUT.rowHeight / 2;

          if (t.type === "income" && isChomesh) {
            // DRAW VECTOR CHECKBOX (SAFE)
            drawSafeVectorCheckbox(
              page,
              iconCenterX,
              iconCenterY,
              12,
              COLORS.primary
            );
          } else if (t.type === "income") {
            const textWidth = regularFont.widthOfTextAtSize("-", fontSize);
            page.drawText("-", {
              x: iconCenterX - textWidth / 2,
              y: cellCenterY,
              font: regularFont,
              size: fontSize,
              color: COLORS.textSecondary,
            });
          } else {
            const textWidth = regularFont.widthOfTextAtSize("-", fontSize);
            page.drawText("-", {
              x: iconCenterX - textWidth / 2,
              y: cellCenterY,
              font: regularFont,
              size: fontSize,
              color: COLORS.textSecondary,
            });
          }
        } else {
          // STANDARD TEXT - CENTER ALIGNED ALWAYS
          let textToDraw = cellText;
          // Truncation check
          if (
            regularFont.widthOfTextAtSize(textToDraw, fontSize) >
            colWidth - 4
          ) {
            const avgCharWidth = regularFont.widthOfTextAtSize("a", fontSize);
            const maxChars = Math.floor((colWidth - 4) / avgCharWidth) - 2;
            if (maxChars > 0 && textToDraw.length > maxChars) {
              textToDraw = textToDraw.substring(0, maxChars) + "..";
            }
          }
          const finalWidth = regularFont.widthOfTextAtSize(
            textToDraw,
            fontSize
          );

          const finalCenterX = isRtl
            ? cellX - colWidth + (colWidth - finalWidth) / 2
            : cellX + (colWidth - finalWidth) / 2;

          page.drawText(textToDraw, {
            x: finalCenterX,
            y: cellCenterY,
            font: regularFont,
            size: fontSize,
            color: COLORS.text,
          });
        }

        cellX = isRtl ? cellX - colWidth : cellX + colWidth;
      });

      y -= LAYOUT.rowHeight;
      previousMonthKey = currentMonthKey;
    }

    // --- 4. Footer ---
    const pages = pdfDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      const pageText = i18n.t("export.pdf.page", {
        current: i + 1,
        total: pages.length,
        lng: currentLanguage,
      });
      const textWidth = regularFont.widthOfTextAtSize(pageText, 8);
      if (isRtl) {
        // For centered RTL text, rightX is center + half width
        drawRtlText(
          p,
          pageText,
          width / 2 + textWidth / 2,
          margin / 2,
          regularFont,
          8,
          COLORS.textSecondary
        );
      } else {
        p.drawText(pageText, {
          x: width / 2 - textWidth / 2,
          y: margin / 2,
          font: regularFont,
          size: 8,
          color: COLORS.textSecondary,
        });
      }
    }

    const pdfBytes = await pdfDoc.save();
    const fromDate = filters.dateRange.from
      ? format(filters.dateRange.from, "yyyy-MM-dd")
      : "start";
    const toDate = filters.dateRange.to
      ? format(filters.dateRange.to, "yyyy-MM-dd")
      : "end";
    downloadPdf(pdfBytes, `Ten10_Transactions_${fromDate}_to_${toDate}.pdf`);
  } catch (error) {
    logger.error("Error exporting transactions to PDF:", error);
  }
}
