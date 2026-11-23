import type {
  ColumnMapping,
  ImportMappedRow,
  ImportTargetField,
  MappingValidationError,
  ParsedFile,
  ParsedFileDiagnostic,
} from "./import-session.types";
import { TEN10_TEMPLATE_HEADERS } from "./ten10-template";
import { normalizeHeaderName } from "./header-normalizer";
import { FIELD_ALIASES, TEMPLATE_COLUMN_LABELS } from "./import-locale-aliases";

// ---------------------------------------------------------------------------
// Target field metadata
// ---------------------------------------------------------------------------

export const TARGET_FIELD_REQUIRED: Record<ImportTargetField, boolean> = {
  date: true,
  amount: true, // required (or debit+credit as alternative)
  debit: false,
  credit: false,
  description: false,
  currency: false,
  type: false,
  category: false,
  recipient: false,
  payment_method: false,
  is_chomesh: false,
};

/**
 * Given a list of source column headers, return suggested mappings.
 * Uses alias matching and Ten10 template detection.
 */
export function suggestMappings(headers: string[]): ColumnMapping[] {
  // Check if this is a Ten10 template file first
  const isTen10Template = detectTen10Template(headers);

  const mapped = headers.map((header) => {
    if (isTen10Template) {
      const target = TEN10_TEMPLATE_HEADERS[normalizeHeaderName(header)];
      if (target) {
        return { sourceColumn: header, targetField: target };
      }
    }

    // Generic alias matching
    const target = matchHeaderToField(header);
    return { sourceColumn: header, targetField: target };
  });

  return isTen10Template ? mapped : resolveMappingConflicts(mapped);
}

export function detectTen10Template(headers: string[]): boolean {
  const normalized = new Set(headers.map(normalizeHeaderName));
  // Check every supported locale: if all required fields exist in any one locale, it's a Ten10 template.
  return Object.values(TEMPLATE_COLUMN_LABELS).some((labels) => {
    const dateLabel = normalizeHeaderName(labels.date ?? "");
    const amountLabel = normalizeHeaderName(labels.amount ?? "");
    return dateLabel && amountLabel && normalized.has(dateLabel) && normalized.has(amountLabel);
  });
}

const NON_IMPORTABLE_HEADERS = new Set([
  normalizeHeaderName("תאריך עברי"),
  normalizeHeaderName("Hebrew Date"),
]);

/** Headers that should never become date/amount/debit/credit targets. */
function isIgnoredBankMetadataHeader(normalized: string): boolean {
  if (NON_IMPORTABLE_HEADERS.has(normalized)) return true;
  if (normalized.includes("יתרה")) return true;
  if (normalized.startsWith("אסמכת")) return true;
  if (normalized.startsWith("שער")) return true;
  return false;
}

function isCurrencyShapedHeader(normalized: string): boolean {
  return (
    normalized === "currency" ||
    normalized === "cur" ||
    normalized.startsWith("מטבע")
  );
}

function isChargeAmountHeader(normalized: string): boolean {
  return (
    normalized.includes("סכום חיוב") ||
    normalized.includes("סכום החיוב") ||
    normalized === "חיוב בשקלים"
  );
}

function isChargeCurrencyHeader(normalized: string): boolean {
  return (
    normalized.includes("מטבע חיוב") ||
    normalized.includes("מטבע לחיוב") ||
    normalized.includes("מטבע החיוב")
  );
}

function isSecondaryDateHeader(normalized: string): boolean {
  return (
    normalized.includes("ערך") ||
    normalized.includes("חיוב") ||
    normalized.startsWith("יום")
  );
}

function dateColumnPreference(header: string): number {
  const normalized = normalizeHeaderName(header);
  if (normalized === "תאריך" || normalized === "date") return 100;
  if (
    normalized === "תאריך עסקה" ||
    normalized === "תאריך רכישה" ||
    normalized === "תאריך פעולה"
  ) {
    return 90;
  }
  if (isSecondaryDateHeader(normalized)) return 10;
  return 50;
}

