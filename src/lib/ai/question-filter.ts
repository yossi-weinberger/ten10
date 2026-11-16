import { nameSuggestions, type YearTypeSum } from "../../../supabase/functions/_shared/ai/data-question.ts";
import { matchSavedName } from "../../../supabase/functions/_shared/ai/recipient-draft.ts";
import { matchUserCategory } from "./match-category.ts";

export type QuestionFilter = {
  category: string | null;
  description: string | null;
  recipient: string | null;
};

export type MissingName = {
  missing: "category" | "recipient";
  name: string;
  suggestions: string[];
};

export type QuestionNameLists = {
  recipients: readonly string[];
  categories: readonly string[];
};

/** Exact saved name, or a question that offers the containing names. */
export function decideQuestionFilter(
  question: Pick<YearTypeSum, "recipient" | "topic">,
  lists: QuestionNameLists,
  searchDescriptions = false,
): QuestionFilter | MissingName {
  if (question.recipient) {
    const matched = matchSavedName(question.recipient, lists.recipients);
    if (matched) return { category: null, description: null, recipient: matched };
    if (searchDescriptions) return { category: null, description: question.recipient, recipient: null };
    return {
      missing: "recipient",
      name: question.recipient,
      suggestions: nameSuggestions(question.recipient, lists.recipients),
    };
  }
  if (!question.topic) return { category: null, description: null, recipient: null };
  const matched = matchUserCategory(question.topic, lists.categories);
  if (matched) return { category: matched, description: null, recipient: null };
  if (searchDescriptions) return { category: null, description: question.topic, recipient: null };
  return {
    missing: "category",
    name: question.topic,
    suggestions: nameSuggestions(question.topic, lists.categories),
  };
}
