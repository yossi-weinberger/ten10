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

  return headers.map((header) => {
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

function matchHeaderToField(header: string): ImportTargetField | null {
  const normalized = normalizeHeaderName(header);

  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [
    ImportTargetField,
    string[],
  ][]) {
    for (const alias of aliases) {
      if (normalized === alias) return field;
      // Substring match only for aliases long enough to be unambiguous (≥ 4 chars).
      // Short aliases like "סוג" (3) or "שם" (2) must match exactly so they don't
      // accidentally match compound headers like "סוג תנועה".
      if (alias.length >= 4 && normalized.includes(alias)) return field;
    }
  }

  return null;
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
