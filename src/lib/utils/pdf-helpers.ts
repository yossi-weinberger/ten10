/**
 * Shared PDF helper utilities for RTL text rendering.
 * Used by both export-pdf.ts (transactions) and AnalyticsPage.tsx.
 */
import type { PDFPage, PDFFont, RGB } from "pdf-lib";

type TextSegment = { text: string; isNumber: boolean };

/**
 * Split text into alternating non-number / number segments.
 * Numbers include: digits, dates (2024-01-15), times (12:30),
 * decimals (1.5), thousands (1,234), and combined (1,234.56).
 *
 * Using a broader separator set (including comma) ensures that
 * "1,234.56" is kept as one segment and not reversed when drawn RTL.
 */
export function splitTextSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  // Matches digit sequences with , . / : - separators (thousands, decimals, dates, times)
  const regex = /(\d[\d,\.\/:\-]*\d|\d)/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.substring(lastIndex, match.index), isNumber: false });
    }
    segments.push({ text: match[0], isNumber: true });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.substring(lastIndex), isNumber: false });
  }
  return segments;
}

/**
 * Draw RTL text on a PDF page, handling embedded numbers correctly.
 *
 * For Hebrew (RTL) text mixed with numbers:
 *  - Text segments are reversed (RTL order)
 *  - Number segments keep their internal order (LTR digits)
 * This ensures that "דיור: ₪1,234" renders correctly in Hebrew.
 *
 * @param page    - PDF page to draw on
 * @param text    - Full text string to draw
 * @param rightX  - Right edge X position (text extends leftward from here)
 * @param y       - Y baseline position
 * @param font    - Embedded PDF font
 * @param size    - Font size in pt
 * @param color   - rgb() color
 */
/**
 * In RTL context, bracket characters must be mirrored so they visually "open"
 * in the correct direction. `(` in logical RTL text should render as `)` etc.
 */
const RTL_MIRROR: Record<string, string> = {
  "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{",
};
function mirrorBrackets(text: string): string {
  return text.split("").map((c) => RTL_MIRROR[c] ?? c).join("");
}

export function drawRtlText(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB
): void {
  const segments = splitTextSegments(text);
  // Reverse so the first logical segment appears at the right edge.
  // Mirror brackets in non-number segments so they open the correct way.
  const reversed = [...segments].reverse().map((s) =>
    s.isNumber ? s : { ...s, text: mirrorBrackets(s.text) }
  );

  const widths = reversed.map((s) => font.widthOfTextAtSize(s.text, size));
  const totalWidth = widths.reduce((a, b) => a + b, 0);

  let cx = rightX - totalWidth;
  reversed.forEach((seg, i) => {
    page.drawText(seg.text, { x: cx, y, font, size, color });
    cx += widths[i];
  });
}
