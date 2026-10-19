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

export function readTypeChoice(payload: unknown): { choice: string; confidence: number | null } | null {
  if (!payload || typeof payload !== "object") return null;
  const answers = (payload as { answers?: unknown }).answers;
  if (!answers || typeof answers !== "object") return null;
  const answer = (answers as { transaction_type?: unknown }).transaction_type;
  if (!answer || typeof answer !== "object") return null;
  const choice = (answer as { choice?: unknown }).choice;
  if (typeof choice !== "string" || !AI_DRAFT_ALLOWED_TYPES.includes(choice as (typeof AI_DRAFT_ALLOWED_TYPES)[number])) {
    return null;
  }
  const confidence = (answer as { confidence?: unknown }).confidence;
  return {
    choice,
    confidence: typeof confidence === "number" && confidence >= 0 && confidence <= 1 ? confidence : null,
  };
}
