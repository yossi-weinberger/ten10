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
  /** A text message with no date is today. A receipt with no date is checked. */
  missingDate: "today" | "check";
}

export interface AnchoredSplitItem {
  description: string;
  amount: number | null;
  currency: SplitCurrency;
  date: string | null;
  checkDate: boolean;
  checkAmount: boolean;
  typeHint: SplitTypeHint;
  typeQuestion: SpecialType | null;
  /** The message itself stated the special type, so the card carries it without asking. */
  specialStated?: boolean;
  requestedRate: number | null;
  paymentMethod: SplitPayment | null;
  category: string | null;
  ruleId: string | null;
  ruleName: string | null;
  recurrence: ResolvedRecurrence | null;
  unsupportedFrequency: boolean;
}

/** The special type the message stated. A guessed one stays a question. */
export function statedSpecialType(item: Pick<AnchoredSplitItem, "specialStated" | "typeQuestion">): SpecialType | null {
  return item.specialStated && item.typeQuestion ? item.typeQuestion : null;
}

export function splitReadContext(today: string, extra: Partial<SplitReadContext> = {}): SplitReadContext {
  return {
    today,
    defaultCurrency: extra.defaultCurrency ?? "ILS",
    categories: extra.categories ?? [],
    rules: extra.rules ?? [],
    recipients: extra.recipients ?? [],
    missingDate: extra.missingDate ?? "today",
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

function mentionsThousand(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes("אלף")
    || lower.includes("אלפים")
    || lower.includes("thousand")
    || /(?:^|[^a-z])k(?:[^a-z]|$)/i.test(text);
}

function textAppears(source: string, evidence: string): boolean {
  const needle = fold(evidence);
  if (needle.length === 0) return false;
  return occurrences(fold(source), needle) > 0;
}

const SPECIAL_TYPES = new Set(["exempt-income", "recognized-expense", "non_tithe_donation"]);

function numberKey(value: number): string {
  return String(Math.round(value * 1000));
}

/** Numbers in the text. Separators, hyphens, and currency signs are not part of the number. */
function numbersIn(text: string): number[] {
  const stripped = text
    .replace(/[₪$€]/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[־–—-]/g, "");
  const pattern = /\d{1,3}(?:[ ,]\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g;
  const values: number[] = [];
  for (const match of stripped.matchAll(pattern)) {
    const value = Number(match[0].replace(/[ ,]/g, ""));
    if (Number.isFinite(value)) values.push(value);
  }
  return values;
}

function anchoredAmount(
  source: string,
  item: SplitItemInput,
  alone: boolean,
  used: Map<string, number>,
): { amount: number | null; checkAmount: boolean } | "drop" {
  if (item.amount === null || item.amount <= 0) {
    return alone ? { amount: null, checkAmount: false } : "drop";
  }
  const words = item.amount_text?.trim() ?? "";
  if (words.length > 0 && digitValue(words) === null) {
    const needle = fold(words);
    const seen = occurrences(fold(source), needle);
    const taken = used.get(`w:${needle}`) ?? 0;
    if (needle.length === 0 || taken >= seen) {
      return alone ? { amount: null, checkAmount: false } : "drop";
    }
    used.set(`w:${needle}`, taken + 1);
    return { amount: item.amount, checkAmount: true };
  }
  const numbers = numbersIn(source);
  const thousand = mentionsThousand(words);
  let base: number | null = null;
  for (const value of numbers) {
    if (Math.abs(value - item.amount) < 0.001) {
      base = value;
      break;
    }
  }
  if (base === null && thousand) {
    for (const value of numbers) {
      if (Math.abs(value * 1000 - item.amount) < 0.001) {
        base = value;
        break;
      }
    }
  }
  if (base === null) return alone ? { amount: null, checkAmount: false } : "drop";
  const key = numberKey(base);
  const seen = numbers.filter((value) => Math.abs(value - base) < 0.001).length;
  const taken = used.get(key) ?? 0;
  if (taken >= seen) return alone ? { amount: null, checkAmount: false } : "drop";
  used.set(key, taken + 1);
  return { amount: item.amount, checkAmount: false };
}

function anchoredDate(
  source: string,
  date: DateStruct | null,
  dateText: string | null,
  today: string,
  missingDate: "today" | "check",
): { date: string | null; checkDate: boolean } {
  if (
    missingDate === "today"
    && date?.kind === "days_ago"
    && date.n === 0
    && (dateText === null || dateText.trim() === "")
  ) {
    return { date: today, checkDate: false };
  }
  if (date === null) {
    return missingDate === "check" ? { date: null, checkDate: true } : { date: today, checkDate: false };
  }
  if (dateText === null || !textAppears(source, dateText)) return { date: null, checkDate: true };
  const resolved = resolveDateStruct(date, today);
  if (resolved === null) return { date: null, checkDate: true };
  return { date: resolved, checkDate: false };
}

export const NAME_PREFIX_LETTERS = "ובלהשכ";

function isLetter(char: string): boolean {
  return /\p{L}|\p{N}/u.test(char);
}

/** The rule name is a whole word in the item text, or that word with one prefix letter. */
export function nameStands(text: string, name: string): boolean {
  const source = text.replace(/־/g, " ");
  const word = name.trim();
  if (!word) return false;
  let from = 0;
  while (from < source.length) {
    const at = source.indexOf(word, from);
    if (at < 0) return false;
    const after = source[at + word.length] ?? "";
    const before = at === 0 ? "" : source[at - 1];
    const afterOk = after === "" || !isLetter(after);
    const beforeOk = before === "" || !isLetter(before)
      || (NAME_PREFIX_LETTERS.includes(before) && (at === 1 || !isLetter(source[at - 2] ?? "")));
    if (afterOk && beforeOk) return true;
    from = at + word.length;
  }
  return false;
}

function savedRule(rules: readonly SplitRuleRef[], ruleId: string | null): SplitRuleRef | null {
  if (!ruleId) return null;
  const byId = rules.find((entry) => entry.id === ruleId);
  if (byId) return byId;
  const byName = rules.filter((entry) => entry.name === ruleId);
  return byName.length === 1 ? byName[0] : null;
}

/** The largest group of at least two amounts that adds up to the target. */
function summingMask(values: readonly number[], target: number): number | null {
  const count = values.length;
  if (count < 2) return null;
  let best: number | null = null;
  let bestParts = 0;
  const limit = 1 << count;
  for (let mask = 1; mask < limit; mask += 1) {
    let parts = 0;
    let sum = 0;
    for (let bit = 0; bit < count; bit += 1) {
      if ((mask & (1 << bit)) === 0) continue;
      parts += 1;
      sum += values[bit];
    }
    if (parts >= 2 && parts > bestParts && Math.abs(sum - target) < 0.02) {
      best = mask;
      bestParts = parts;
    }
  }
  return best;
}

function askedSpecial(type: SplitItemInput["type"]): AnchoredSplitItem["typeQuestion"] {
  if (type === "exempt-income" || type === "recognized-expense" || type === "non_tithe_donation") return type;
  return null;
}

function ordinaryType(type: SplitItemInput["type"]): AnchoredSplitItem["typeHint"] {
  if (type === "exempt-income") return "income";
  if (type === "recognized-expense") return "expense";
  if (type === "non_tithe_donation") return "donation";
  return type ?? "";
}

/** One item keeps an unanchored amount as null. Several items drop that item. */
export function anchorSplitItems(
  source: string,
  items: readonly SplitItemInput[],
  context: SplitReadContext,
): { items: AnchoredSplitItem[]; dropped: number } {
  const alone = items.length === 1;
  const used = new Map<string, number>();
  const kept: { item: AnchoredSplitItem; total: boolean }[] = [];
  let dropped = 0;
  for (const item of items) {
    const amount = anchoredAmount(source, item, alone, used);
    if (amount === "drop") {
      dropped += 1;
      continue;
    }
    const dated = anchoredDate(source, item.date, item.date_text, context.today, context.missingDate);
    const named = savedRule(context.rules, item.rule_id);
    const stands = named ? nameStands(item.description, named.name) : false;
    const rule = named && stands ? named : null;
    const rejected = Boolean(named && !stands);
    const category = item.category && context.categories.includes(item.category) ? item.category : null;
    const special = item.type !== null && SPECIAL_TYPES.has(item.type);
    const unsupported = item.unsupported_frequency === true;
    kept.push({
      total: item.is_total,
      item: {
        description: item.description.trim(),
        amount: amount.amount,
        currency: item.currency ?? context.defaultCurrency,
        date: dated.date,
        checkDate: dated.checkDate,
        checkAmount: amount.checkAmount,
        typeHint: rejected ? "" : rule ? rule.type : special ? ordinaryType(item.type) : item.type ?? "",
        typeQuestion: rejected || rule ? null : askedSpecial(item.type) ?? item.type_question,
        specialStated: special && !rejected && !rule,
        requestedRate: item.requested_rate !== null && item.requested_rate > 0 ? item.requested_rate : null,
        paymentMethod: item.payment_method,
        category,
        ruleId: rule?.id ?? null,
        ruleName: rule?.name ?? null,
        recurrence: unsupported || !item.recurrence ? null : resolveRecurrence(item.recurrence, context.today),
        unsupportedFrequency: unsupported,
      },
    });
  }
  const totals = new Set<number>();
  kept.forEach((entry, index) => {
    if (!entry.total || entry.item.amount === null || entry.item.checkAmount) return;
    const others = kept.flatMap((other, otherIndex) => (
      otherIndex !== index && other.item.amount !== null && !other.item.checkAmount
        ? [{ index: otherIndex, amount: other.item.amount }]
        : []
    ));
    const mask = summingMask(others.map((other) => other.amount), entry.item.amount);
    if (mask === null) return;
    totals.add(index);
    const everyone = mask === (1 << others.length) - 1;
    if (everyone) return;
    others.forEach((other, bit) => {
      if ((mask & (1 << bit)) === 0) kept[other.index].item.checkAmount = true;
    });
  });
  return {
    items: kept.filter((_, index) => !totals.has(index)).map((entry) => entry.item),
    dropped: dropped + totals.size,
  };
}
