import { PDFDocument, rgb, PDFFont, cmyk } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { Transaction } from "@/types/transaction";
import { format } from "date-fns";
import { formatCurrency } from "./currency";
import {
  transactionTypeLabels,
  typeBadgeColors,
} from "@/types/transactionLabels";

// Import fonts directly using Vite's ?url feature for robust path handling
import assistantFontUrl from "/fonts/Assistant-VariableFont_wght.ttf?url";

// Helper to convert Tailwind-like CSS color strings to pdf-lib's RGB format
// Note: This is a simplified parser and won't handle all CSS color formats.
// It expects something like "bg-green-100 text-green-800 border-green-300"
// and extracts the text color.
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
    textColor: textColorKey ? colorMap[textColorKey] : rgb(0, 0, 0),
    bgColor: bgColorKey ? colorMap[bgColorKey] : rgb(1, 1, 1),
  };
}

// Helper function to download the PDF
function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export async function exportTransactionsToPDF(
  transactions: Transaction[],
  filters: {
    dateRange: {
      from?: Date;
      to?: Date;
    };
  },
  totalCount: number
) {
  try {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const fontBytes = await fetch(assistantFontUrl).then((res) =>
      res.arrayBuffer()
    );
    const customFont = await pdfDoc.embedFont(fontBytes);
    const boldFont = customFont;

    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const margin = 30;
    const contentWidth = width - 2 * margin;
    const textColor = rgb(0, 0, 0); // Pure black for max readability

    const drawRtlText = (
      text: string,
      options: {
        x: number;
        y: number;
        font: PDFFont;
        size: number;
        color?: any;
      }
    ) => {
      const textWidth = options.font.widthOfTextAtSize(text, options.size);
      page.drawText(text, {
        ...options,
        x: options.x - textWidth,
      });
    };

    let y = height - margin - 10;

    // --- 1. Header ---
    const titleX = width - margin;
    // Draw Logo Placeholder
    page.drawRectangle({
      x: margin,
      y: y - 40,
      width: 60,
      height: 60,
      color: rgb(0.92, 0.92, 0.92),
    });
    page.drawText("לוגו", {
      x: margin + 22,
      y: y - 15,
      font: customFont,
      size: 10,
      color: rgb(0.6, 0.6, 0.6),
    });

    drawRtlText("דוח תנועות", {
      x: titleX,
      y,
      font: boldFont,
      size: 24,
      color: rgb(0.1, 0.3, 0.6),
    });
    y -= 28;

    const dateRange = filters.dateRange;
    let dateRangeText = "כל התאריכים";
    if (dateRange.from && dateRange.to) {
      dateRangeText = `מתאריך ${format(dateRange.from, "dd/MM/yy")} עד ${format(
        dateRange.to,
        "dd/MM/yy"
      )}`;
    }
    drawRtlText(dateRangeText, {
      x: titleX,
      y,
      font: customFont,
      size: 9,
      color: textColor,
    });
    y -= 14;

    const creationDateText = `הופק בתאריך: ${format(
      new Date(),
      "dd/MM/yyyy HH:mm"
    )}`;
    drawRtlText(creationDateText, {
      x: titleX,
      y,
      font: customFont,
      size: 9,
      color: textColor,
    });
    y -= 14;

    const countText = `מציג ${transactions.length} מתוך ${totalCount} תנועות`;
    drawRtlText(countText, {
      x: titleX,
      y,
      font: boldFont,
      size: 9,
      color: textColor,
    });
    y -= 25;

    // --- 2. Table ---
    let tableTop = y;
    const tableHeaders = [
      "תאריך",
      "סוג",
      "פרטים",
      "קטגוריה",
      "נמען",
      "הוראת קבע",
      "חומש?",
      "סכום",
    ];
    const columnWidths = [55, 75, 120, 70, 70, 70, 40, 60];
    const tableHeaderHeight = 25;
    const tableRowHeight = 40;

    const drawTableHeader = (yPos: number) => {
      page.drawRectangle({
        x: margin,
        y: yPos - tableHeaderHeight,
        width: contentWidth,
        height: tableHeaderHeight,
        color: rgb(0.15, 0.15, 0.15),
      });
      let currentX = width - margin;
      tableHeaders.forEach((header, i) => {
        const textWidth = boldFont.widthOfTextAtSize(header, 10);
        page.drawText(header, {
          x: currentX - columnWidths[i] + (columnWidths[i] - textWidth) / 2,
          y: yPos - tableHeaderHeight + 8,
          font: boldFont,
          size: 10,
          color: rgb(1, 1, 1),
        });
        currentX -= columnWidths[i];
      });
    };

    drawTableHeader(tableTop);
    y = tableTop - tableHeaderHeight;

    for (const t of transactions) {
      if (y < margin + tableRowHeight) {
        page = pdfDoc.addPage();
        y = height - margin;
        tableTop = y;
        drawTableHeader(tableTop);
        y = tableTop - tableHeaderHeight;
      }

      const rowY = y - tableRowHeight;
      if (transactions.indexOf(t) % 2 !== 0) {
        page.drawRectangle({
          x: margin,
          y: rowY,
          width: contentWidth,
          height: tableRowHeight,
          color: rgb(0.97, 0.98, 0.99),
        });
      }

      page.drawLine({
        start: { x: margin, y: rowY },
        end: { x: width - margin, y: rowY },
        thickness: 0.5,
        color: rgb(0.9, 0.9, 0.9),
      });

      const freqMap: { [key: string]: string } = {
        daily: "יומית",
        weekly: "שבועית",
        monthly: "חודשית",
        yearly: "שנתית",
      };

      let detailsText = t.description || "-";
      let recurringStatusText = "-";
      const currentOccurrence =
        t.occurrence_number ?? t.recurring_info?.execution_count;

      if (t.recurring_info) {
        const freqText =
          freqMap[t.recurring_info.frequency] || t.recurring_info.frequency;
        detailsText += ` (ה"ק ${freqText})`;
        const totalOccurrences = t.recurring_info.total_occurrences || "∞";
        recurringStatusText = `(${
          currentOccurrence ?? "?"
        }/${totalOccurrences})`;
      }

      const chomeshText =
        t.type === "income" ? (t.is_chomesh ? "כן" : "לא") : "-";

      const rowData = [
        format(new Date(t.date), "dd/MM/yy"),
        transactionTypeLabels[t.type] || t.type,
        detailsText,
        t.category || "-",
        t.recipient || "-",
        recurringStatusText,
        chomeshText,
        formatCurrency(t.amount),
      ];

      let cellX = width - margin;
      rowData.forEach((cellText, i) => {
        const colWidth = columnWidths[i];

        // Special handling for the 'type' column with color badges
        if (i === 1) {
          const { textColor: badgeTextColor, bgColor: badgeBgColor } =
            parseTailwindColor(typeBadgeColors[t.type] || "");
          const textWidth = customFont.widthOfTextAtSize(cellText, 9);
          const badgeVPadding = 4;
          const badgeHPadding = 8;
          const badgeWidth = textWidth + badgeHPadding * 2;
          const badgeHeight = customFont.heightAtSize(9) + badgeVPadding * 2;

          const badgeX = cellX - colWidth + (colWidth - badgeWidth) / 2;
          const badgeY = rowY + (tableRowHeight - badgeHeight) / 2;

          const rectOptions = {
            x: badgeX,
            y: badgeY,
            width: badgeWidth,
            height: badgeHeight,
            color: badgeBgColor,
          };
          page.drawRectangle(rectOptions);

          const textX = badgeX + badgeHPadding;
          const textY = badgeY + badgeVPadding;

          page.drawText(cellText, {
            x: textX,
            y: textY,
            font: customFont,
            size: 9,
            color: badgeTextColor,
          });
        } else {
          // Default text drawing for other columns
          const lines = [];
          const words = cellText.split(" ");
          let currentLine = "";
          for (const word of words) {
            const testLine =
              currentLine.length > 0 ? `${currentLine} ${word}` : word;
            if (customFont.widthOfTextAtSize(testLine, 9) > colWidth - 8) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          lines.push(currentLine);

          let lineY =
            rowY +
            tableRowHeight -
            (tableRowHeight - lines.length * 11) / 2 -
            8;
          for (const line of lines) {
            const textWidth = customFont.widthOfTextAtSize(line, 9);
            page.drawText(line, {
              x: cellX - colWidth + (colWidth - textWidth) / 2,
              y: lineY,
              font: customFont,
              size: 9,
              color: textColor,
            });
            lineY -= 11;
          }
        }
        cellX -= colWidth;
      });

      y -= tableRowHeight;
    }

    // --- 4. Footer ---
    const pages = pdfDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      const pageText = `עמוד ${i + 1} מתוך ${pages.length}`;
      const textWidth = customFont.widthOfTextAtSize(pageText, 8);
      p.drawText(pageText, {
        x: width / 2 - textWidth / 2,
        y: margin / 2,
        font: customFont,
        size: 8,
        color: rgb(0.5, 0.5, 0.5),
      });
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
    console.error("Error exporting transactions to PDF:", error);
  }
}
