import { resolveDateStruct, type DateStruct } from "./split-date.ts";
import { resolveRecurrence, type ResolvedRecurrence } from "./split-recurrence.ts";
import type { SplitItemInput } from "./split-schema.ts";

export type SplitCurrency = "ILS" | "USD" | "EUR" | "";
export type SplitTypeHint =
  | "income"
  | "expense"
  | "donation"
  | "exempt-income"
  | "recognized-expense"
  | "non_tithe_donation"
  | "";

export type SpecialType = "exempt-income" | "recognized-expense" | "non_tithe_donation";
export type SplitPayment = "credit_card" | "cash" | "bank_transfer" | "bit_paybox" | "check";

export interface SplitRuleRef {
  id: string;
  name: string;
  type: SpecialType;
}

export interface SplitReadContext {
  today: string;
  defaultCurrency: "ILS" | "USD" | "EUR";
  categories: readonly string[];
  rules: readonly SplitRuleRef[];
  recipients: readonly string[];
}

export interface AnchoredSplitItem {
  description: string;
  amount: number | null;
  currency: SplitCurrency;
  date: string | null;
  checkDate: boolean;
  typeHint: SplitTypeHint;
  typeQuestion: SpecialType | null;
  requestedRate: number | null;
  paymentMethod: SplitPayment | null;
  category: string | null;
  ruleId: string | null;
  ruleName: string | null;
  recurrence: ResolvedRecurrence | null;
}

export function splitReadContext(today: string, extra: Partial<SplitReadContext> = {}): SplitReadContext {
  return {
    today,
    defaultCurrency: extra.defaultCurrency ?? "ILS",
    categories: extra.categories ?? [],
    rules: extra.rules ?? [],
    recipients: extra.recipients ?? [],
  };
}

function fold(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[־–—-]/g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function occurrences(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  let count = 0;
  let from = 0;
  while (from <= haystack.length - needle.length) {
    const at = haystack.indexOf(needle, from);
    if (at < 0) break;
    const before = at > 0 ? haystack.charAt(at - 1) : "";
    const after = haystack.charAt(at + needle.length);
    if (!/\d/.test(before) && !/\d/.test(after)) count += 1;
    from = at + needle.length;
  }
  return count;
}

/** Digits in the evidence, after thousand separators are removed. Words have none. */
export function digitValue(text: string): number | null {
  const compact = text.replace(/[\s\u00a0,']/g, "").replace(/[־–—-]/g, "");
  if (!/\d/.test(compact)) return null;
  const match = compact.match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

function amountsMatch(amount: number, text: string): boolean {
  const digits = digitValue(text);
  if (digits === null) return true;
  return Math.abs(digits - amount) < 0.001;
}

function textAppears(source: string, evidence: string): boolean {
  const needle = fold(evidence);
  if (needle.length === 0) return false;
  return occurrences(fold(source), needle) > 0;
}

function anchoredAmount(source: string, item: SplitItemInput, alone: boolean, used: Map<string, number>): number | null | "drop" {
  if (item.amount === null || item.amount_text === null || item.amount <= 0) {
    return alone ? null : "drop";
  }
  const needle = fold(item.amount_text);
  const seen = occurrences(fold(source), needle);
  const taken = used.get(needle) ?? 0;
  const ok = needle.length > 0 && amountsMatch(item.amount, item.amount_text) && taken < seen;
  if (!ok) return alone ? null : "drop";
  used.set(needle, taken + 1);
  return item.amount;
}

function anchoredDate(source: string, date: DateStruct | null, dateText: string | null, today: string): { date: string | null; checkDate: boolean } {
  if (date === null) return { date: today, checkDate: false };
  if (dateText === null || !textAppears(source, dateText)) return { date: today, checkDate: false };
  const resolved = resolveDateStruct(date, today);
  if (resolved === null) return { date: null, checkDate: true };
  return { date: resolved, checkDate: false };
}

/** One item keeps an unanchored amount as null. Several items drop that item. */
export function anchorSplitItems(
  source: string,
  items: readonly SplitItemInput[],
  context: SplitReadContext,
): { items: AnchoredSplitItem[]; dropped: number } {
  const alone = items.length === 1;
  const used = new Map<string, number>();
  const kept: AnchoredSplitItem[] = [];
  let dropped = 0;
  for (const item of items) {
    const amount = anchoredAmount(source, item, alone, used);
    if (amount === "drop") {
      dropped += 1;
      continue;
    }
    const dated = anchoredDate(source, item.date, item.date_text, context.today);
    const rule = item.rule_id ? context.rules.find((entry) => entry.id === item.rule_id) ?? null : null;
    const category = item.category && context.categories.includes(item.category) ? item.category : null;
    kept.push({
      description: item.description.trim(),
      amount,
      currency: item.currency ?? context.defaultCurrency,
      date: dated.date,
      checkDate: dated.checkDate,
      typeHint: rule ? rule.type : item.type ?? "",
      typeQuestion: item.type_question,
      requestedRate: item.requested_rate !== null && item.requested_rate > 0 ? item.requested_rate : null,
      paymentMethod: item.payment_method,
      category,
      ruleId: rule?.id ?? null,
      ruleName: rule?.name ?? null,
      recurrence: item.recurrence ? resolveRecurrence(item.recurrence, context.today) : null,
    });
  }
  return { items: kept, dropped };
}
