import {
  type PDFDocument,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import {
  HALACHA_CONTACT_EMAIL,
  HALACHA_LANDING_DISPLAY,
  HALACHA_LANDING_URL,
  type HalachaPrintBlock,
  type HalachaPrintChapter,
  type HalachaPrintModel,
  type PrintHighlight,
} from "./print-model";
import { stripPrintMarkup, wrapPlainText } from "./wrap-plain-text";
import { toHebrewNumeral } from "./hebrew-numeral";
import {
  drawMixedRtlText,
  measureMixedText,
} from "./draw-mixed-rtl";

const PAGE_SIZE: [number, number] = [595.28, 841.89];
const FRAME = 26;
const INNER = 4;
const MARGIN_X = 54;
const HEADER_H = 28;
const FOOTER_H = 26;

const COLORS = {
  ink: rgb(0.16, 0.12, 0.08),
  muted: rgb(0.38, 0.32, 0.24),
  paper: rgb(0.99, 0.97, 0.93),
  gold: rgb(0.62, 0.48, 0.22),
  line: rgb(0.58, 0.48, 0.34),
  boxFill: rgb(0.96, 0.93, 0.87),
  boxFillStrong: rgb(0.94, 0.9, 0.84),
  boxBar: rgb(0.4, 0.3, 0.16),
  boxBarStrong: rgb(0.28, 0.2, 0.1),
};

type PageKind = "cover" | "toc" | "chapter";

export type HalachaBookletLogos = {
  app?: PDFImage;
  institute?: PDFImage;
};

function highlightStyle(highlight: PrintHighlight | undefined): {
  bg: RGB;
  bar: RGB;
  labelKey: "practice" | "caution";
} | null {
  switch (highlight) {
    case "highlight":
      return { bg: COLORS.boxFill, bar: COLORS.boxBar, labelKey: "practice" };
    case "important":
      return { bg: COLORS.boxFillStrong, bar: COLORS.boxBarStrong, labelKey: "caution" };
    case null:
    case undefined:
      return null;
    default: {
      const _never: never = highlight;
      return _never;
    }
  }
}

class BookletWriter {
  private page!: PDFPage;
  private y = 0;
  private readonly width: number;
  private readonly height: number;
  private readonly contentWidth: number;
  private readonly isRtl: boolean;
  private readonly pages: Array<{
    page: PDFPage;
    kind: PageKind;
    header: string;
    hasContent: boolean;
  }> = [];
  private header = "";
  private readonly chapterStartPrinted: number[] = [];
  private readonly chapterStartPages: PDFPage[] = [];

  constructor(
    private readonly pdfDoc: PDFDocument,
    private readonly regularFont: PDFFont,
    private readonly boldFont: PDFFont,
    private readonly model: HalachaPrintModel,
    private readonly logos: HalachaBookletLogos = {}
  ) {
    this.width = PAGE_SIZE[0];
    this.height = PAGE_SIZE[1];
    this.contentWidth = this.width - MARGIN_X * 2;
    this.isRtl = model.language === "he";
  }

  private contentTop() {
    return this.height - FRAME - INNER - HEADER_H;
  }

  private contentBottom() {
    return FRAME + INNER + FOOTER_H;
  }

  private markContent() {
    const current = this.pages[this.pages.length - 1];
    if (current) current.hasContent = true;
  }

  private addPageLink(
    from: PDFPage,
    dest: PDFPage,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    const annot = this.pdfDoc.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [x, y, x + width, y + height],
      Border: [0, 0, 0],
      Dest: [dest.ref, "XYZ", null, dest.getHeight(), null],
    });
    from.node.addAnnot(this.pdfDoc.context.register(annot));
  }

  private addUriLink(
    from: PDFPage,
    uri: string,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    const annot = this.pdfDoc.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [x, y, x + width, y + height],
      Border: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: uri },
    });
    from.node.addAnnot(this.pdfDoc.context.register(annot));
  }

  private printedNumberAt(index: number): number {
    return this.pages
      .slice(0, index + 1)
      .filter((item) => item.kind !== "cover").length;
  }

  private formatPageMark(value: number): string {
    return this.isRtl ? toHebrewNumeral(value) : String(value);
  }

  private addDecoratedPage(kind: PageKind, header: string) {
    this.page = this.pdfDoc.addPage(PAGE_SIZE);
    this.pages.push({ page: this.page, kind, header, hasContent: kind === "cover" });
    this.header = header;
    this.drawPaper();
    this.drawFrame();
    if (kind !== "cover") {
      this.drawRunningHeader(header);
    }
    this.y = kind === "cover" ? this.height - FRAME - 56 : this.contentTop();
  }

  private drawPaper() {
    this.page.drawRectangle({
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
      color: COLORS.paper,
    });
  }

  private drawFrame() {
    this.page.drawRectangle({
      x: FRAME,
      y: FRAME,
      width: this.width - FRAME * 2,
      height: this.height - FRAME * 2,
      borderColor: COLORS.boxBar,
      borderWidth: 1.4,
    });
    this.page.drawRectangle({
      x: FRAME + INNER,
      y: FRAME + INNER,
      width: this.width - (FRAME + INNER) * 2,
      height: this.height - (FRAME + INNER) * 2,
      borderColor: COLORS.gold,
      borderWidth: 0.7,
    });
  }

  private measure(text: string, font: PDFFont, size: number) {
    return measureMixedText(text, (value) =>
      font.widthOfTextAtSize(value, size)
    );
  }

  private drawLineText(
    text: string,
    rightOrLeftX: number,
    y: number,
    font: PDFFont,
    size: number,
    color: RGB,
    mark = true
  ) {
    if (mark) this.markContent();
    if (this.isRtl) {
      drawMixedRtlText(this.page, text, rightOrLeftX, y, font, size, color);
      return;
    }
    this.page.drawText(text, { x: rightOrLeftX, y, font, size, color });
  }

  private drawCentered(
    text: string,
    y: number,
    font: PDFFont,
    size: number,
    color: RGB,
    options: { page?: PDFPage; mark?: boolean } = {}
  ) {
    if (options.mark !== false) this.markContent();
    const targetPage = options.page ?? this.page;
    const width = this.measure(text, font, size);
    if (this.isRtl) {
      drawMixedRtlText(
        targetPage,
        text,
        this.width / 2 + width / 2,
        y,
        font,
        size,
        color
      );
      return;
    }
    targetPage.drawText(text, {
      x: this.width / 2 - width / 2,
      y,
      font,
      size,
      color,
    });
  }

  private drawRunningHeader(header: string) {
    const y = this.height - FRAME - 18;
    this.drawCentered(header, y, this.regularFont, 8, COLORS.muted, {
      mark: false,
    });
    this.page.drawLine({
      start: { x: MARGIN_X, y: y - 8 },
      end: { x: this.width - MARGIN_X, y: y - 8 },
      thickness: 0.6,
      color: COLORS.line,
    });
  }

  private finishFooters() {
    this.pages.forEach((entry, index) => {
      if (entry.kind === "cover") return;
      const mark = this.formatPageMark(this.printedNumberAt(index));
      const label = this.isRtl ? `־ ${mark} ־` : `— ${mark} —`;
      const y = FRAME + 14;
      const width = this.measure(label, this.regularFont, 9);
      if (this.isRtl) {
        drawMixedRtlText(
          entry.page,
          label,
          this.width / 2 + width / 2,
          y,
          this.regularFont,
          9,
          COLORS.muted
        );
        return;
      }
      entry.page.drawText(label, {
        x: this.width / 2 - width / 2,
        y,
        font: this.regularFont,
        size: 9,
        color: COLORS.muted,
      });
    });
  }

  private doubleRule(y: number, targetPage = this.page) {
    targetPage.drawLine({
      start: { x: MARGIN_X + 40, y: y + 2 },
      end: { x: this.width - MARGIN_X - 40, y: y + 2 },
      thickness: 1.1,
      color: COLORS.ink,
    });
    targetPage.drawLine({
      start: { x: MARGIN_X + 70, y: y - 2 },
      end: { x: this.width - MARGIN_X - 70, y: y - 2 },
      thickness: 0.6,
      color: COLORS.gold,
    });
  }

  private ensureSpace(needed: number) {
    if (this.y - needed < this.contentBottom()) {
      this.addDecoratedPage("chapter", this.header);
    }
  }

  private remainingHeight() {
    return this.y - this.contentBottom();
  }

  private startX(indent: number) {
    return this.isRtl
      ? this.width - MARGIN_X - indent
      : MARGIN_X + indent;
  }

  private drawLines(
    lines: string[],
    font: PDFFont,
    size: number,
    color: RGB,
    options: { lineGap?: number; indent?: number; allowPageBreak?: boolean } = {}
  ) {
    const lineGap = options.lineGap ?? 5;
    const indent = options.indent ?? 0;
    for (const line of lines) {
      if (options.allowPageBreak !== false) {
        this.ensureSpace(size + lineGap);
      }
      this.drawLineText(
        line,
        this.startX(indent),
        this.y - size,
        font,
        size,
        color
      );
      this.y -= size + lineGap;
    }
  }

  private wrap(text: string, font: PDFFont, size: number, width: number) {
    return wrapPlainText(
      stripPrintMarkup(text),
      (value) =>
        measureMixedText(value, (token) =>
          font.widthOfTextAtSize(token, size)
        ),
      width
    );
  }

  private drawParagraph(
    text: string,
    options: {
      font?: PDFFont;
      size?: number;
      color?: RGB;
      width?: number;
      align?: "start" | "center";
      allowPageBreak?: boolean;
      indent?: number;
    } = {}
  ) {
    const font = options.font ?? this.regularFont;
    const size = options.size ?? 10.5;
    const color = options.color ?? COLORS.ink;
    const indent = options.indent ?? 0;
    const width = (options.width ?? this.contentWidth) - indent;
    const lines = this.wrap(text, font, size, width);
    if (options.align === "center") {
      for (const line of lines) {
        if (options.allowPageBreak !== false) {
          this.ensureSpace(size + 6);
        }
        this.drawCentered(line, this.y - size, font, size, color);
        this.y -= size + 6;
      }
      return;
    }
    this.drawLines(lines, font, size, color, {
      indent,
      allowPageBreak: options.allowPageBreak,
    });
  }

  drawCover() {
    this.addDecoratedPage("cover", this.model.title);
    this.y = this.height - 118;
    this.drawCentered(
      stripPrintMarkup(this.model.bookletKind),
      this.y,
      this.boldFont,
      11,
      COLORS.gold
    );
    this.y -= 22;
    this.doubleRule(this.y);
    this.y -= 30;
    this.drawParagraph(this.model.title, {
      font: this.boldFont,
      size: 24,
      align: "center",
      allowPageBreak: false,
    });
    this.y -= 4;
    this.drawParagraph(this.model.subtitle, {
      size: 11,
      color: COLORS.muted,
      align: "center",
      width: this.contentWidth - 40,
      allowPageBreak: false,
    });
    this.y -= 12;
    this.doubleRule(this.y);
    this.y -= 20;
    this.drawInstituteLogo();
    this.drawParagraph(this.model.creditAuthor, {
      size: 11,
      align: "center",
      width: this.contentWidth - 30,
      allowPageBreak: false,
    });

    let footerY = FRAME + 32;
    this.drawCentered(
      this.model.printedOn,
      footerY,
      this.regularFont,
      7.5,
      COLORS.muted
    );
    footerY += 12;
    this.drawCentered(
      `${this.model.emailLabel}: ${HALACHA_CONTACT_EMAIL}`,
      footerY,
      this.regularFont,
      8,
      COLORS.muted
    );
    footerY += 14;
    const landingLine = `${this.model.creditDetails} ${HALACHA_LANDING_DISPLAY}`;
    this.drawCentered(
      landingLine,
      footerY,
      this.regularFont,
      8,
      COLORS.muted
    );
    const landingWidth = this.measure(landingLine, this.regularFont, 8);
    this.addUriLink(
      this.page,
      HALACHA_LANDING_URL,
      this.width / 2 - landingWidth / 2,
      footerY - 2,
      landingWidth,
      12
    );
    footerY += 16;
    const creditLines = this.wrap(
      this.model.creditApp,
      this.regularFont,
      9,
      this.contentWidth - 20
    );
    for (const line of [...creditLines].reverse()) {
      this.drawCentered(line, footerY, this.regularFont, 9, COLORS.muted);
      footerY += 13;
    }
    if (this.logos.app) {
      const logoWidth = 110;
      const logoHeight = logoWidth / (this.logos.app.width / this.logos.app.height);
      footerY += 8;
      this.page.drawImage(this.logos.app, {
        x: this.width / 2 - logoWidth / 2,
        y: footerY,
        width: logoWidth,
        height: logoHeight,
      });
    }
  }

  private drawInstituteLogo() {
    const image = this.logos.institute;
    if (!image) return;
    const maxWidth = 148;
    const maxHeight = 132;
    const ratio = image.width / image.height;
    let width = maxWidth;
    let height = width / ratio;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * ratio;
    }
    this.page.drawImage(image, {
      x: this.width / 2 - width / 2,
      y: this.y - height,
      width,
      height,
    });
    this.y -= height + 14;
  }

  reserveTocPage() {
    this.addDecoratedPage("toc", stripPrintMarkup(this.model.title));
    return this.pages.length - 1;
  }

  fillToc(tocIndex: number) {
    const toc = this.pages[tocIndex];
    if (!toc) return;
    this.page = toc.page;
    toc.hasContent = true;
    const headingHeight = 72;
    const rowHeight = 22;
    const blockHeight = headingHeight + this.model.chapters.length * rowHeight;
    const available = this.contentTop() - this.contentBottom();
    this.y = this.contentBottom() + (available + blockHeight) / 2;
    this.drawCentered(
      stripPrintMarkup(this.model.tocTitle),
      this.y - 16,
      this.boldFont,
      16,
      COLORS.ink
    );
    this.y -= 28;
    this.doubleRule(this.y);
    this.y -= 28;

    this.model.chapters.forEach((chapter, index) => {
      const number = this.formatPageMark(this.chapterStartPrinted[index] ?? index + 1);
      const label = stripPrintMarkup(chapter.tabLabel);
      const numberWidth = this.measure(number, this.boldFont, 12);
      const labelWidth = this.measure(label, this.regularFont, 12);
      const dotWidth = this.measure(".", this.regularFont, 12);
      const gap = Math.max(
        18,
        this.contentWidth - labelWidth - numberWidth - 16
      );
      const dots = ".".repeat(Math.max(6, Math.floor(gap / dotWidth)));
      const baseline = this.y - 12;
      if (this.isRtl) {
        this.drawLineText(
          label,
          this.width - MARGIN_X,
          baseline,
          this.regularFont,
          12,
          COLORS.ink
        );
        this.drawLineText(
          dots,
          this.width - MARGIN_X - labelWidth - 6,
          baseline,
          this.regularFont,
          12,
          COLORS.line
        );
        this.drawLineText(
          number,
          MARGIN_X + numberWidth,
          baseline,
          this.boldFont,
          12,
          COLORS.ink
        );
      } else {
        this.page.drawText(number, {
          x: MARGIN_X,
          y: baseline,
          font: this.boldFont,
          size: 12,
          color: COLORS.ink,
        });
        this.page.drawText(dots, {
          x: MARGIN_X + numberWidth + 6,
          y: baseline,
          font: this.regularFont,
          size: 12,
          color: COLORS.line,
        });
        this.page.drawText(label, {
          x: this.width - MARGIN_X - labelWidth,
          y: baseline,
          font: this.regularFont,
          size: 12,
          color: COLORS.ink,
        });
      }
      const dest = this.chapterStartPages[index];
      if (dest) {
        this.addPageLink(
          toc.page,
          dest,
          MARGIN_X,
          baseline - 4,
          this.contentWidth,
          18
        );
      }
      this.y -= 22;
    });
  }

  drawChapter(chapter: HalachaPrintChapter) {
    const header = `${stripPrintMarkup(this.model.title)}  ·  ${stripPrintMarkup(chapter.tabLabel)}`;
    this.addDecoratedPage("chapter", header);
    this.chapterStartPrinted.push(this.printedNumberAt(this.pages.length - 1));
    this.chapterStartPages.push(this.page);
    this.y -= 6;
    this.drawParagraph(chapter.title, {
      font: this.boldFont,
      size: 16,
      align: "center",
      color: COLORS.ink,
    });
    this.y -= 4;
    this.doubleRule(this.y);
    this.y -= 18;
    this.drawParagraph(chapter.description, {
      size: 10,
      color: COLORS.muted,
      align: "center",
      width: this.contentWidth - 20,
    });
    this.y -= 10;

    const isFaq = chapter.id === "faq";
    for (const block of chapter.blocks) {
      if (isFaq) {
        this.drawFaqBlock(block);
      } else {
        this.drawBlock(block);
      }
    }
  }

  private drawFaqBlock(block: HalachaPrintBlock) {
    this.drawParagraph(block.title, {
      font: this.boldFont,
      size: 11.5,
      color: COLORS.ink,
    });
    this.y -= 2;
    this.drawParagraph(block.body, {
      size: 10.5,
      color: COLORS.ink,
      indent: 14,
    });
    this.y -= 12;
  }

  private drawBlock(block: HalachaPrintBlock) {
    const style = highlightStyle(block.highlight);
    const titleSize = 11.5;
    const bodySize = 10.5;
    const label = style
      ? style.labelKey === "practice"
        ? this.model.practiceLabel
        : this.model.cautionLabel
      : "";
    const title = stripPrintMarkup(block.title);
    const boxPad = style ? 10 : 0;
    const textWidth = this.contentWidth - boxPad * 2 - (style ? 8 : 0);
    const titleLines = this.wrap(
      title,
      this.boldFont,
      titleSize,
      textWidth - (block.number ? 22 : 0)
    );
    const bodyLines = this.wrap(
      block.body,
      this.regularFont,
      bodySize,
      textWidth
    );

    if (!style) {
      if (block.number) {
        this.drawNumberedTitle(block.number, titleLines, titleSize);
      } else {
        this.drawLines(titleLines, this.boldFont, titleSize, COLORS.ink);
      }
      this.drawLines(bodyLines, this.regularFont, bodySize, COLORS.ink);
      this.y -= 12;
      return;
    }

    this.drawBoxedLines({
      style,
      label,
      titleLines,
      bodyLines,
      titleSize,
      bodySize,
      number: block.number,
    });
  }

  private drawBoxedLines(params: {
    style: { bg: RGB; bar: RGB };
    label: string;
    titleLines: string[];
    bodyLines: string[];
    titleSize: number;
    bodySize: number;
    number?: string;
  }) {
    const lineGap = 5;
    const pad = 10;
    const indent = 8;
    const lines: Array<{ kind: "title" | "body"; text: string; height: number }> = [
      ...params.titleLines.map((text) => ({
        kind: "title" as const,
        text,
        height: params.titleSize + lineGap,
      })),
      ...params.bodyLines.map((text) => ({
        kind: "body" as const,
        text,
        height: params.bodySize + lineGap,
      })),
    ];

    let offset = 0;
    let firstFragment = true;
    let numbered = false;
    while (offset < lines.length) {
      const labelHeight = firstFragment ? 12 : 0;
      const minHeight = pad * 2 + labelHeight + 20;
      if (this.remainingHeight() < minHeight) {
        this.addDecoratedPage("chapter", this.header);
      }

      let used = pad + labelHeight;
      let count = 0;
      for (let cursor = offset; cursor < lines.length; cursor += 1) {
        const next = used + (lines[cursor]?.height ?? 0);
        if (count > 0 && next + pad > this.remainingHeight()) break;
        used = next;
        count += 1;
      }
      if (count === 0) {
        this.addDecoratedPage("chapter", this.header);
        continue;
      }

      const height = used + pad;
      this.markContent();
      this.page.drawRectangle({
        x: MARGIN_X,
        y: this.y - height,
        width: this.contentWidth,
        height,
        color: params.style.bg,
        borderColor: params.style.bar,
        borderWidth: 0.6,
      });
      this.page.drawRectangle({
        x: this.isRtl ? this.width - MARGIN_X - 4 : MARGIN_X,
        y: this.y - height,
        width: 4,
        height,
        color: params.style.bar,
      });
      this.y -= pad;

      if (firstFragment) {
        this.drawParagraph(params.label, {
          size: 8,
          color: params.style.bar,
          font: this.boldFont,
          indent,
          allowPageBreak: false,
        });
      }

      for (const item of lines.slice(offset, offset + count)) {
        if (item.kind === "title" && params.number && !numbered) {
          this.drawNumberedTitle(params.number, [item.text], params.titleSize, {
            indent,
            allowPageBreak: false,
          });
          numbered = true;
          continue;
        }
        const font = item.kind === "title" ? this.boldFont : this.regularFont;
        const size = item.kind === "title" ? params.titleSize : params.bodySize;
        this.drawLines([item.text], font, size, COLORS.ink, {
          indent,
          allowPageBreak: false,
        });
      }

      this.y -= pad;
      offset += count;
      firstFragment = false;
    }
    this.y -= 10;
  }

  private drawNumberedTitle(
    number: string,
    titleLines: string[],
    size: number,
    options: { indent?: number; allowPageBreak?: boolean } = {}
  ) {
    const radius = 8;
    const indent = options.indent ?? 0;
    if (options.allowPageBreak !== false) {
      this.ensureSpace(size + 8);
    }
    const baseline = this.y - size;
    const centerY = baseline + size * 0.32;
    const centerX = this.isRtl
      ? this.width - MARGIN_X - indent - radius
      : MARGIN_X + indent + radius;
    this.page.drawCircle({
      x: centerX,
      y: centerY,
      size: radius,
      color: COLORS.ink,
    });
    const numWidth = this.measure(number, this.boldFont, 8);
    this.drawLineText(
      number,
      this.isRtl ? centerX + numWidth / 2 : centerX - numWidth / 2,
      centerY - 3,
      this.boldFont,
      8,
      COLORS.paper
    );

    const first = titleLines[0] ?? "";
    this.drawLineText(
      first,
      this.startX(indent + radius * 2 + 8),
      baseline,
      this.boldFont,
      size,
      COLORS.ink
    );
    this.y -= size + 5;
    this.drawLines(titleLines.slice(1), this.boldFont, size, COLORS.ink, {
      indent: indent + radius * 2 + 8,
      allowPageBreak: options.allowPageBreak,
    });
  }

  finalize() {
    while (this.pages.length > 1) {
      const last = this.pages[this.pages.length - 1];
      if (last?.hasContent || last?.kind !== "chapter") break;
      this.pdfDoc.removePage(this.pdfDoc.getPageCount() - 1);
      this.pages.pop();
    }
    this.finishFooters();
  }
}

export function renderHalachaBooklet(
  pdfDoc: PDFDocument,
  regularFont: PDFFont,
  boldFont: PDFFont,
  model: HalachaPrintModel,
  logos: HalachaBookletLogos = {}
): void {
  const writer = new BookletWriter(
    pdfDoc,
    regularFont,
    boldFont,
    model,
    logos
  );
  writer.drawCover();
  const tocIndex = writer.reserveTocPage();
  for (const chapter of model.chapters) {
    writer.drawChapter(chapter);
  }
  writer.fillToc(tocIndex);
  writer.finalize();
}
