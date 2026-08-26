import i18n from "@/lib/i18n";
import { getTypedTranslation } from "@/components/halacha/utils";
import {
  type HalachaPrintBlock,
  type HalachaPrintChapter,
  type HalachaPrintModel,
  type PrintHighlight,
} from "./print-model";

const CONTENT_NAMESPACES = [
  "halacha-common",
  "halacha-introduction",
  "halacha-principles",
  "halacha-faq",
  "halacha-tithes",
  "halacha-income",
  "halacha-expenses",
  "halacha-chomesh",
] as const;

type ChapterKind = "content" | "principles" | "faq";

const CHAPTERS: Array<{ id: string; tabKey: string; ns: string; kind: ChapterKind }> =
  [
    { id: "introduction", tabKey: "tabs.introduction", ns: "halacha-introduction", kind: "content" },
    { id: "principles", tabKey: "tabs.principles", ns: "halacha-principles", kind: "principles" },
    { id: "faq", tabKey: "tabs.faq", ns: "halacha-faq", kind: "faq" },
    { id: "tithes", tabKey: "tabs.tithes", ns: "halacha-tithes", kind: "content" },
    { id: "income", tabKey: "tabs.income", ns: "halacha-income", kind: "content" },
    { id: "expenses", tabKey: "tabs.expenses", ns: "halacha-expenses", kind: "content" },
    { id: "chomesh", tabKey: "tabs.chomesh", ns: "halacha-chomesh", kind: "content" },
  ];

function highlightOf(item: {
  isHighlighted?: boolean;
  isImportant?: boolean;
}): PrintHighlight {
  if (item.isHighlighted) return "highlight";
  if (item.isImportant) return "important";
  return null;
}

function collectChapter(
  spec: (typeof CHAPTERS)[number]
): HalachaPrintChapter {
  const t = (key: string, options?: { returnObjects: boolean }) =>
    i18n.t(key, { ns: spec.ns, ...options });

  const tabLabel = i18n.t(spec.tabKey, { ns: "halacha-common" });
  const title = i18n.t("cardTitle", { ns: spec.ns });
  const description = i18n.t("cardDescription", { ns: spec.ns });

  switch (spec.kind) {
    case "content": {
      const introduction = getTypedTranslation(t, "introduction", {
        title: "",
        body: "",
      });
      const sourcesData = t("sources", { returnObjects: true });
      const sources =
        typeof sourcesData === "object" &&
        sourcesData !== null &&
        !Array.isArray(sourcesData)
          ? (sourcesData as { title: string; body: string })
          : null;
      const content = getTypedTranslation(t, "content", [] as Array<{
        title: string;
        body: string;
        isHighlighted?: boolean;
        isImportant?: boolean;
      }>);
      const blocks: HalachaPrintBlock[] = [];
      if (introduction.title || introduction.body) {
        blocks.push({
          title: introduction.title,
          body: introduction.body,
        });
      }
      if (sources && (sources.title || sources.body)) {
        blocks.push({ title: sources.title, body: sources.body });
      }
      for (const item of Array.isArray(content) ? content : []) {
        if (!(item.title ?? "").trim() && !(item.body ?? "").trim()) continue;
        blocks.push({
          title: item.title,
          body: item.body,
          highlight: highlightOf(item),
        });
      }
      return { id: spec.id, tabLabel, title, description, blocks };
    }
    case "principles": {
      const introduction = getTypedTranslation(t, "introduction", {
        title: "",
        body: "",
      });
      const principles = getTypedTranslation(t, "principles", [] as Array<{
        number: string;
        title: string;
        body: string;
        isHighlighted?: boolean;
        isImportant?: boolean;
      }>);
      const blocks: HalachaPrintBlock[] = [];
      if (introduction.title || introduction.body) {
        blocks.push({
          title: introduction.title,
          body: introduction.body,
        });
      }
      for (const principle of Array.isArray(principles) ? principles : []) {
        blocks.push({
          number: principle.number,
          title: principle.title,
          body: principle.body,
          highlight: highlightOf(principle),
        });
      }
      return { id: spec.id, tabLabel, title, description, blocks };
    }
    case "faq": {
      const questions = getTypedTranslation(t, "questions", [] as Array<{
        question: string;
        answer: string;
      }>);
      return {
        id: spec.id,
        tabLabel,
        title,
        description,
        blocks: (Array.isArray(questions) ? questions : []).map((item) => ({
          title: item.question,
          body: item.answer,
        })),
      };
    }
    default: {
      const _never: never = spec.kind;
      throw new Error(`Unhandled chapter kind: ${_never}`);
    }
  }
}

export function collectHalachaPrintModel(): HalachaPrintModel {
  const language = i18n.language.startsWith("en") ? "en" : "he";
  const printedOnDate = new Date().toLocaleDateString(i18n.language, {
    dateStyle: "long",
  });

  return {
    language,
    dir: language === "he" ? "rtl" : "ltr",
    title: i18n.t("pageTitle", { ns: "halacha-common" }),
    subtitle: i18n.t("pageDescription", { ns: "halacha-common" }),
    bookletKind: i18n.t("bookletKind", { ns: "halacha-common" }),
    practiceLabel: i18n.t("practiceLabel", { ns: "halacha-common" }),
    cautionLabel: i18n.t("cautionLabel", { ns: "halacha-common" }),
    printedOn: i18n.t("printedOn", { ns: "halacha-common", date: printedOnDate }),
    creditAuthor: i18n.t("creditAuthor", { ns: "halacha-common" }),
    creditApp: i18n.t("creditApp", { ns: "halacha-common" }),
    creditDetails: i18n.t("creditDetails", { ns: "halacha-common" }),
    landingLabel: i18n.t("creditLanding", { ns: "halacha-common" }),
    emailLabel: i18n.t("creditEmail", { ns: "halacha-common" }),
    tocTitle: i18n.t("tocTitle", { ns: "halacha-common" }),
    chapters: CHAPTERS.map(collectChapter),
  };
}

export async function prepareHalachaPrintModel(): Promise<HalachaPrintModel> {
  await i18n.loadNamespaces([...CONTENT_NAMESPACES]);
  return collectHalachaPrintModel();
}
