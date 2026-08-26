import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PDFDocument, PDFName } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { describe, expect, it } from "vitest";
import { renderHalachaBooklet } from "./write-halacha-booklet";
import type {
  HalachaPrintBlock,
  HalachaPrintChapter,
  HalachaPrintModel,
} from "./print-model";

const sampleModel: HalachaPrintModel = {
  language: "he",
  dir: "rtl",
  title: "הלכות מעשר כספים",
  subtitle: "מידע והלכות בנושא מעשר כספים וחומש",
  bookletKind: "קונטרס הלכתי",
  practiceLabel: "הלכה למעשה",
  cautionLabel: "לזהירות",
  printedOn: "הודפס ב-26 באוגוסט 2026",
  creditAuthor: 'נכתב על ידי הרב צבי וינברגר, ראש מכון "תורת האדם לאדם"',
  creditApp: "הודפס מתוך מערכת Ten10 — ניהול מעשרות",
  creditDetails: "לפרטים:",
  landingLabel: "דף נחיתה",
  emailLabel: "צור קשר",
  tocTitle: "תוכן עניינים",
  chapters: [
    {
      id: "introduction",
      tabLabel: "מבוא",
      title: "מבוא",
      description: "פרק קצר",
      blocks: [
        {
          title: "מקור",
          body: "ראו מלאכי ג', י' וגם https://ten10-app.com/landing contact@ten10-app.com",
        },
      ],
    },
    {
      id: "faq",
      tabLabel: "שאלות נפוצות",
      title: "שאלות נפוצות",
      description: "שאלות ותשובות",
      blocks: [
        {
          title: "האם צריך לתת 10%?",
          body: "כן, זה הכלל הבסיסי ב-Ten10.",
        },
      ],
    },
  ],
};

describe("renderHalachaBooklet", () => {
  it("keeps Latin, URLs, and dates readable and avoids an empty last page", async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const regular = await pdfDoc.embedFont(
      readFileSync(resolve("public/fonts/Rubik-Regular.ttf"))
    );
    const bold = await pdfDoc.embedFont(
      readFileSync(resolve("public/fonts/Rubik-Medium.ttf"))
    );

    renderHalachaBooklet(pdfDoc, regular, bold, sampleModel);

    expect(pdfDoc.getPageCount()).toBe(4);
    expect(pdfDoc.getPage(1).node.has(PDFName.of("Annots"))).toBe(true);
    const bytes = await pdfDoc.save();
    const reloaded = await PDFDocument.load(bytes);
    expect(reloaded.getPageCount()).toBe(4);
  });

  it("renders the full Hebrew booklet without an empty trailing page", async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const regular = await pdfDoc.embedFont(
      readFileSync(resolve("public/fonts/Rubik-Regular.ttf"))
    );
    const bold = await pdfDoc.embedFont(
      readFileSync(resolve("public/fonts/Rubik-Medium.ttf"))
    );
    const institute = await pdfDoc.embedPng(
      readFileSync(resolve("public/halacha/machon-semel.png"))
    );

    renderHalachaBooklet(pdfDoc, regular, bold, loadHebrewBookletModel(), {
      institute,
    });

    const pageCount = pdfDoc.getPageCount();
    expect(pageCount).toBeGreaterThanOrEqual(10);
    expect(pageCount).toBeLessThan(20);

    const bytes = await pdfDoc.save();
    const reloaded = await PDFDocument.load(bytes);
    expect(reloaded.getPageCount()).toBe(pageCount);
  });
});

function loadJson(name: string) {
  return JSON.parse(
    readFileSync(resolve(`public/locales/he/${name}.json`), "utf8")
  );
}

function highlightOf(item: {
  isHighlighted?: boolean;
  isImportant?: boolean;
}) {
  if (item.isHighlighted) return "highlight" as const;
  if (item.isImportant) return "important" as const;
  return null;
}

function contentChapter(
  id: string,
  tabLabel: string,
  data: {
    cardTitle: string;
    cardDescription: string;
    introduction?: { title: string; body: string };
    sources?: { title: string; body: string };
    content?: Array<{
      title: string;
      body: string;
      isHighlighted?: boolean;
      isImportant?: boolean;
    }>;
  }
): HalachaPrintChapter {
  const blocks: HalachaPrintBlock[] = [];
  if (data.introduction?.title || data.introduction?.body) {
    blocks.push({
      title: data.introduction.title,
      body: data.introduction.body,
    });
  }
  if (data.sources?.title || data.sources?.body) {
    blocks.push({ title: data.sources.title, body: data.sources.body });
  }
  for (const item of data.content ?? []) {
    blocks.push({
      title: item.title,
      body: item.body,
      highlight: highlightOf(item),
    });
  }
  return {
    id,
    tabLabel,
    title: data.cardTitle,
    description: data.cardDescription,
    blocks,
  };
}

function loadHebrewBookletModel(): HalachaPrintModel {
  const common = loadJson("halacha-common");
  const principles = loadJson("halacha-principles");
  const faq = loadJson("halacha-faq");
  return {
    language: "he",
    dir: "rtl",
    title: common.pageTitle,
    subtitle: common.pageDescription,
    bookletKind: common.bookletKind,
    practiceLabel: common.practiceLabel,
    cautionLabel: common.cautionLabel,
    printedOn: "הודפס ב-26 באוגוסט 2026",
    creditAuthor: common.creditAuthor,
    creditApp: common.creditApp,
    creditDetails: common.creditDetails,
    landingLabel: common.creditLanding,
    emailLabel: common.creditEmail,
    tocTitle: common.tocTitle,
    chapters: [
      contentChapter(
        "introduction",
        common.tabs.introduction,
        loadJson("halacha-introduction")
      ),
      {
        id: "principles",
        tabLabel: common.tabs.principles,
        title: principles.cardTitle,
        description: principles.cardDescription,
        blocks: [
          {
            title: principles.introduction.title,
            body: principles.introduction.body,
          },
          ...principles.principles.map(
            (item: {
              number: string;
              title: string;
              body: string;
              isHighlighted?: boolean;
              isImportant?: boolean;
            }) => ({
              number: item.number,
              title: item.title,
              body: item.body,
              highlight: highlightOf(item),
            })
          ),
        ],
      },
      {
        id: "faq",
        tabLabel: common.tabs.faq,
        title: faq.cardTitle,
        description: faq.cardDescription,
        blocks: faq.questions.map(
          (item: { question: string; answer: string }) => ({
            title: item.question,
            body: item.answer,
          })
        ),
      },
      contentChapter("tithes", common.tabs.tithes, loadJson("halacha-tithes")),
      contentChapter("income", common.tabs.income, loadJson("halacha-income")),
      contentChapter(
        "expenses",
        common.tabs.expenses,
        loadJson("halacha-expenses")
      ),
      contentChapter("chomesh", common.tabs.chomesh, loadJson("halacha-chomesh")),
    ],
  };
}
