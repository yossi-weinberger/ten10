import { PDFDocument, StandardFonts, rgb, PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit"; // Import fontkit
import type { Transaction } from "@/types/transaction";
import { transactionTypeLabels } from "@/types/transactionLabels";
import { formatCurrency } from "./currency";

// Helper function to download the PDF
function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href); // Clean up
}

export async function exportTransactionsToPDF(transactions: Transaction[]) {
  try {
    // 1. Create a new PDFDocument
    const pdfDoc = await PDFDocument.create();

    // *** IMPORTANT: Register fontkit instance ***
    pdfDoc.registerFontkit(fontkit);

    // 2. Load custom font (Assistant)
    const fontUrl = "/fonts/Assistant-VariableFont_wght.ttf"; // Path relative to public folder
    const fontBytes = await fetch(fontUrl).then((res) => res.arrayBuffer());

    // 3. Embed the font
    // Note: Variable font support might be limited. Boldness might not render differently.
    const assistantFont = await pdfDoc.embedFont(fontBytes);

    // 4. Add a page
    const page = pdfDoc.addPage(); // Default A4 size
    const { width, height } = page.getSize();
    const margin = 40;
    const usableWidth = width - 2 * margin;
    let y = height - margin; // Start drawing from top

    // 5. Define styles
    const fontSizeHeader = 20;
    const fontSizeSubheader = 14;
    const fontSizeTable = 10;
    const fontColor = rgb(0, 0, 0); // Black
    const headerColor = rgb(0.23, 0.23, 0.23); // Dark grey like pdfmake #3c3c3c

    // Helper to draw right-aligned text (basic RTL simulation)
    const drawRightAlignedText = (
      text: string,
      font: PDFFont,
      size: number,
      xEnd: number,
      currentY: number,
      color = fontColor
    ) => {
      const textWidth = font.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: xEnd - textWidth,
        y: currentY,
        font: font,
        size: size,
        color: color,
      });
      return font.heightAtSize(size); // Return text height for Y positioning
    };

    // 6. Draw Headers
    y -= fontSizeHeader * 1.2; // Move down for first header
    drawRightAlignedText(
      "דוח תנועות",
      assistantFont,
      fontSizeHeader,
      width - margin,
      y,
      fontColor
    );
    y -= fontSizeSubheader * 1.5; // Space before next header
    drawRightAlignedText(
      "תנועות",
      assistantFont,
      fontSizeSubheader,
      width - margin,
      y,
      fontColor
    );
    y -= fontSizeSubheader * 1.5; // Space before table

    // 7. Draw Table Headers
    const tableHeaders = ["תאריך", "סוג", "פרטים", "סכום", "חומש?"];
    // Define column widths (approximate based on content, adjust as needed)
    const colWidths = [70, 80, usableWidth - 70 - 80 - 70 - 50, 70, 50];
    let currentX = margin;
    const tableHeaderY = y;
    const headerHeight = assistantFont.heightAtSize(fontSizeTable + 1) * 1.5; // Increased height for padding

    // Draw header background
    page.drawRectangle({
      x: margin,
      y: tableHeaderY - headerHeight + 5, // Adjust y based on new height
      width: usableWidth,
      height: headerHeight,
      color: headerColor,
    });

    const headerTextY =
      tableHeaderY -
      headerHeight +
      (headerHeight - assistantFont.heightAtSize(fontSizeTable + 1)) / 2 +
      2; // Center text vertically

    // Draw header text (Right-to-left visual order)
    let colXEnd = width - margin;
    for (let i = 0; i < tableHeaders.length; i++) {
      const headerText = tableHeaders[i];
      const colWidth = colWidths[i];
      const textWidth = assistantFont.widthOfTextAtSize(
        headerText,
        fontSizeTable + 1
      );
      let textX;
      if (i < tableHeaders.length - 1) {
        // Right align with padding
        textX = colXEnd - textWidth - 5;
      } else {
        // Center "חומש?"
        textX = colXEnd - colWidth + (colWidth - textWidth) / 2;
      }
      page.drawText(headerText, {
        x: textX,
        y: headerTextY, // Use calculated Y
        font: assistantFont,
        size: fontSizeTable + 1,
        color: rgb(1, 1, 1),
      });
      colXEnd -= colWidth;
    }

    // Define table line style
    const tableLineColor = rgb(0.8, 0.8, 0.8);
    const tableLineWidth = 0.5;

    // Draw Top border of table body
    const tableBodyStartY = tableHeaderY - headerHeight + 5;
    page.drawLine({
      start: { x: margin, y: tableBodyStartY },
      end: { x: width - margin, y: tableBodyStartY },
      thickness: tableLineWidth,
      color: tableLineColor,
    });

    y = tableBodyStartY; // Reset Y to start of table body content area

    // 8. Draw Table Rows
    const rowHeight = assistantFont.heightAtSize(fontSizeTable) * 1.8; // Increased line spacing slightly
    const tableBottomY = y - transactions.length * rowHeight; // Calculate final bottom Y

    transactions.forEach((t, rowIndex) => {
      y -= rowHeight; // Move Y position UP for the current row FIRST

      if (y < margin) {
        // TODO: Implement pagination
        console.warn("Pagination not implemented: content might overflow.");
        return;
      }
      const rowTextY =
        y + (rowHeight - assistantFont.heightAtSize(fontSizeTable)) / 2; // Center text vertically

      const dateText = new Date(t.date).toLocaleDateString("he-IL");
      const typeText = transactionTypeLabels[t.type] || t.type;
      const detailsText =
        t.description ||
        (t.type === "donation" ? t.recipient : t.category) ||
        "-";
      const amountText = formatCurrency(t.amount, t.currency).replace(
        /\\u00a0/g,
        " "
      );
      const chomeshText =
        t.type === "income" ? (t.is_chomesh ? "כן" : "לא") : "";
      const rowData = [
        dateText,
        typeText,
        detailsText,
        amountText,
        chomeshText,
      ];

      colXEnd = width - margin; // Reset for each row
      for (let i = 0; i < rowData.length; i++) {
        const cellText = rowData[i];
        const colWidth = colWidths[i];
        const textWidth = assistantFont.widthOfTextAtSize(
          cellText,
          fontSizeTable
        );
        let textX;

        if (i === rowData.length - 1) {
          // Center "חומש?" value
          textX = colXEnd - colWidth + (colWidth - textWidth) / 2;
        } else {
          // Default right align with padding
          textX = colXEnd - textWidth - 5;
        }

        page.drawText(cellText, {
          x: textX,
          y: rowTextY,
          font: assistantFont,
          size: fontSizeTable,
          color: fontColor,
          maxWidth: colWidth - 10, // Add maxWidth to prevent overflow (basic)
        });
        colXEnd -= colWidth;
      }

      // Draw horizontal line AT THE BOTTOM of the current row space
      page.drawLine({
        start: { x: margin, y: y },
        end: { x: width - margin, y: y },
        thickness: tableLineWidth,
        color: tableLineColor,
      });
    });

    // 9. Draw Vertical Lines
    let currentColumnX = margin;
    page.drawLine({
      start: { x: currentColumnX, y: tableBodyStartY },
      end: { x: currentColumnX, y: tableBottomY },
      thickness: tableLineWidth,
      color: tableLineColor,
    }); // Left border
    for (let i = colWidths.length - 1; i >= 0; i--) {
      // Iterate RTL visually
      currentColumnX += colWidths[i];
      page.drawLine({
        start: { x: currentColumnX, y: tableBodyStartY },
        end: { x: currentColumnX, y: tableBottomY },
        thickness: tableLineWidth,
        color: tableLineColor,
      }); // Right border of column i
    }

    // 10. Serialize the PDFDocument to bytes
    const pdfBytes = await pdfDoc.save();

    // 11. Trigger download
    downloadPdf(
      pdfBytes,
      `Ten10-transactions-${new Date().toISOString().split("T")[0]}.pdf`
    );
  } catch (error) {
    console.error("Error exporting transactions to PDF with pdf-lib:", error);
    // Handle error appropriately, maybe show a notification to the user
  }
}
