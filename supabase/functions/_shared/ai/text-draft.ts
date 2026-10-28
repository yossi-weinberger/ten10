/**
 * Pulls a transaction draft out of text with rules only.
 * Phrases live in phrase-aliases.ts. Amount and currency stay as written.
 */

import {
  AMOUNT_CURRENCY_WORDS,
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
  RATE_MARKERS,
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

interface AmountHit {
  amount: number;
  stripStart: number;
  stripEnd: number;
  marked: boolean;
}

function currencyAlternation(): string {
  const words = [...AMOUNT_CURRENCY_WORDS, "nis", "ils"]
    .slice()
    .sort((left, right) => right.length - left.length);
  return wordsPattern(words);
}

/** Numbers with a price marker or a currency word. Without any, every standalone number. */
function amountCandidates(text: string): AmountHit[] {
  const currency = currencyAlternation();
  const hits: AmountHit[] = [];
  for (const match of text.matchAll(new RegExp(NUMBER_SRC, "g"))) {
    const raw = match[0];
    const start = match.index ?? 0;
    const end = start + raw.length;
    if (gluedToLetters(text, start, end)) continue;
    const amount = parseNumber(raw);
    if (amount === null || amount === 0) continue;
    const before = text.slice(0, start);
    const marker = before.match(/(?:^|\s)(?:בסך|עלה|for|at|ב)\s*[-–]?\s*$/i);
    const currencyBefore = before.match(new RegExp(`(?:^|\\s)(?:${currency})\\s*$`, "i"));
    const currencyAfter = text.slice(end).match(new RegExp(`^\\s*ל?\\s*(?:${currency})`, "i"));
    const markerStart = marker?.index === undefined
      ? null
      : marker.index + (marker[0].length - marker[0].trimStart().length);
    const currencyStart = currencyBefore?.index === undefined
      ? null
      : currencyBefore.index + (currencyBefore[0].length - currencyBefore[0].trimStart().length);
    const starts = [markerStart, currencyStart].filter((value): value is number => value !== null);
    hits.push({
      amount,
      stripStart: starts.length > 0 ? Math.min(...starts) : start,
      stripEnd: end + (currencyAfter?.[0].length ?? 0),
      marked: marker !== null || currencyBefore !== null || currencyAfter !== null,
    });
  }
  const marked = hits.filter((hit) => hit.marked);
  return marked.length > 0 ? marked : hits;
}

/** A price marker or a currency word wins. Otherwise the last standalone number. */
function findAmount(text: string): AmountHit | null {
  const pool = amountCandidates(text);
  return pool[pool.length - 1] ?? null;
}

function normalizeInput(text: string): string {
  return text.trim().toLowerCase().replace(/־/g, " ").replace(/\s+/g, " ");
}

/** Every amount `draftFromText` chooses from, in text order. */
export function amountsFromText(text: string): number[] {
  return amountCandidates(maskRate(prepareText(normalizeInput(text)))).map((hit) => hit.amount);
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