function amountColumnPreference(header: string): number {
  const normalized = normalizeHeaderName(header);
  if (isChargeAmountHeader(normalized)) return 100;
  if (normalized.includes("סכום עסקה")) return 40;
  if (normalized === "סכום" || normalized === "amount") return 70;
  return 50;
}

/** When the amount is the ILS charge column, prefer charge-currency headers. */
function currencyColumnPreference(header: string, preferChargeCurrency: boolean): number {
  const normalized = normalizeHeaderName(header);
  if (preferChargeCurrency && isChargeCurrencyHeader(normalized)) return 100;
  if (isChargeCurrencyHeader(normalized)) return 60;
  if (normalized.includes("מקור")) return preferChargeCurrency ? 10 : 50;
  return 40;
}

interface AliasMatch {
  field: ImportTargetField;
  score: number;
}

/**
 * Prefer exact alias matches, then the longest substring match (≥ 4 chars).
 * Currency-shaped headers (מטבע*) only compete for the currency field so
 * "מטבע חיוב" never wins debit via the "חיוב" substring.
 */
function matchHeaderToField(header: string): ImportTargetField | null {
  const normalized = normalizeHeaderName(header);
  if (!normalized || isIgnoredBankMetadataHeader(normalized)) return null;

  const currencyOnly = isCurrencyShapedHeader(normalized);
  const candidates: AliasMatch[] = [];

  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [
    ImportTargetField,
    string[],
  ][]) {
    if (currencyOnly && field !== "currency") continue;

    for (const alias of aliases) {
      const aliasNorm = normalizeHeaderName(alias);
      if (!aliasNorm) continue;
      if (normalized === aliasNorm) {
        candidates.push({ field, score: 1000 + aliasNorm.length });
        continue;
      }
      // Substring match only for aliases long enough to be unambiguous (≥ 4 chars).
      // Short aliases like "סוג" (3) or "שם" (2) must match exactly so they don't
      // accidentally match compound headers like "סוג תנועה".
      if (aliasNorm.length >= 4 && normalized.includes(aliasNorm)) {
        candidates.push({ field, score: aliasNorm.length });
      }
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Stable tie-break: prefer more specific money fields over generic amount.
    const order: ImportTargetField[] = [
      "debit",
      "credit",
      "currency",
      "date",
      "amount",
      "description",
      "type",
      "category",
      "recipient",
      "payment_method",
      "is_chomesh",
    ];
    return order.indexOf(a.field) - order.indexOf(b.field);
  });

  return candidates[0].field;
}

function clearTarget(
  mappings: ColumnMapping[],
  predicate: (mapping: ColumnMapping, index: number) => boolean,
): void {
  for (let index = 0; index < mappings.length; index++) {
    if (predicate(mappings[index], index)) {
      mappings[index] = { ...mappings[index], targetField: null };
    }
  }
}

/**
 * Drop weaker duplicate targets so auto-mapping stays actionable.
 * Prefers transaction date over value/charge dates, and ILS charge amount
 * over original-transaction amount when both appear (card exports).
 * When the kept amount is a charge column, currency prefers מטבע לחיוב /
 * מטבע חיוב over מטבע מקור so foreign-merchant ILS charges stay in ILS.
 */
