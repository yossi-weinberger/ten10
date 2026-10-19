/**
 * A closed question about saved transactions. The model does not compute the number.
 */

import { getCalendarAdapter } from "../calendar/index.ts";
import { clampMaaserYearReportEnd, getCurrentMaaserYear, getMaaserYearRange } from "../calendar/maaser-year.ts";
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
  paymentMethod: string | null;
  topic: string | null;
  recipient: string | null;
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
  const prefixes = "בהוכלמש";
  let from = 0;
  while (from < text.length) {
    const at = text.indexOf(word, from);
    if (at < 0) return false;
    const before = at === 0 ? "" : text[at - 1] ?? "";
    const after = text[at + word.length] ?? "";
    const afterOk = after === "" || !/[א-ת]/.test(after);
    const beforeIsLetter = /[א-ת]/.test(before);
    const singlePrefix = beforeIsLetter && prefixes.includes(before) && (at < 2 || !/[א-ת]/.test(text[at - 2] ?? ""));
    const beforeOk = !beforeIsLetter || singlePrefix;
    const maaser = before === "מ" && (word === "עשר" || word === "עשרה" || word === "עשרת");
    if (afterOk && beforeOk && !maaser) return true;
    from = at + 1;
  }
  return false;
}

function recentMonthCount(text: string): number | null {
  if (
    text.includes("חצי השנה")
    || text.includes("חצי שנה")
    || text.includes("last six months")
    || text.includes("past six months")
  ) {
    return 6;
  }
  const digit = text.match(/(\d{1,2})\s*ה?חודשים\s+ה?אחרונים/)
    ?? text.match(/last\s+(\d{1,2})\s+months?/);
  if (digit?.[1]) {
    const count = Number(digit[1]);
    if (count < 1 || count > 24) return null;
    return count;
  }
  if (!text.includes("אחרון") && !text.includes("אחרונים") && !text.includes("אחרונה")) return null;
  if (text.includes("חודשיים")) return 2;
  if (text.includes("חודש אחרון") || text.includes("החודש האחרון") || text.includes("חודש האחרון")) return 1;
  if (!text.includes("חודשים")) return null;
  if (
    hasHebrewForm(text, "שנים עשר")
    || hasHebrewForm(text, "שניים עשר")
    || hasHebrewForm(text, "שתים עשרה")
    || hasHebrewForm(text, "שתיים עשרה")
  ) {
    return 12;
  }
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

const PAYMENT_TOPICS = [
  ["debit_card", ["בכרטיס דביט", "כרטיס דביט", "בדביט", "דביט", "debit"]],
  ["bank_transfer", ["העברה בנקאית", "בהעברה", "העברה", "transfer"]],
  ["bit_paybox", ["בביט", "ביט", "פייבוקס", "paybox"]],
  ["paypal", ["paypal", "פייפאל"]],
  ["credit_card", ["באשראי", "אשראי", "credit"]],
  ["cash", ["במזומן", "מזומן", "cash"]],
  ["check", ["בצ'ק", "בצ׳ק", "צ'ק", "צ׳ק", "cheque", "by check"]],
] as const;

function hasToken(text: string, token: string): boolean {
  let from = 0;
  while (from < text.length) {
    const at = text.indexOf(token, from);
    if (at < 0) return false;
    const before = at === 0 ? "" : text[at - 1] ?? "";
    const after = text[at + token.length] ?? "";
    const letter = /[א-תa-z0-9]/i;
    const singlePrefix = (before === "ו" || before === "ב") && (at < 2 || !letter.test(text[at - 2] ?? ""));
    const beforeOk = before === "" || !letter.test(before) || singlePrefix;
    const afterOk = after === "" || !letter.test(after);
    if (beforeOk && afterOk) return true;
    from = at + 1;
  }
  return false;
}

const TOPIC_TAIL = new Set([
  "השנה",
  "החודש",
  "האחרונים",
  "האחרון",
  "האחרונה",
  "שעברה",
  "שעבר",
  "חודשים",
  "חודש",
  "החודשים",
  "months",
  "month",
  "last",
  "this",
  "year",
]);

function cleanTopicWord(word: string): string {
  return word.replace(/^[^0-9A-Za-z\u0590-\u05FF]+|[^0-9A-Za-z\u0590-\u05FF]+$/g, "").replace(/[-־]/g, "");
}

function looksLikeDateToken(word: string): boolean {
  const compact = word.replace(/[-־]/g, "");
  return /\d{1,2}[./]\d{1,2}[./]\d{4}/.test(compact)
    || /20\d{2}-\d{2}-\d{2}/.test(word)
    || compact === "עד"
    || compact === "מ"
    || /^מ\d/.test(compact);
}

function isTopicTail(word: string): boolean {
  const compact = cleanTopicWord(word).toLowerCase();
  const withoutBet = compact.startsWith("ב") ? compact.slice(1) : compact;
  if (TOPIC_TAIL.has(compact) || TOPIC_TAIL.has(withoutBet)) return true;
  if (/^20\d{2}$/.test(compact) || /^20\d{2}$/.test(withoutBet)) return true;
  if (compact === "in" || compact === "of" || compact === "the" || compact === "שנה" || withoutBet === "שנה") return true;
  if (looksLikeDateToken(word)) return true;
  return [
    "באשראי", "אשראי", "במזומן", "מזומן", "בביט", "ביט", "בדביט", "דביט",
    "בהעברה", "העברה", "cash", "credit", "debit", "transfer", "cheque",
  ].includes(compact);
}

const RECIPIENT_STOP = new Set([
  "צדקה", "תרומה", "עניים", "מעשר", "כל", "פי", "לפי",
  "charity", "the", "donation", "tzedaka", "tzedakah",
]);

function recipientPhrase(text: string): string | null {
  const prepared = text.replace(/ל[-־]/g, "ל");
  const hebrew = prepared.match(/(?:^|\s)ל([א-ת][א-ת"״׳']*(?:\s+[א-ת][א-ת"״׳']*)*)/);
  const english = prepared.match(/\bto\s+(?:the\s+)?([a-z][a-z0-9'"]*(?:\s+[a-z][a-z0-9'"]*)*)/i);
  const raw = hebrew?.[1] ?? english?.[1] ?? "";
  if (!raw || raw.startsWith("פי") || raw.startsWith("כל")) return null;
  const words: string[] = [];
  for (const part of raw.split(/\s+/)) {
    const word = cleanTopicWord(part);
    if (!word) continue;
    if (isTopicTail(word)) break;
    words.push(word);
  }
  if (words.length === 0 || RECIPIENT_STOP.has(words[0].toLowerCase())) return null;
  return words.join(" ");
}

function parseDmy(day: string, month: string, year: string): string | null {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (y < 2000 || y > 2099 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return iso;
}

function customRange(text: string): { from: string; to: string } | null {
  const iso = text.match(/(20\d{2}-\d{2}-\d{2}).{0,16}(20\d{2}-\d{2}-\d{2})/);
  if (iso?.[1] && iso[2] && iso[1] <= iso[2]) return { from: iso[1], to: iso[2] };
  const dmy = text.match(/(\d{1,2})[./](\d{1,2})[./](20\d{2})\D+(\d{1,2})[./](\d{1,2})[./](20\d{2})/);
  if (!dmy) return null;
  const from = parseDmy(dmy[1], dmy[2], dmy[3]);
  const to = parseDmy(dmy[4], dmy[5], dmy[6]);
  if (!from || !to || from > to) return null;
  return { from, to };
}

function hasDateAttempt(text: string): boolean {
  return /\d{1,2}[./]\d{1,2}[./]\d{2,4}/.test(text) || /20\d{2}-\d{2}-\d{2}/.test(text);
}

function hebrewMonthsBetween(from: string, to: string): number {
  const hebrew = getCalendarAdapter("hebrew");
  const start = hebrew.fromIsoDate(from);
  const end = hebrew.fromIsoDate(to);
  let year = start.year;
  let month = start.month;
  let count = 0;
  while (count < 16) {
    count += 1;
    if (year === end.year && month === end.month) break;
    const yearLength = hebrew.fromIsoDate(
      hebrew.toIsoDate({ year, month: 1, day: 1 }, "reject"),
    ).monthsInYear;
    month += 1;
    if (month > yearLength) {
      month = 1;
      year += 1;
    }
  }
  return count < 1 ? 1 : count;
}

function monthsBetween(from: string, to: string): number {
  const span = (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12
    + (Number(to.slice(5, 7)) - Number(from.slice(5, 7)))
    + 1;
  return span < 1 ? 1 : span;
}

function topicPhrase(text: string): string | null {
  const match = text.match(/(?:^|\s)על\s+(.+)$/) ?? text.match(/\bon\s+(.+)$/);
  if (!match?.[1]) return null;
  const words: string[] = [];
  for (const raw of match[1].split(" ")) {
    const word = cleanTopicWord(raw);
    if (!word) continue;
    if (isTopicTail(word)) break;
    words.push(word);
  }
  const phrase = words.join(" ").trim();
  if (phrase.length < 2) return null;
  return phrase;
}

function paymentMethodOf(text: string): string | null | "ambiguous" {
  const hits = PAYMENT_TOPICS.filter(([, markers]) => markers.some((marker) => hasToken(text, marker)));
  if (hits.length > 1) return "ambiguous";
  return hits[0]?.[0] ?? null;
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
  const paymentMethod = paymentMethodOf(normalized);
  if (paymentMethod === "ambiguous") return null;
  const topic = topicPhrase(normalized);
  const recipient = type === "donation" ? recipientPhrase(normalized) : null;
  const todayYear = Number(today.slice(0, 4));
  const todayMonth = Number(today.slice(5, 7));
  const span = customRange(normalized);
  if (!span && hasDateAttempt(normalized)) return null;
  if (span) {
    return {
      type,
      measure,
      months: monthsBetween(span.from, span.to),
      paymentMethod,
      topic,
      recipient,
      year: Number(span.from.slice(0, 4)),
      month: null,
      from: span.from,
      to: span.to,
    };
  }
  if (normalized.includes("שנת מעשר") || normalized.includes("שנת המעשר") || normalized.includes("maaser year") || normalized.includes("tithe year")) {
    const previous = normalized.includes("שעברה")
      || normalized.includes("הקודמת")
      || normalized.includes("הקודם")
      || normalized.includes("last maaser")
      || normalized.includes("last tithe")
      || normalized.includes("previous");
    const hebrewYear = previous
      ? getCurrentMaaserYear(today) - 1
      : getCurrentMaaserYear(today);
    const range = getMaaserYearRange(hebrewYear);
    const to = clampMaaserYearReportEnd(range, today);
    return {
      type,
      measure,
      months: hebrewMonthsBetween(range.startDate, to),
      paymentMethod,
      topic,
      recipient,
      year: hebrewYear,
      month: null,
      from: range.startDate,
      to,
    };
  }
  const recentMonths = recentMonthCount(normalized);
  if (recentMonths !== null) {
    return {
      type,
      measure,
      months: recentMonths,
      paymentMethod,
      topic,
      recipient,
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
      paymentMethod,
      topic,
      recipient,
      year: todayYear,
      month: todayMonth,
      from: `${todayYear}-${month}-01`,
      to: monthEnd(todayYear, todayMonth),
    };
  }
  const lastYear = normalized.includes("השנה שעברה")
    || normalized.includes("שנה שעברה")
    || normalized.includes("last year");
  const yearMatch = normalized.match(/\b(20\d{2})\b/);
  const year = lastYear
    ? todayYear - 1
    : yearMatch
      ? Number(yearMatch[1])
      : includesAlias(normalized, THIS_YEAR)
        ? todayYear
        : null;
  if (year === null || year < 2000 || year > 2099) return null;
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const months = year === todayYear ? todayMonth : 12;
  return { type, measure, months, paymentMethod, topic, recipient, year, month: null, from, to };
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
