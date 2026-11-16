import i18n from "@/lib/i18n";
import { formatCategory } from "@/lib/category-registry";

export type DataAnswerMeasure = "sum" | "count" | "average" | "max";
export type DataAnswerType = "donation" | "expense" | "income";

export type DataAnswerInput = {
  measure: DataAnswerMeasure;
  count: number;
  year: string;
  type: DataAnswerType;
  amount: string;
  paymentMethod: string | null;
  recipient: string | null;
  category: string | null;
  language: string;
};

function answerLanguage(language: string): "en" | "he" {
  return language.toLowerCase().startsWith("en") ? "en" : "he";
}

function answerKey(input: DataAnswerInput): string {
  switch (input.measure) {
    case "count":
      return "aiIntake.dataCount";
    case "average":
      return "aiIntake.dataAverage";
    case "max":
      return input.count === 0 ? "aiIntake.dataMaxEmpty" : "aiIntake.dataMax";
    case "sum":
      return "aiIntake.dataAnswer";
    default: {
      const unreachable: never = input.measure;
      return unreachable;
    }
  }
}

function categoryBase(type: DataAnswerType): "income" | "expense" | undefined {
  if (type === "income") return "income";
  if (type === "expense") return "expense";
  return undefined;
}

/** The sentence names a recipient inside the count, and a category by its label. */
export function formatDataAnswer(input: DataAnswerInput): string {
  const language = answerLanguage(input.language);
  const recipient = input.recipient?.trim() ?? "";
  const recipientClause = recipient
    ? language === "en" ? ` to "${recipient}"` : ` ל«${recipient}»`
    : "";
  const sentence = i18n.t(answerKey(input), {
    lng: language,
    ns: "navigation",
    count: input.count,
    year: input.year,
    type: i18n.t(`aiIntake.types.${input.type}`, { lng: language, ns: "navigation" }),
    typePlural: i18n.t(`aiIntake.typesPlural.${input.type}`, { lng: language, ns: "navigation" }),
    amount: input.amount,
    recipientClause,
  });
  const payment = input.paymentMethod
    ? ` (${i18n.t(`transactionForm.paymentMethod.options.${input.paymentMethod}`, { lng: language, ns: "transactions" })})`
    : "";
  const category = input.category
    ? formatCategory(categoryBase(input.type), input.category, language)
    : "";
  const suffix = `${payment}${category ? ` (${category})` : ""}`;
  if (!suffix) return sentence;
  if (sentence.endsWith(".")) return `${sentence.slice(0, -1)}${suffix}.`;
  return `${sentence}${suffix}`;
}
