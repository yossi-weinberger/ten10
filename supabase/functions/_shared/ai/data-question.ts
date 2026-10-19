/**
 * A closed question about saved transactions. The model does not compute the number.
 */

import {
  DONATION_TYPE_MARKERS,
  EXPENSE_TYPE_MARKERS,
  INCOME_TYPE_MARKERS,
  QUESTION_MARKERS,
  TRANSACTION_VERBS,
  includesAlias,
} from "./phrase-aliases.ts";

export type YearTypeSum = {
  year: number;
  month: number | null;
  type: "donation" | "expense" | "income";
  measure: "sum" | "count";
  from: string;
  to: string;
};

const DONATION_QUESTION = [...DONATION_TYPE_MARKERS, "donate", "תרומ"] as const;
const EXPENSE_QUESTION = [...EXPENSE_TYPE_MARKERS, "spend", "הוצא", "expense"] as const;
const INCOME_QUESTION = [...INCOME_TYPE_MARKERS, "הכנס", "income"] as const;
const THIS_MONTH = ["החודש", "this month"] as const;
const THIS_YEAR = ["השנה", "this year"] as const;

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/־/g, " ").replace(/\s+/g, " ");
}

function shiftMonths(iso: string, delta: number): string {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  const shifted = new Date(Date.UTC(year, month - 1 + delta, day));
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function recentMonthCount(text: string): number | null {
  const hebrew = text.match(/(\d{1,2})\s*חודשים אחרונים/);
  const english = text.match(/last\s+(\d{1,2})\s+months?/);
  const raw = hebrew?.[1] ?? english?.[1];
  if (!raw) return null;
  const count = Number(raw);
  if (count < 1 || count > 24) return null;
  return count;
}

function monthEnd(year: number, month: number): string {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

const SUM_VERBS = [...TRANSACTION_VERBS, "הוצאתי", "spend"] as const;

function measureOf(text: string): YearTypeSum["measure"] {
  if (includesAlias(text, ["how many"])) return "count";
  if (includesAlias(text, ["how much"])) return "sum";
  if (includesAlias(text, SUM_VERBS)) return "sum";
  return "count";
}

function family(text: string): YearTypeSum["type"] | null {
  if (includesAlias(text, DONATION_QUESTION)) return "donation";
  if (includesAlias(text, INCOME_QUESTION)) return "income";
  if (includesAlias(text, EXPENSE_QUESTION)) return "expense";
  return null;
}

/** Sum of one family in a year or in the current month. Null when the question is not that shape. */
export function parseYearTypeSum(text: string, today: string): YearTypeSum | null {
  const normalized = normalize(text);
  if (!includesAlias(normalized, QUESTION_MARKERS)) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return null;
  const type = family(normalized);
  if (!type) return null;
  const measure = measureOf(normalized);
  const todayYear = Number(today.slice(0, 4));
  const todayMonth = Number(today.slice(5, 7));
  const recentMonths = recentMonthCount(normalized);
  if (recentMonths !== null) {
    return {
      type,
      measure,
      year: todayYear,
      month: null,
      from: shiftMonths(today, -recentMonths),
      to: today,
    };
  }
  if (includesAlias(normalized, THIS_MONTH)) {
    const month = String(todayMonth).padStart(2, "0");
    return {
      type,
      measure,
      year: todayYear,
      month: todayMonth,
      from: `${todayYear}-${month}-01`,
      to: monthEnd(todayYear, todayMonth),
    };
  }
  const yearMatch = normalized.match(/\b(20\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : includesAlias(normalized, THIS_YEAR) ? todayYear : null;
  if (year === null || year < 2000 || year > 2099) return null;
  return { type, measure, year, month: null, from: `${year}-01-01`, to: `${year}-12-31` };
}

export function typesForFamily(type: YearTypeSum["type"]): readonly string[] {
  if (type === "donation") return ["donation", "non_tithe_donation"];
  if (type === "income") return ["income", "exempt-income"];
  return ["expense", "recognized-expense"];
}
