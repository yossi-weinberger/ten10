import { categoryCriterion } from "../transaction-domain/category-keys.ts";
import { AI_DRAFT_ALLOWED_TYPES } from "../transaction-domain/transaction-types.ts";
import { JEV_DUPLICATE_MODEL, JEV_SYSTEMONE_URL } from "./jev-duplicate-rank.ts";

export { JEV_SYSTEMONE_URL };

const MAX_DESCRIPTION = 200;

const TYPE_CRITERIA: Record<(typeof AI_DRAFT_ALLOWED_TYPES)[number], string> = {
  expense: "Ordinary spending. It does not change the tithe balance.",
  income: "Income that is subject to tithe.",
  "exempt-income": "Income that is exempt from tithe.",
  donation: "A tithe donation.",
  "recognized-expense": "A recognized expense that reduces the tithe base.",
  non_tithe_donation: "A gift that is not paid from tithe.",
};

export interface TypeChoiceInput {
  description: string;
  amount: number;
  currency: string;
  date: string;
}

export function buildTypeChoiceBody(input: TypeChoiceInput): {
  model: string;
  state: { description: string; amount: number; currency: string; date: string };
  questions: {
    transaction_type: {
      type: "choice";
      instructions: string;
      criteria: typeof TYPE_CRITERIA;
    };
  };
} {
  return {
    model: JEV_DUPLICATE_MODEL,
    state: {
      description: input.description.slice(0, MAX_DESCRIPTION),
      amount: input.amount,
      currency: input.currency.trim().toUpperCase().slice(0, 8),
      date: input.date,
    },
    questions: {
      transaction_type: {
        type: "choice",
        instructions: "Which transaction type matches the state?",
        criteria: TYPE_CRITERIA,
      },
    },
  };
}

export function categoryBase(type: string): "income" | "expense" | null {
  if (type === "expense" || type === "recognized-expense") return "expense";
  if (type === "income" || type === "exempt-income") return "income";
  return null;
}

export function buildShadowBody(input: TypeChoiceInput & {
  includeType: boolean;
  categoryBase: "income" | "expense" | null;
  categories: readonly string[];
}): {
  model: string;
  state: { description: string; amount: number; currency: string; date: string };
  questions: Record<string, { type: "choice"; instructions: string; criteria: Record<string, string> }>;
} | null {
  const questions: Record<string, { type: "choice"; instructions: string; criteria: Record<string, string> }> = {};
  if (input.includeType) {
    questions.transaction_type = buildTypeChoiceBody(input).questions.transaction_type;
  }
  const categories = [...new Set(input.categories.map((category) => category.trim()).filter((category) => category.length > 0))].slice(0, 255);
  if (input.categoryBase && categories.length >= 2) {
    const criteria: Record<string, string> = {};
    for (const category of categories) {
      criteria[category] = categoryCriterion(input.categoryBase, category);
    }
    questions.category = {
      type: "choice",
      instructions: "Which category matches the state?",
      criteria,
    };
  }
  if (Object.keys(questions).length === 0) return null;
  return {
    model: JEV_DUPLICATE_MODEL,
    state: buildTypeChoiceBody(input).state,
    questions,
  };
}

export function readShadowChoice(
  payload: unknown,
  questionId: string,
  allowed: readonly string[],
): { choice: string; confidence: number | null } | null {
  if (!payload || typeof payload !== "object") return null;
  const answers = (payload as { answers?: unknown }).answers;
  if (!answers || typeof answers !== "object") return null;
  const answer = (answers as Record<string, unknown>)[questionId];
  if (!answer || typeof answer !== "object") return null;
  const choice = (answer as { choice?: unknown }).choice;
  if (typeof choice !== "string" || !allowed.includes(choice)) return null;
  const confidence = (answer as { confidence?: unknown }).confidence;
  return {
    choice,
    confidence: typeof confidence === "number" && confidence >= 0 && confidence <= 1 ? confidence : null,
  };
}

export function readTypeChoice(payload: unknown): { choice: string; confidence: number | null } | null {
  return readShadowChoice(payload, "transaction_type", AI_DRAFT_ALLOWED_TYPES);
}
