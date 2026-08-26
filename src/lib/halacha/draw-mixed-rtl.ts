import type { PDFFont, PDFPage, RGB } from "pdf-lib";

export type MixedRun = {
  text: string;
  ltr: boolean;
};

const RTL_MIRROR: Record<string, string> = {
  "(": ")",
  ")": "(",
  "[": "]",
  "]": "[",
  "{": "}",
  "}": "{",
};

export function mirrorRtlMarks(text: string): string {
  return text.replace(/[()[\]{}]/g, (mark) => RTL_MIRROR[mark] ?? mark);
}

const MIXED_TOKEN =
  /(https?:\/\/[^\s]+)|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})|((?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}(?:\/[^\s]*)?)|([A-Za-z]+[A-Za-z0-9]*)|([₪$€]?\d[\d.,\/:-]*\%?)/g;

export function tokenizeMixedRuns(text: string): MixedRun[] {
  const runs: MixedRun[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  MIXED_TOKEN.lastIndex = 0;

  while ((match = MIXED_TOKEN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push({ text: text.slice(lastIndex, match.index), ltr: false });
    }
    runs.push({ text: match[0], ltr: true });
    lastIndex = MIXED_TOKEN.lastIndex;
  }

  if (lastIndex < text.length) {
    runs.push({ text: text.slice(lastIndex), ltr: false });
  }

  return runs.filter((run) => run.text.length > 0);
}

export function measureMixedText(
  text: string,
  measure: (value: string) => number
): number {
  return tokenizeMixedRuns(text).reduce(
    (total, run) => total + measure(run.text),
    0
  );
}

export function layoutMixedRtlRuns(
  text: string,
  measure: (value: string) => number,
  rightX: number
): Array<{ text: string; x: number; ltr: boolean }> {
  // Reverse run order so the first logical run sits on the right.
  // Latin / numbers / URLs stay internally LTR and are not mirrored.
  const visual = [...tokenizeMixedRuns(text)].reverse().map((run) => ({
    ...run,
    text: run.ltr ? run.text : mirrorRtlMarks(run.text),
  }));
  const widths = visual.map((run) => measure(run.text));
  let x = rightX - widths.reduce((total, width) => total + width, 0);
  return visual.map((run, index) => {
    const placed = { text: run.text, x, ltr: run.ltr };
    x += widths[index] ?? 0;
    return placed;
  });
}

export function drawMixedRtlText(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB
): void {
  const placed = layoutMixedRtlRuns(text, (value) =>
    font.widthOfTextAtSize(value, size),
    rightX
  );
  for (const run of placed) {
    page.drawText(run.text, {
      x: run.x,
      y,
      font,
      size,
      color,
    });
  }
}
