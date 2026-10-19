/**
 * A closed question about saved transactions. The model does not compute the number.
 */

import {
  DONATION_TYPE_MARKERS,
  EXPENSE_TYPE_MARKERS,
  INCOME_TYPE_MARKERS,
  MAX_MARKERS,
  QUESTION_MARKERS,
  TRANSACTION_VERBS,
  includesAlias,
} from "./phrase-aliases.ts";

export type YearTypeSum = {
  year: number;
  month: number | null;
  type: "donation" | "expense" | "income";
  measure: "sum" | "count" | "average" | "max";
  months: number;
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
  const index = month - 1 + delta;
  const targetYear = year + Math.floor(index / 12);
  const targetMonth = ((index % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clamped = Math.min(day, lastDay);
  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(clamped).padStart(2, "0")}`;
}

function addDays(iso: string, days: number): string {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const HEBREW_MONTH_WORDS: readonly (readonly [number, string])[] = [
  [10, "עשרת"],
  [10, "עשרה"],
  [10, "עשר"],
  [9, "תשעת"],
  [9, "תשעה"],
  [9, "תשע"],
  [8, "שמונת"],
  [8, "שמונה"],
  [7, "שבעת"],
  [7, "שבעה"],
  [7, "שבע"],
  [6, "ששת"],
  [6, "שישה"],
  [6, "שש"],
  [5, "חמשת"],
  [5, "חמישה"],
  [5, "חמש"],
  [4, "ארבעת"],
  [4, "ארבעה"],
  [4, "ארבע"],
  [3, "שלושת"],
  [3, "שלושה"],
  [3, "שלוש"],
];

function hasHebrewForm(text: string, word: string): boolean {
  let from = 0;
  while (from < text.length) {
    const at = text.indexOf(word, from);
    if (at < 0) return false;
    const after = text[at + word.length] ?? "";
    if (!/[א-ת]/.test(after)) return true;
    from = at + 1;
  }
  return false;
}

function recentMonthCount(text: string): number | null {
  const digit = text.match(/(\d{1,2})\s*ה?חודשים\s+ה?אחרונים/)
    ?? text.match(/last\s+(\d{1,2})\s+months?/);
  if (digit?.[1]) {
    const count = Number(digit[1]);
    if (count < 1 || count > 24) return null;
    return count;
  }
  if (!text.includes("אחרון") && !text.includes("אחרונים")) return null;
  if (text.includes("חודשיים")) return 2;
  if (text.includes("חודש אחרון") || text.includes("החודש האחרון")) return 1;
  if (!text.includes("חודשים")) return null;
  for (const [count, word] of HEBREW_MONTH_WORDS) {
    if (hasHebrewForm(text, word)) return count;
  }
  return null;
}

function isThisMonth(text: string): boolean {
  if (text.includes("חודשים") || text.includes("חודשיים") || text.includes("אחרון") || text.includes("אחרונים")) return false;
  return includesAlias(text, THIS_MONTH);
}

function monthEnd(year: number, month: number): string {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

const SUM_VERBS = [...TRANSACTION_VERBS, "הוצאתי", "spend", "נתתי", "הכנסתי", "יצא"] as const;
const COUNT_NOUNS = ["תרומות", "הוצאות", "הכנסות", "donations", "expenses"] as const;

function measureOf(text: string): YearTypeSum["measure"] {
  if (includesAlias(text, ["ממוצע", "average"])) return "average";
  if (includesAlias(text, MAX_MARKERS)) return "max";
  if (includesAlias(text, ["how many"])) return "count";
  if (includesAlias(text, ["how much"]) || includesAlias(text, SUM_VERBS)) return "sum";
  if (includesAlias(text, COUNT_NOUNS)) return "count";
  return "sum";
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
      months: recentMonths,
      year: todayYear,
      month: null,
      from: addDays(shiftMonths(today, -recentMonths), 1),
      to: today,
    };
  }
  if (isThisMonth(normalized)) {
    const month = String(todayMonth).padStart(2, "0");
    return {
      type,
      measure,
      months: 1,
      year: todayYear,
      month: todayMonth,
      from: `${todayYear}-${month}-01`,
      to: monthEnd(todayYear, todayMonth),
    };
  }
  const yearMatch = normalized.match(/\b(20\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : includesAlias(normalized, THIS_YEAR) ? todayYear : null;
  if (year === null || year < 2000 || year > 2099) return null;
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  return { type, measure, months: 12, year, month: null, from, to };
}

export function periodLabel(question: Pick<YearTypeSum, "year" | "month" | "from" | "to">): string {
  if (question.month) return `${question.month}/${question.year}`;
  if (question.from.endsWith("-01-01") && question.to.endsWith("-12-31")) return String(question.year);
  const day = (iso: string) => {
    const [year, month, date] = iso.split("-");
    return `${Number(date)}.${Number(month)}.${year}`;
  };
  return `${day(question.from)}–${day(question.to)}`;
}

export function typesForFamily(type: YearTypeSum["type"]): readonly string[] {
  if (type === "donation") return ["donation", "non_tithe_donation"];
  if (type === "income") return ["income", "exempt-income"];
  return ["expense", "recognized-expense"];
}