function resolveMappingConflicts(mappings: ColumnMapping[]): ColumnMapping[] {
  const resolved = mappings.map((mapping) => ({ ...mapping }));

  const indicesFor = (field: ImportTargetField): number[] =>
    resolved
      .map((mapping, index) => (mapping.targetField === field ? index : -1))
      .filter((index) => index >= 0);

  const dateIndices = indicesFor("date");
  if (dateIndices.length > 1) {
    const best = dateIndices.reduce((winner, index) =>
      dateColumnPreference(resolved[index].sourceColumn) >
      dateColumnPreference(resolved[winner].sourceColumn)
        ? index
        : winner,
    );
    clearTarget(resolved, (mapping, index) => mapping.targetField === "date" && index !== best);
  }

  const amountIndices = indicesFor("amount");
  if (amountIndices.length > 1) {
    const best = amountIndices.reduce((winner, index) =>
      amountColumnPreference(resolved[index].sourceColumn) >
      amountColumnPreference(resolved[winner].sourceColumn)
        ? index
        : winner,
    );
    clearTarget(resolved, (mapping, index) => mapping.targetField === "amount" && index !== best);
  }

  // Resolve amount vs debit/credit before currency, so charge-currency
  // preference can follow the final amount column.
  const hasAmount = indicesFor("amount").length > 0;
  const debitIndices = indicesFor("debit");
  const creditIndices = indicesFor("credit");
  const hasDebit = debitIndices.length > 0;
  const hasCredit = creditIndices.length > 0;

  if (hasAmount && hasDebit && hasCredit) {
    // Bank-style separate debit/credit columns win over a generic amount column.
    clearTarget(resolved, (mapping) => mapping.targetField === "amount");
  } else if (hasDebit && !hasCredit) {
    const debitIndex = debitIndices[0];
    const debitHeader = normalizeHeaderName(resolved[debitIndex].sourceColumn);
    if (isChargeAmountHeader(debitHeader)) {
      // Card exports: keep "סכום חיוב" as debit so normalize-core signs it
      // negative → expense. Remapping to amount would treat purchases as income.
      clearTarget(resolved, (mapping) => mapping.targetField === "amount");
    } else if (hasAmount) {
      clearTarget(resolved, (mapping) => mapping.targetField === "debit");
    }
  } else if (hasAmount && hasCredit && !hasDebit) {
    clearTarget(resolved, (mapping) => mapping.targetField === "credit");
  }

  const finalAmountIndices = indicesFor("amount");
  const finalDebitIndices = indicesFor("debit");
  const preferChargeCurrency =
    finalAmountIndices.some((index) =>
      isChargeAmountHeader(normalizeHeaderName(resolved[index].sourceColumn)),
    ) ||
    finalDebitIndices.some((index) =>
      isChargeAmountHeader(normalizeHeaderName(resolved[index].sourceColumn)),
    );

  const currencyIndices = indicesFor("currency");
  if (currencyIndices.length > 1) {
    const best = currencyIndices.reduce((winner, index) =>
      currencyColumnPreference(resolved[index].sourceColumn, preferChargeCurrency) >
      currencyColumnPreference(resolved[winner].sourceColumn, preferChargeCurrency)
        ? index
        : winner,
    );
    clearTarget(
      resolved,
      (mapping, index) => mapping.targetField === "currency" && index !== best,
    );
  }

  for (const field of ["type", "category", "recipient", "payment_method", "is_chomesh"] as const) {
    const indices = indicesFor(field);
    if (indices.length > 1) {
      const best = indices[0];
      clearTarget(
        resolved,
        (mapping, index) => mapping.targetField === field && index !== best,
      );
    }
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// Mapping validation
// ---------------------------------------------------------------------------

export interface MappingValidationResult {
  valid: boolean;
  errors: MappingValidationError[];
}

export function validateMappings(
  mappings: ColumnMapping[]
): MappingValidationResult {
  const errors: MappingValidationError[] = [];
  const mapped = mappings.filter((m) => m.targetField !== null);

  const targets = mapped.map((m) => m.targetField!);

  // Check for duplicate targets. Description is intentionally composable:
  // many real bank exports split merchant/details/reference into separate columns.
  const seen = new Set<ImportTargetField>();
  for (const t of targets) {
    if (seen.has(t)) {
      if (t !== "description" && !errors.includes("duplicateTarget")) {
        errors.push("duplicateTarget");
      }
    }
    seen.add(t);
  }

  const hasAmount = targets.includes("amount");
  const hasDebit = targets.includes("debit");
  const hasCredit = targets.includes("credit");

  // amount mutually exclusive with debit/credit
  if (hasAmount && (hasDebit || hasCredit)) {
    errors.push("amountAndDebitCredit");
  }

  // date is required
  if (!targets.includes("date")) {
    errors.push("dateMissing");
  }

  // amount, debit, or credit required (debit-only or credit-only files are valid)
  if (!hasAmount && !hasDebit && !hasCredit) {
    errors.push("amountMissing");
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Apply mapping to a raw row
// ---------------------------------------------------------------------------

export function applyMappings(
  rawRow: Record<string, unknown>,
  mappings: ColumnMapping[]
): ImportMappedRow {
  const result: ImportMappedRow = {};
  const descriptionParts: unknown[] = [];

  for (const { sourceColumn, targetField } of mappings) {
    if (!targetField) continue;
    if (!(sourceColumn in rawRow)) continue;

    const value = rawRow[sourceColumn];

    // Check for formula flag from Excel parser
    const isFormula = rawRow[`__formula_${sourceColumn}`] === true;

    const mappedValue = isFormula
      ? { __formulaValue: value, __isFormula: true }
      : value;

    if (targetField === "description") {
      descriptionParts.push(mappedValue);
      continue;
    }

    result[targetField] = mappedValue;
  }

  if (descriptionParts.length > 0) {
    result.description = combineDescriptionParts(descriptionParts);
  }

  return result;
}

function combineDescriptionParts(parts: unknown[]): string {
  const normalized = parts
    .map((part) => {
      if (
        part !== null &&
        typeof part === "object" &&
        "__formulaValue" in (part as object)
      ) {
        return (part as { __formulaValue: unknown }).__formulaValue;
      }
      return part;
    })
    .map((part) => String(part ?? "").trim())
    .filter(Boolean);

  if (normalized.length === 0) return "";
  return normalized.join(" - ");
}

export function analyzeParsedFile(
  file: ParsedFile,
  mappings: ColumnMapping[] = suggestMappings(file.headers)
): ParsedFileDiagnostic[] {
  const diagnostics: ParsedFileDiagnostic[] = [];
  const normalizedHeaders = file.headers.map(normalizeHeaderName);
  const duplicateHeaders = findDuplicateHeaders(file.headers, normalizedHeaders);
  const emptyHeaderCount = file.headers.filter((header) => header.trim() === "").length;

  if (duplicateHeaders.length > 0) {
    diagnostics.push({
      code: "duplicate_headers",
      columns: duplicateHeaders,
      count: duplicateHeaders.length,
    });
  }

  if (emptyHeaderCount > 0) {
    diagnostics.push({ code: "empty_headers", count: emptyHeaderCount });
  }

  const descriptionCandidates = mappings
    .filter((mapping) => mapping.targetField === "description")
    .map((mapping) => mapping.sourceColumn);
  if (descriptionCandidates.length > 1) {
    diagnostics.push({
      code: "multiple_description_candidates",
      columns: descriptionCandidates,
      count: descriptionCandidates.length,
    });
  }

  const targets = mappings.map((mapping) => mapping.targetField);
  if (
    targets.includes("amount") &&
    (targets.includes("debit") || targets.includes("credit"))
  ) {
    diagnostics.push({ code: "amount_debit_credit_columns" });
  }

  const unmappedCount = mappings.filter((mapping) => mapping.targetField === null).length;
  if (file.headers.length > 0 && unmappedCount >= Math.max(4, file.headers.length / 2)) {
    diagnostics.push({ code: "many_unmapped_columns", count: unmappedCount });
  }

  if ((file.availableSheets?.length ?? 0) > 1) {
    diagnostics.push({
      code: "multi_sheet_workbook",
      columns: file.availableSheets,
      count: file.availableSheets?.length,
    });
  }

  return diagnostics;
}

function findDuplicateHeaders(
  headers: string[],
  normalizedHeaders: string[]
): string[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (let index = 0; index < normalizedHeaders.length; index++) {
    const normalized = normalizedHeaders[index];
    if (!normalized) continue;
    const existing = counts.get(normalized);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(normalized, { label: headers[index], count: 1 });
    }
  }

  return Array.from(counts.values())
    .filter((entry) => entry.count > 1)
    .map((entry) => entry.label);
}
