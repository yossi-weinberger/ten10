/**
 * Pulls a transaction draft out of text with rules only.
 * Phrases live in phrase-aliases.ts. Amount and currency stay as written.
 */

import {
  AMOUNT_CURRENCY_WORDS,
  AMOUNT_UNIT_WORDS,
  BIT_MARKERS,
  CASH_MARKERS,
  CHECK_MARKERS,
  CREDIT_MARKERS,
  DATE_MINUS_ONE,
  DATE_MINUS_TWO,
  DATE_WORDS,
  LAST_WEEKDAYS,
  DONATION_TYPE_MARKERS,
  EUR_MARKERS,
  EXPENSE_TYPE_MARKERS,
  FOOD_MARKERS,
  INCOME_TYPE_MARKERS,
  ITEM_SEPARATORS,
  DAY_OF_MONTH_SUFFIXES,
  MONTH_NAMES,
  MONTHLY_MARKERS,
  PERCENT_OF_WORDS,
  PERCENT_WORDS,
  RATE_MARKERS,
  YEAR_MARKERS,
  TRANSFER_MARKERS,
  TRANSPORT_MARKERS,
  USD_MARKERS,
  includesAlias,
} from "./phrase-aliases.ts";

export interface TextTransactionDraft {
  date: string;
  amount: number;
  currency: "ILS" | "USD" | "EUR";
  type:
    | "expense"
    | "income"
    | "donation"
    | "exempt-income"
    | "recognized-expense"
    | "non_tithe_donation";
  requestedRate: number | null;
  description: string;
  category: "food" | "transportation" | null;
  paymentMethod: "credit_card" | "cash" | "bank_transfer" | "bit_paybox" | "check" | null;
}

function addIsoDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function parseNumber(raw: string): number | null {
  const trimmed = raw.trim();
  const thousands = trimmed.match(/^(\d{1,3}(?:,\d{3})+)(?:\.(\d+))?$/);
  if (thousands) {
    const whole = thousands[1].replace(/,/g, "");
    const fraction = thousands[2] ?? "";
    const value = Number(fraction ? `${whole}.${fraction}` : whole);
    return Number.isFinite(value) ? value : null;
  }

  const normalized = trimmed.replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wordsPattern(aliases: readonly string[]): string {
  return aliases.map(escapeRegExp).join("|");
}

function weekdayOf(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** Previous occurrence of weekday. Sunday is 0. Today itself counts as seven days ago. */
function previousWeekday(today: string, weekday: number): string {
  const delta = (weekdayOf(today) - weekday + 7) % 7 || 7;
  return addIsoDays(today, -delta);
}

function resolveDate(text: string, today: string): string {
  for (const entry of LAST_WEEKDAYS) {
    if (includesAlias(text, entry.phrases)) return previousWeekday(today, entry.weekday);
  }
  if (includesAlias(text, DATE_MINUS_TWO)) return addIsoDays(today, -2);
  if (includesAlias(text, DATE_MINUS_ONE)) return addIsoDays(today, -1);
  return today;
}

function resolveCurrency(text: string): TextTransactionDraft["currency"] {
  if (includesAlias(text, USD_MARKERS)) return "USD";
  if (includesAlias(text, EUR_MARKERS)) return "EUR";
  return "ILS";
}

function resolveCategory(text: string): TextTransactionDraft["category"] {
  if (includesAlias(text, FOOD_MARKERS)) return "food";
  if (includesAlias(text, TRANSPORT_MARKERS)) return "transportation";
  return null;
}

function resolvePaymentMethod(text: string): TextTransactionDraft["paymentMethod"] {
  if (includesAlias(text, CREDIT_MARKERS)) return "credit_card";
  if (includesAlias(text, CASH_MARKERS)) return "cash";
  if (includesAlias(text, TRANSFER_MARKERS)) return "bank_transfer";
  if (includesAlias(text, BIT_MARKERS)) return "bit_paybox";
  if (includesAlias(text, CHECK_MARKERS)) return "check";
  return null;
}

const NUMBER_SRC = String.raw`\d+(?:,\d{3})+(?:\.\d+)?|\d+(?:[.,]\d+)?`;

function prepareText(text: string): string {
  return text.replace(/־/g, " ").replace(/ש(?:["״]|'')ח/g, "ש\"ח").replace(/\s+/g, " ").trim();
}

function maskRate(text: string): string {
  const rateWords = wordsPattern(RATE_MARKERS);
  const pattern = new RegExp(`(?:לפי\\s+)?(?:${rateWords})\\s*(?:${NUMBER_SRC})`, "ig");
  return text.replace(pattern, (part) => " ".repeat(part.length));
}

function gluedToLetters(text: string, start: number, end: number): boolean {
  const before = start > 0 ? text.charAt(start - 1) : "";
  const after = end < text.length ? text.charAt(end) : "";
  const letter = /[\p{L}]/u;
  return letter.test(before) || letter.test(after);
}

/** 2: a currency word or sign beside it. 1: a price word before it ("ב", "for"). 0: bare. */
type AmountStrength = 0 | 1 | 2;

interface AmountHit {
  amount: number;
  stripStart: number;
  stripEnd: number;
  strength: AmountStrength;
}

function currencyAlternation(): string {
  const words = [...AMOUNT_CURRENCY_WORDS, "nis", "ils"]
    .slice()
    .sort((left, right) => right.length - left.length);
  return wordsPattern(words);
}

const DAY_SRC = String.raw`(?:3[01]|[12]\d|0?[1-9])`;
const YEAR_SRC = String.raw`(?:19|20)\d{2}`;
const NUMBER_END = String.raw`(?![\d.,:]*\d)`;

/** The last group of each pattern is a date or time part, and it always ends the match. */
const NOT_AMOUNT_PATTERNS: readonly RegExp[] = (() => {
  const months = wordsPattern(MONTH_NAMES);
  return [
    new RegExp(String.raw`(?<![\d.,:])(\d{1,2}:\d{2})(?![\d:])`, "g"),
    new RegExp(String.raw`(?<![\d.,])(\d{1,2}[./]\d{1,2}[./]${YEAR_SRC})(?!\d)`, "g"),
    new RegExp(`(?:^|\\s)(?:${wordsPattern(YEAR_MARKERS)})\\s+(${YEAR_SRC})${NUMBER_END}`, "giu"),
    new RegExp(`(?:^|\\s)[בל]?(?:${months})\\s*,?\\s+(?:${DAY_SRC}\\s*,?\\s+)?(${YEAR_SRC})${NUMBER_END}`, "giu"),
    new RegExp(`(?:^|\\s)(?:${months})\\s+(${DAY_SRC})${NUMBER_END}`, "giu"),
    new RegExp(`(?:^|\\s)[בהמל]?\\s?(${DAY_SRC})(?=\\s+(?:of\\s+)?ב?(?:${months})(?!\\p{L}))`, "giu"),
    new RegExp(`(?:^|\\s)ב\\s?(${DAY_SRC})${NUMBER_END}(?=\\s*(?:${wordsPattern(DAY_OF_MONTH_SUFFIXES)}))`, "giu"),
    new RegExp(
      `(?:${wordsPattern(MONTHLY_MARKERS)})\\s+(?:ב\\s?|on\\s+(?:the\\s+)?)(${DAY_SRC})${NUMBER_END}(?!\\s*(?:${currencyAlternation()}))`,
      "giu",
    ),
    new RegExp(`(?:^|\\s)on\\s+the\\s+(${DAY_SRC})${NUMBER_END}`, "giu"),
  ];
})();

/** Blanks times, years in a date, and days of the month. Keeps every index. */
function maskNotAmounts(text: string): string {
  let masked = text;
  for (const pattern of NOT_AMOUNT_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const number = match[match.length - 1];
      const end = (match.index ?? 0) + match[0].length;
      masked = `${masked.slice(0, end - number.length)}${" ".repeat(number.length)}${masked.slice(end)}`;
    }
  }
  return masked;
}

/**
 * Every number that can be an amount, in text order. Next to a marked amount,
 * a bare number counts only when it starts another item: a quantity or a model
 * number ("2 חולצות ב 100", "אייפון 15 ב 3000") is not an amount.
 */
function amountCandidates(original: string): AmountHit[] {
  const text = maskNotAmounts(original);
  const currency = currencyAlternation();
  const separators = new RegExp(`(?:(?:^|\\s)(?:${wordsPattern(ITEM_SEPARATORS)})|[,;])\\s*$`, "i");
  const unit = new RegExp(`^\\s*(?:%|(?:${wordsPattern(AMOUNT_UNIT_WORDS)})(?!\\p{L}))`, "iu");
  const percentOf = new RegExp(
    `(?:^|\\s)(${NUMBER_SRC})\\s*(?:%|(?:${wordsPattern(PERCENT_WORDS)})(?!\\p{L}))\\s*(?:(?:${wordsPattern(PERCENT_OF_WORDS)})\\s+|מ\\s*[-–]?\\s*)$`,
    "iu",
  );
  const hits: (AmountHit & { startsItem: boolean })[] = [];
  for (const match of text.matchAll(new RegExp(NUMBER_SRC, "g"))) {
    const raw = match[0];
    const start = match.index ?? 0;
    const end = start + raw.length;
    if (gluedToLetters(text, start, end)) continue;
    const parsed = parseNumber(raw);
    if (parsed === null || parsed === 0) continue;
    if (unit.test(text.slice(end))) continue;
    const before = text.slice(0, start);
    const share = before.match(percentOf);
    const percent = share ? parseNumber(share[1]) : null;
    const amount = percent === null ? parsed : Math.round(parsed * percent) / 100;
    const marker = before.match(/(?:^|\s)(?:בסך|עלה|for|at|ב)\s*[-–]?\s*$/i);
    const currencyBefore = before.match(new RegExp(`(?:^|\\s)(?:${currency})\\s*$`, "i"));
    const currencyAfter = text.slice(end).match(new RegExp(`^\\s*ל?\\s*(?:${currency})`, "i"));
    const markerStart = marker?.index === undefined
      ? null
      : marker.index + (marker[0].length - marker[0].trimStart().length);
    const currencyStart = currencyBefore?.index === undefined
      ? null
      : currencyBefore.index + (currencyBefore[0].length - currencyBefore[0].trimStart().length);
    const shareStart = share?.index === undefined
      ? null
      : share.index + (share[0].length - share[0].trimStart().length);
    const starts = [markerStart, currencyStart, shareStart].filter((value): value is number => value !== null);
    const strength: AmountStrength = currencyBefore !== null || currencyAfter !== null ? 2 : marker !== null ? 1 : 0;
    hits.push({
      amount,
      stripStart: starts.length > 0 ? Math.min(...starts) : start,
      stripEnd: end + (currencyAfter?.[0].length ?? 0),
      strength,
      startsItem: separators.test(before),
    });
  }
  const kept = hits.some((hit) => hit.strength > 0)
    ? hits.filter((hit) => hit.strength > 0 || hit.startsItem)
    : hits;
  return splitTotal(kept) ?? kept;
}

/** "250, 100 במזומן ו־150 באשראי": one amount that is the sum of the others is one payment split in parts. */
function splitTotal(hits: AmountHit[]): AmountHit[] | null {
  if (hits.length < 3) return null;
  const sum = hits.reduce((total, hit) => total + hit.amount, 0);
  const total = hits.find((hit) => Math.abs(hit.amount * 2 - sum) < 0.005);
  return total ? [total] : null;
}

/** The strongest hit wins: a currency beside it, then a price word, then a bare number. Ties take the last. */
function findAmount(text: string): AmountHit | null {
  const candidates = amountCandidates(text);
  const strongest = Math.max(-1, ...candidates.map((hit) => hit.strength));
  const pool = candidates.filter((hit) => hit.strength === strongest);
  return pool[pool.length - 1] ?? null;
}

function normalizeInput(text: string): string {
  return text.trim().toLowerCase().replace(/־/g, " ").replace(/\s+/g, " ");
}

/** Every amount in the text, in order. `draftFromText` picks one of them. */
export function amountsFromText(text: string): number[] {
  return amountCandidates(maskRate(prepareText(normalizeInput(text)))).map((hit) => hit.amount);
}

/** Only the amounts with a currency word or sign beside them. */
export function currencyAmountsFromText(text: string): number[] {
  return amountCandidates(maskRate(prepareText(normalizeInput(text))))
    .filter((hit) => hit.strength === 2)
    .map((hit) => hit.amount);
}

function cleanDescription(original: string): string {
  let text = prepareText(original);
  const amount = findAmount(maskRate(text));
  if (amount) text = `${text.slice(0, amount.stripStart)} ${text.slice(amount.stripEnd)}`;
  const rateWords = wordsPattern(RATE_MARKERS);
  const verbs = wordsPattern([...DONATION_TYPE_MARKERS, ...INCOME_TYPE_MARKERS, ...EXPENSE_TYPE_MARKERS]);
  const dates = wordsPattern(DATE_WORDS);
  const payments = wordsPattern([
    ...CREDIT_MARKERS,
    ...CASH_MARKERS,
    ...TRANSFER_MARKERS,
    ...BIT_MARKERS,
    ...CHECK_MARKERS,
  ]);
  const noise = [
    new RegExp(`לפי\\s+(?:${rateWords})\\s*(?:${NUMBER_SRC})`, "gi"),
    new RegExp(`(?:${rateWords})\\s*(?:${NUMBER_SRC})`, "gi"),
    new RegExp(`(?:^|\\s)[למבוהכ]?(?:${verbs})(?=[\\s,.]|$)`, "gi"),
    new RegExp(dates, "gi"),
    new RegExp(payments, "gi"),
  ];
  for (const pattern of noise) text = text.replace(pattern, " ");
  text = text.replace(/\bi\b/gi, " ").replace(/\bfor\b/gi, " ");
  const cleaned = text.replace(/\s+/g, " ").replace(/^[\s,.\-–]+|[\s,.\-–]+$/g, "").trim();
  if (/^\d+(?:[.,]\d+)?(?:\s+[למב])?$/.test(cleaned)) return "";
  if (/^[למבוהכ]+$/.test(cleaned)) return "";
  return cleaned;
}

function explicitType(normalized: string): TextTransactionDraft["type"] | null {
  if (includesAlias(normalized, DONATION_TYPE_MARKERS)) return "donation";
  if (includesAlias(normalized, INCOME_TYPE_MARKERS)) return "income";
  if (includesAlias(normalized, EXPENSE_TYPE_MARKERS)) return "expense";
  return null;
}

function resolveType(text: string): TextTransactionDraft["type"] {
  return explicitType(text) ?? "expense";
}

export type ClarificationField = "type" | "amount";

/** One question, type before amount. Null means the draft can be shown. */
export function clarificationField(text: string, today: string): ClarificationField | null {
  const normalized = text.trim().toLowerCase().replace(/־/g, " ").replace(/\s+/g, " ");
  if (explicitType(normalized) === null) return "type";
  if (draftFromText(text, today) === null) return "amount";
  return null;
}

/** Returns null when the text has no amount. `today` is YYYY-MM-DD in the user's zone. */
export function draftFromText(text: string, today: string): TextTransactionDraft | null {
  const normalized = normalizeInput(text);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return null;

  const rateWords = wordsPattern(RATE_MARKERS);
  const rateMatch = normalized.match(new RegExp(`(?:${rateWords})\\s*(\\d+(?:,\\d+)?(?:\\.\\d+)?)`));
  const requestedRate = rateMatch ? parseNumber(rateMatch[1]) : null;
  const amountHit = findAmount(maskRate(prepareText(normalized)));
  if (!amountHit) return null;
  const amount = amountHit.amount;

  return {
    date: resolveDate(normalized, today),
    amount,
    currency: resolveCurrency(normalized),
    type: resolveType(normalized),
    requestedRate,
    description: cleanDescription(text),
    category: resolveCategory(normalized),
    paymentMethod: resolvePaymentMethod(normalized),
  };
}
