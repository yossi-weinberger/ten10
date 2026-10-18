import { normalizeCategoryAlias } from "./category-keys.ts";
import type { RateSource } from "./currency-rules.ts";
import { BOOLEAN_TRUTHY_VALUES } from "./parsing-aliases.ts";
import { normalizePaymentMethodValue } from "./payment-method-keys.ts";
import {
  FILE_IMPORT,
  resolveTypeWithIssues,
  type TransactionType,
  type ValidationProfile,
} from "./transaction-types.ts";

export type { TransactionType, ValidationProfile };
export { AI_DRAFT, FILE_IMPORT } from "./transaction-types.ts";

const MAX_DESCRIPTION_LENGTH = 500;
const MAX_CATEGORY_LENGTH = 100;
const MAX_PAYMENT_METHOD_LENGTH = 100;
const MAX_RECIPIENT_LENGTH = 200;
const BIDI_CONTROL_CHARS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

/** Same earliest date as src/lib/utils/transaction-date.ts. */
const MIN_TRANSACTION_DATE = "2000-01-01";
const CANONICAL_ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const CURRENCIES = [
  { code: "ILS", symbol: "₪" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "CAD", symbol: "C$" },
  { code: "GBP", symbol: "£" },
  { code: "AUD", symbol: "A$" },
  { code: "CHF", symbol: "₣" },
  { code: "ARS", symbol: "$" },
  { code: "BRL", symbol: "R$" },
  { code: "ZAR", symbol: "R" },
  { code: "MXN", symbol: "$" },
  { code: "UAH", symbol: "₴" },
] as const;

export type SupportedCurrencyCode = (typeof CURRENCIES)[number]["code"];
type CurrencyCode = SupportedCurrencyCode;

export interface MappedTransactionInput {
  date?: unknown;
  amount?: unknown;
  debit?: unknown;
  credit?: unknown;
  description?: unknown;
  currency?: unknown;
  type?: unknown;
  category?: unknown;
  recipient?: unknown;
  payment_method?: unknown;
  is_chomesh?: unknown;
}

export interface DomainRowIssue {
  code:
    | "missing_required_field"
    | "invalid_date"
    | "date_before_minimum"
    | "invalid_amount"
    | "zero_amount"
    | "unsupported_currency"
    | "foreign_currency_not_supported"
    | "ambiguous_debit_credit"
    | "income_keyword_match";
  field?: string;
  detail?: string;
}

export interface NormalizedTransactionRow {
  date: string;
  amount: number;
  currency: string;
  description: string | null;
  type: TransactionType;
  category: string | null;
  recipient: string | null;
  payment_method: string | null;
  is_chomesh: boolean;
  original_amount: number | null;
  original_currency: string | null;
  conversion_rate: number | null;
  conversion_date: string | null;
  rate_source: RateSource | null;
  source_recurring_id: null;
  occurrence_number: null;
}

export interface NormalizeRowResult {
  normalized: NormalizedTransactionRow | null;
  issues: DomainRowIssue[];
}

export interface NormalizeRowDeps {
  normalizeCategory: (value: string | null | undefined) => string | null;
}

const DEFAULT_DEPS: NormalizeRowDeps = {
  normalizeCategory: normalizeCategoryAlias,
};

/** Strip leading CSV/formula-injection characters: =, +, -, @, tab, carriage-return. */
function sanitizeText(val: string): string {
  return val.replace(/^[=+\-@\t\r]+/, "");
}

function isOnOrAfterMinTransactionDate(isoDate: string): boolean {
  if (!CANONICAL_ISO_DATE.test(isoDate)) return false;
  return isoDate >= MIN_TRANSACTION_DATE;
}

/**
 * Parse a date string or Excel serial number into ISO YYYY-MM-DD.
 * Returns null if not parseable.
 */
export function parseDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const d = new Date(trimmed + "T00:00:00");
      if (!isNaN(d.getTime())) return trimmed;
    }

    const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const [, d, m, y] = ddmmyyyy;
      const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      const dt = new Date(iso + "T00:00:00");
      if (!isNaN(dt.getTime())) return iso;
    }

    const ddmmyyyyDash = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (ddmmyyyyDash) {
      const [, d, m, y] = ddmmyyyyDash;
      const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      const dt = new Date(iso + "T00:00:00");
      if (!isNaN(dt.getTime())) return iso;
    }

    const dotFormat = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/);
    if (dotFormat) {
      const [, d, m, yRaw] = dotFormat;
      const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
      const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      const dt = new Date(iso + "T00:00:00");
      if (!isNaN(dt.getTime())) return iso;
    }

    const native = new Date(trimmed);
    if (!isNaN(native.getTime())) {
      const y = native.getFullYear();
      const m = String(native.getMonth() + 1).padStart(2, "0");
      const d = String(native.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    return null;
  }

  if (typeof value === "number" && isFinite(value) && value > 0) {
    const excelEpoch = new Date(1899, 11, 30);
    const ms = excelEpoch.getTime() + value * 86400000;
    const d = new Date(ms);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1900) {
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const da = String(d.getDate()).padStart(2, "0");
      return `${y}-${mo}-${da}`;
    }
  }

  return null;
}

