import type { Currency } from "@/types/transaction";
import { CURRENCIES } from "@/lib/currencies";
import type {
  ImportMappedRow,
  ImportNormalizedRow,
  ImportRowIssue,
} from "./import-session.types";
import { normalizeCategoryValue } from "@/lib/category-registry";
import { isPredefinedPaymentMethod } from "@/lib/payment-methods";
import { resolveType } from "./type-resolver";
import { BOOLEAN_TRUTHY_VALUES } from "./import-locale-aliases";

const MAX_DESCRIPTION_LENGTH = 500;
const MAX_CATEGORY_LENGTH = 100;
const MAX_PAYMENT_METHOD_LENGTH = 100;
const MAX_RECIPIENT_LENGTH = 200;
const BIDI_CONTROL_CHARS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

/** Strip leading CSV/formula-injection characters: =, +, -, @, tab, carriage-return. */
function sanitizeText(val: string): string {
  return val.replace(/^[=+\-@\t\r]+/, "");
}

// ---------------------------------------------------------------------------
// Date normalization
// ---------------------------------------------------------------------------

/**
 * Parse a date string or Excel serial number into ISO YYYY-MM-DD.
 * Returns null if not parseable.
 */
export function parseDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  // Already an ISO date string YYYY-MM-DD
  if (typeof value === "string") {
    const trimmed = value.trim();

    // ISO format: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const d = new Date(trimmed + "T00:00:00");
      if (!isNaN(d.getTime())) return trimmed;
    }

    // DD/MM/YYYY (common Israeli slash format)
    const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const [, d, m, y] = ddmmyyyy;
      const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      const dt = new Date(iso + "T00:00:00");
      if (!isNaN(dt.getTime())) return iso;
    }

    // DD-MM-YYYY (common Israeli dash format, e.g. MAX credit card)
    const ddmmyyyyDash = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (ddmmyyyyDash) {
      const [, d, m, y] = ddmmyyyyDash;
      const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      const dt = new Date(iso + "T00:00:00");
      if (!isNaN(dt.getTime())) return iso;
    }

    // DD.MM.YY or DD.MM.YYYY (European dot format, e.g. 07.05.26 = Mastercard)
    const dotFormat = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/);
    if (dotFormat) {
      const [, d, m, yRaw] = dotFormat;
      const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
      const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      const dt = new Date(iso + "T00:00:00");
      if (!isNaN(dt.getTime())) return iso;
    }

    // Try native Date parsing as a last resort
    const native = new Date(trimmed);
    if (!isNaN(native.getTime())) {
      const y = native.getFullYear();
      const m = String(native.getMonth() + 1).padStart(2, "0");
      const d = String(native.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    return null;
  }

  // Numeric: could be an Excel date serial (days since 1900-01-01)
  if (typeof value === "number" && isFinite(value) && value > 0) {
    // Excel date serial: days since Dec 30, 1899
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

// ---------------------------------------------------------------------------
// Amount normalization
// ---------------------------------------------------------------------------

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

    // Parentheses = negative: (123.45) → -123.45
    const parentheses = s.match(/^\((.+)\)$/);
    if (parentheses) {
      const inner = parseAmount(parentheses[1]);
      return inner !== null ? -Math.abs(inner) : null;
    }

    // Strip currency symbols and whitespace
    s = s.replace(/[₪$€£¥₩]/g, "").trim();

    // Detect format: if last separator is comma with 2 digits, treat as decimal comma
    // e.g., "1.234,56" → 1234.56
    const commaDecimal = s.match(/^-?\d{1,3}(\.\d{3})*(,\d{1,2})$/);
    if (commaDecimal) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // Remove thousands separators (commas before digits)
      s = s.replace(/,(\d{3})/g, "$1");
      // Remove remaining commas (malformed)
      s = s.replace(/,/g, "");
    }

    const n = parseFloat(s);
    return isFinite(n) ? n : null;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main normalization
// ---------------------------------------------------------------------------

export interface NormalizeRowResult {
  normalized: ImportNormalizedRow | null;
  issues: ImportRowIssue[];
}

/**
 * Normalize a mapped row into a fully typed ImportNormalizedRow.
 * Returns issues for any problems found. A null normalized value means
 * the row is invalid (missing critical fields).
 */
export function normalizeRow(
  mapped: ImportMappedRow,
  userDefaultCurrency: Currency
): NormalizeRowResult {
  const issues: ImportRowIssue[] = [];

  // --- Date ---
  const rawDate = extractFormulaAwareValue(mapped.date);
  const dateStr = parseDate(rawDate);
  if (dateStr === null) {
    issues.push({ code: "invalid_date", field: "date" });
    if (rawDate === null || rawDate === undefined || rawDate === "") {
      issues.push({ code: "missing_required_field", field: "date" });
    }
    return { normalized: null, issues };
  }

  // --- Amount (debit/credit or single amount) ---
  let amount: number | null = null;
  let fromDebitCredit = false;
  let debitValue: number | null = null;
  let creditValue: number | null = null;

  const rawAmount = extractFormulaAwareValue(mapped.amount);
  const rawDebit = extractFormulaAwareValue(mapped.debit);
  const rawCredit = extractFormulaAwareValue(mapped.credit);

  const hasFormula =
    isFormulaCell(mapped.amount) ||
    isFormulaCell(mapped.debit) ||
    isFormulaCell(mapped.credit);

  if (hasFormula) {
    issues.push({ code: "formula_cell" });
  }

  if (rawDebit !== null || rawCredit !== null) {
    fromDebitCredit = true;
    debitValue = rawDebit !== null ? parseAmount(rawDebit) : null;
    creditValue = rawCredit !== null ? parseAmount(rawCredit) : null;

    const debitNum = debitValue !== null ? Math.abs(debitValue) : null;
    const creditNum = creditValue !== null ? Math.abs(creditValue) : null;

    if (debitNum !== null && creditNum !== null) {
      // Both have values — ambiguous
      issues.push({ code: "ambiguous_debit_credit" });
      // Use net: credit - debit
      amount = creditNum - debitNum;
    } else if (debitNum !== null) {
      amount = -debitNum; // debit = expense
    } else if (creditNum !== null) {
      amount = creditNum; // credit = income
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

  // --- Currency ---
  const rawCurrency = extractFormulaAwareValue(mapped.currency);
  let currency: Currency = userDefaultCurrency;

  if (rawCurrency !== null && rawCurrency !== "" && rawCurrency !== undefined) {
    const rawStr = String(rawCurrency).trim();
    // Normalize common currency symbols to ISO codes
    const currStr = normalizeCurrencyInput(rawStr);
    if (currStr === userDefaultCurrency) {
      currency = userDefaultCurrency;
    } else if (isSupportedCurrency(currStr)) {
      issues.push({
        code: "foreign_currency_not_supported",
        field: "currency",
        detail: currStr,
      });
      return { normalized: null, issues };
    } else {
      issues.push({
        code: "unsupported_currency",
        field: "currency",
        detail: rawStr,
      });
      return { normalized: null, issues };
    }
  }

  // --- Type ---
  const rawType = extractFormulaAwareValue(mapped.type);
  const rawTypeStr =
    rawType !== null && rawType !== undefined && rawType !== ""
      ? String(rawType)
      : null;

  const resolvedType = resolveType({
    amount,
    fromDebitCredit,
    debitValue,
    creditValue,
    rawType: rawTypeStr,
  });

  // Note: unrecognized type values (e.g. bank-specific Hebrew terms) are silently
  // ignored — the type is always inferred from the amount sign as a safe fallback.
  // We do NOT emit invalid_type for external files since it confuses users.

  // --- Description ---
  const rawDesc = extractFormulaAwareValue(mapped.description);
  let description: string | null = null;
  if (rawDesc !== null && rawDesc !== undefined && rawDesc !== "") {
    description = sanitizeText(String(rawDesc).trim()).slice(0, MAX_DESCRIPTION_LENGTH) || null;
  }

  // --- Category ---
  const rawCategory = extractFormulaAwareValue(mapped.category);
  let category: string | null = null;
  if (rawCategory !== null && rawCategory !== undefined && rawCategory !== "") {
    const catStr = sanitizeText(String(rawCategory).trim()).slice(0, MAX_CATEGORY_LENGTH);
    category = normalizeCategoryValue(catStr);
  }
  // Donations don't use categories
  if (resolvedType === "donation") {
    category = null;
  }

  // --- Recipient ---
  const rawRecipient = extractFormulaAwareValue(mapped.recipient);
  let recipient: string | null = null;
  if (rawRecipient !== null && rawRecipient !== undefined && rawRecipient !== "") {
    recipient = sanitizeText(String(rawRecipient).trim()).slice(0, MAX_RECIPIENT_LENGTH) || null;
  }

  // --- Payment method ---
  const rawPayment = extractFormulaAwareValue(mapped.payment_method);
  let paymentMethod: string | null = null;
  if (rawPayment !== null && rawPayment !== undefined && rawPayment !== "") {
    const pmStr = sanitizeText(String(rawPayment).trim()).slice(0, MAX_PAYMENT_METHOD_LENGTH);
    // Use stable key if predefined, otherwise free text
    paymentMethod = isPredefinedPaymentMethod(pmStr) ? pmStr : pmStr || null;
  }

  // --- Chomesh (20% tithe flag) ---
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

  const normalized: ImportNormalizedRow = {
    date: dateStr,
    amount: absAmount,
    currency,
    description,
    type: resolvedType,
    category,
    recipient,
    payment_method: paymentMethod,
    is_chomesh,
    original_amount: null,
    original_currency: null,
    conversion_rate: null,
    conversion_date: null,
    rate_source: null,
    source_recurring_id: null,
    occurrence_number: null,
  };

  return { normalized, issues };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function isFormulaCell(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    "__isFormula" in (value as object) &&
    (value as { __isFormula: boolean }).__isFormula === true
  );
}

const SUPPORTED_CURRENCY_SET = new Set<string>(CURRENCIES.map((c) => c.code));

/**
 * Reverse lookup: symbol or lowercase ISO code → ISO code.
 * Built from currencies.ts (single source of truth).
 * Unique symbols are auto-derived; "$" is ambiguous (USD/ARS/MXN) so it
 * explicitly maps to USD as the most common default.
 */
const CURRENCY_SYMBOL_MAP: Record<string, string> = {
  // lowercase ISO aliases (e.g. "ils" → "ILS")
  ...Object.fromEntries(CURRENCIES.map((c) => [c.code.toLowerCase(), c.code])),
  // unique symbols only (currencies that share a symbol are excluded)
  ...Object.fromEntries(
    CURRENCIES.filter(
      (c) => CURRENCIES.filter((x) => x.symbol === c.symbol).length === 1
    ).map((c) => [c.symbol, c.code])
  ),
  // "$" is shared by USD/ARS/MXN — default to USD
  $: "USD",
};

function normalizeCurrencyInput(raw: string): string {
  const lower = raw.toLowerCase();
  return CURRENCY_SYMBOL_MAP[raw] ?? CURRENCY_SYMBOL_MAP[lower] ?? raw.toUpperCase();
}

function isSupportedCurrency(value: string): value is Currency {
  return SUPPORTED_CURRENCY_SET.has(value);
}
