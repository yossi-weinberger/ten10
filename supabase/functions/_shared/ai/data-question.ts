/**
 * A closed question about saved transactions. The model does not compute the number.
 */

import {
  DONATION_TYPE_MARKERS,
  EXPENSE_TYPE_MARKERS,
  INCOME_TYPE_MARKERS,
  QUESTION_MARKERS,
  includesAlias,
} from "./phrase-aliases.ts";

export type YearTypeSum = {
  year: number;
  type: "donation" | "expense" | "income";
};

const DONATION_QUESTION = [...DONATION_TYPE_MARKERS, "donated"] as const;
const EXPENSE_QUESTION = [...EXPENSE_TYPE_MARKERS, "spend", "הוצאתי"] as const;
const INCOME_QUESTION = [...INCOME_TYPE_MARKERS] as const;

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/־/g, " ").replace(/\s+/g, " ");
}

/** Sum of one transaction family in one calendar year. Null when the question is not that shape. */
export function parseYearTypeSum(text: string): YearTypeSum | null {
  const normalized = normalize(text);
  if (!includesAlias(normalized, QUESTION_MARKERS)) return null;
  const yearMatch = normalized.match(/\b(20\d{2})\b/);
  if (!yearMatch) return null;
  const year = Number(yearMatch[1]);
  if (year < 2000 || year > 2099) return null;
  if (includesAlias(normalized, DONATION_QUESTION)) return { year, type: "donation" };
  if (includesAlias(normalized, INCOME_QUESTION)) return { year, type: "income" };
  if (includesAlias(normalized, EXPENSE_QUESTION)) return { year, type: "expense" };
  return null;
}

export function typesForFamily(type: YearTypeSum["type"]): readonly string[] {
  if (type === "donation") return ["donation", "non_tithe_donation"];
  if (type === "income") return ["income", "exempt-income"];
  return ["expense", "recognized-expense"];
}