/**
 * Parse an amount value into a finite number.
 * Handles: "1234.56", "1,234.56", "1.234,56", "₪1,234", "(123.45)", "-123.45"
 * Returns null if not parseable.
 */
export function parseAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    let s = value.trim();
    if (s === "") return null;

    s = s.replace(BIDI_CONTROL_CHARS, "").trim();

    const parentheses = s.match(/^\((.+)\)$/);
    if (parentheses) {
      const inner = parseAmount(parentheses[1]);
      return inner !== null ? -Math.abs(inner) : null;
    }

    s = s.replace(/[₪$€£¥₩]/g, "").trim();

    const commaDecimal = s.match(/^-?\d{1,3}(\.\d{3})*(,\d{1,2})$/);
    if (commaDecimal) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,(\d{3})/g, "$1");
      s = s.replace(/,/g, "");
    }

    const n = parseFloat(s);
    return isFinite(n) ? n : null;
  }

  return null;
}

export function normalizeRow(
  mapped: MappedTransactionInput,
  userDefaultCurrency: string,
  profile: ValidationProfile = FILE_IMPORT,
  deps: NormalizeRowDeps = DEFAULT_DEPS,
): NormalizeRowResult {
  const issues: DomainRowIssue[] = [];

  const rawDate = extractFormulaAwareValue(mapped.date);
  const dateStr = parseDate(rawDate);
  if (dateStr === null) {
    issues.push({ code: "invalid_date", field: "date" });
    if (rawDate === null || rawDate === undefined || rawDate === "") {
      issues.push({ code: "missing_required_field", field: "date" });
    }
    return { normalized: null, issues };
  }
  if (!isOnOrAfterMinTransactionDate(dateStr)) {
    issues.push({ code: "date_before_minimum", field: "date" });
    return { normalized: null, issues };
  }

  let amount: number | null = null;
  let fromDebitCredit = false;
  let debitValue: number | null = null;
  let creditValue: number | null = null;

  const rawAmount = extractFormulaAwareValue(mapped.amount);
  const rawDebit = extractFormulaAwareValue(mapped.debit);
  const rawCredit = extractFormulaAwareValue(mapped.credit);

  if (rawDebit !== null || rawCredit !== null) {
    fromDebitCredit = true;
    debitValue = rawDebit !== null ? parseAmount(rawDebit) : null;
    creditValue = rawCredit !== null ? parseAmount(rawCredit) : null;

    const debitNum = debitValue !== null ? Math.abs(debitValue) : null;
    const creditNum = creditValue !== null ? Math.abs(creditValue) : null;

    if (debitNum !== null && creditNum !== null) {
      issues.push({ code: "ambiguous_debit_credit" });
      amount = creditNum - debitNum;
    } else if (debitNum !== null) {
      amount = -debitNum;
    } else if (creditNum !== null) {
      amount = creditNum;
    }
  } else if (rawAmount !== null) {
    amount = parseAmount(rawAmount);
  }

  if (amount === null) {
    const isEmpty = (v: unknown) => v === null || v === undefined || v === "";
    if (isEmpty(rawAmount) && isEmpty(rawDebit) && isEmpty(rawCredit)) {
      issues.push({ code: "missing_required_field", field: "amount" });
    } else {
      issues.push({ code: "invalid_amount", field: "amount" });
    }
    return { normalized: null, issues };
  }

  if (!isFinite(amount)) {
    issues.push({ code: "invalid_amount", field: "amount" });
    return { normalized: null, issues };
  }

  if (amount === 0) {
    issues.push({ code: "zero_amount", field: "amount" });
    return { normalized: null, issues };
  }

  const absAmount = Math.abs(amount);

  const rawCurrency = extractFormulaAwareValue(mapped.currency);
  let currency = userDefaultCurrency;
  let originalAmount: number | null = null;
  let originalCurrency: string | null = null;

  if (rawCurrency !== null && rawCurrency !== "" && rawCurrency !== undefined) {
    const rawStr = String(rawCurrency).trim();
    const currStr = normalizeCurrencyInput(rawStr);
    if (currStr === userDefaultCurrency) {
      currency = userDefaultCurrency;
    } else if (isSupportedCurrency(currStr)) {
      switch (profile.foreignCurrency) {
        case "reject":
          issues.push({
            code: "foreign_currency_not_supported",
            field: "currency",
            detail: currStr,
          });
          return { normalized: null, issues };
        case "convert":
          currency = currStr;
          originalAmount = absAmount;
          originalCurrency = currStr;
          break;
        default: {
          const _exhaustive: never = profile.foreignCurrency;
          return _exhaustive;
        }
      }
    } else {
      issues.push({
        code: "unsupported_currency",
        field: "currency",
        detail: rawStr,
      });
      return { normalized: null, issues };
    }
  }

  const rawDesc = extractFormulaAwareValue(mapped.description);
  let description: string | null = null;
  if (rawDesc !== null && rawDesc !== undefined && rawDesc !== "") {
    description = sanitizeText(String(rawDesc).trim()).slice(0, MAX_DESCRIPTION_LENGTH) || null;
  }

  const rawCategory = extractFormulaAwareValue(mapped.category);
  const rawRecipient = extractFormulaAwareValue(mapped.recipient);
  const rawPayment = extractFormulaAwareValue(mapped.payment_method);

  const rawType = extractFormulaAwareValue(mapped.type);
  const rawTypeStr =
    rawType !== null && rawType !== undefined && rawType !== ""
      ? String(rawType)
      : null;

  const resolvedTypeResult = resolveTypeWithIssues(
    {
      amount,
      fromDebitCredit,
      debitValue,
      creditValue,
      rawType: rawTypeStr,
      description,
      category: rawCategory !== null && rawCategory !== undefined ? String(rawCategory) : null,
      recipient: rawRecipient !== null && rawRecipient !== undefined ? String(rawRecipient) : null,
      paymentMethod: rawPayment !== null && rawPayment !== undefined ? String(rawPayment) : null,
    },
    profile,
  );
  const resolvedType = resolvedTypeResult.type;
  issues.push(...resolvedTypeResult.issues);

  let category: string | null = null;
  if (rawCategory !== null && rawCategory !== undefined && rawCategory !== "") {
    const catStr = sanitizeText(String(rawCategory).trim()).slice(0, MAX_CATEGORY_LENGTH);
    category = deps.normalizeCategory(catStr);
  }
  if (resolvedType === "donation") {
    category = null;
  }

  let recipient: string | null = null;
  if (rawRecipient !== null && rawRecipient !== undefined && rawRecipient !== "") {
    recipient = sanitizeText(String(rawRecipient).trim()).slice(0, MAX_RECIPIENT_LENGTH) || null;
  }

  let paymentMethod: string | null = null;
  if (rawPayment !== null && rawPayment !== undefined && rawPayment !== "") {
    const pmStr = sanitizeText(String(rawPayment).trim()).slice(0, MAX_PAYMENT_METHOD_LENGTH);
    paymentMethod = normalizePaymentMethodValue(pmStr);
  }

  const rawChomesh = extractFormulaAwareValue(mapped.is_chomesh);
  let is_chomesh = false;
  if (rawChomesh !== null && rawChomesh !== undefined && rawChomesh !== "") {
    if (typeof rawChomesh === "boolean") {
      is_chomesh = rawChomesh;
    } else {
      const chomeshStr = String(rawChomesh).trim().toLowerCase();
      is_chomesh = BOOLEAN_TRUTHY_VALUES.includes(chomeshStr);
    }
  }

  const normalized: NormalizedTransactionRow = {
    date: dateStr,
    amount: absAmount,
    currency,
    description,
    type: resolvedType,
    category,
    recipient,
    payment_method: paymentMethod,
    is_chomesh,
    original_amount: originalAmount,
    original_currency: originalCurrency,
    conversion_rate: null,
    conversion_date: null,
    rate_source: null,
    source_recurring_id: null,
    occurrence_number: null,
  };

  return { normalized, issues };
}

function extractFormulaAwareValue(value: unknown): unknown {
  if (
    value !== null &&
    typeof value === "object" &&
    "__formulaValue" in (value as object)
  ) {
    return (value as { __formulaValue: unknown }).__formulaValue;
  }
  return value ?? null;
}

const SUPPORTED_CURRENCY_SET = new Set<string>(CURRENCIES.map((c) => c.code));

const CURRENCY_SYMBOL_MAP: Record<string, string> = {
  ...Object.fromEntries(CURRENCIES.map((c) => [c.code.toLowerCase(), c.code])),
  ...Object.fromEntries(
    CURRENCIES.filter(
      (c) => CURRENCIES.filter((x) => x.symbol === c.symbol).length === 1,
    ).map((c) => [c.symbol, c.code]),
  ),
  $: "USD",
};

function normalizeCurrencyInput(raw: string): string {
  const lower = raw.toLowerCase();
  return CURRENCY_SYMBOL_MAP[raw] ?? CURRENCY_SYMBOL_MAP[lower] ?? raw.toUpperCase();
}

function isSupportedCurrency(value: string): value is CurrencyCode {
  return SUPPORTED_CURRENCY_SET.has(value);
}
