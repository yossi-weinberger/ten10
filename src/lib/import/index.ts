export type {
  ImportRowStatus,
  ImportTargetField,
  ImportIssueCode,
  ImportRowIssue,
  ImportMappedRow,
  ImportNormalizedRow,
  ImportPreviewRow,
  ColumnMapping,
  ParsedFile,
  ParsedSheet,
  ParseFileResult,
  ParseFileSuccess,
  ParseFileError,
  ImportResult,
  ImportSummary,
  MappingValidationError,
} from "./import-session.types";

export { parseFile, parseCSVText, parseExcelBuffer, MAX_FILE_SIZE_BYTES, MAX_ROWS } from "./parsers";
export { suggestMappings, validateMappings, applyMappings, detectTen10Template, analyzeParsedFile } from "./mapping";
export { TEN10_TEMPLATE_HEADERS, TEN10_TEMPLATE_COLUMNS, generateTemplateCsv, downloadTemplateCsv } from "./ten10-template";
export { parseDate, parseAmount, normalizeRow } from "./normalize";
export { resolveType } from "./type-resolver";
export { computeRowStatus, validateDonationRules, defaultApprovalForStatus, revalidateAfterEdit } from "./validation";
export { buildExistingFingerprintSet, checkDuplicate, buildBatchFingerprintSet } from "./duplicate-detector";
export { checkRecurringWarning } from "./recurring-warning-detector";
export { persistApprovedImport } from "./persist-approved-import";

import { nanoid } from "nanoid";
import type { ImportPreviewRow, ImportMappedRow, ImportRowIssue, ImportRowStatus, ImportSummary, ColumnMapping, ParsedFile } from "./import-session.types";
import type { Transaction, RecurringTransaction } from "@/types/transaction";
import type { Currency } from "@/types/transaction";
import {
  AI_DRAFT,
  type NormalizedTransactionRow,
} from "../../../supabase/functions/_shared/transaction-domain/normalize-core.ts";
import { applyMappings } from "./mapping";
import { normalizeRow, type NormalizeRowResult } from "./normalize";
import { validateDonationRules, computeRowStatus, defaultApprovalForStatus } from "./validation";
import { buildExistingFingerprintSet, checkDuplicate, buildBatchFingerprintSet } from "./duplicate-detector";
import { checkRecurringWarning } from "./recurring-warning-detector";

const BUILD_PREVIEW_CHUNK_SIZE = 100;

interface PreviewContext {
  existingFingerprints: Set<string>;
  batchDeduper: ReturnType<typeof buildBatchFingerprintSet>;
  recurringIndex: Map<string, RecurringTransaction[]>;
}

function createPreviewContext(
  existingTransactions: Transaction[],
  recurringTransactions: RecurringTransaction[]
): PreviewContext {
  // Pre-index recurring transactions by currency:type for O(1) lookup per row
  const recurringIndex = new Map<string, RecurringTransaction[]>();
  for (const rec of recurringTransactions) {
    const key = `${rec.currency}:${rec.type}`;
    const bucket = recurringIndex.get(key);
    if (bucket) {
      bucket.push(rec);
    } else {
      recurringIndex.set(key, [rec]);
    }
  }

  return {
    existingFingerprints: buildExistingFingerprintSet(existingTransactions),
    batchDeduper: buildBatchFingerprintSet(),
    recurringIndex,
  };
}

/** validate → dedupe → recurring check → status for one normalized result. */
function toPreviewRow(
  context: PreviewContext,
  rowNumber: number,
  raw: Record<string, unknown>,
  mapped: ImportMappedRow,
  { normalized, issues }: NormalizeRowResult
): ImportPreviewRow {
  const allIssues: ImportRowIssue[] = [...issues];

  if (normalized) {
    validateDonationRules(normalized, allIssues);

    const dupIssue = checkDuplicate(normalized, context.existingFingerprints);
    if (dupIssue) allIssues.push(dupIssue);

    const batchDupIssue = context.batchDeduper.check(normalized);
    if (batchDupIssue && !dupIssue) allIssues.push(batchDupIssue);

    const recurringCandidates = context.recurringIndex.get(`${normalized.currency}:${normalized.type}`) ?? [];
    const recurringIssue = checkRecurringWarning(normalized, recurringCandidates);
    if (recurringIssue) allIssues.push(recurringIssue);
  }

  const status: ImportRowStatus = computeRowStatus({ normalized: normalized ?? undefined, issues: allIssues });
  const approved = defaultApprovalForStatus(status);

  return {
    id: nanoid(),
    rowNumber,
    raw,
    mapped,
    normalized: normalized ?? undefined,
    status,
    issues: allIssues,
    approved,
  };
}

/**
 * Build all ImportPreviewRows from a parsed file given mappings and context.
 * This is the main pipeline: map → normalize → validate → dedupe → recurring check.
 *
 * Processes rows in async chunks so the event loop stays responsive for large files
 * and any progress spinner can actually render between chunks.
 */
export async function buildPreviewRows(
  parsedFile: ParsedFile,
  mappings: ColumnMapping[],
  userDefaultCurrency: Currency,
  existingTransactions: Transaction[],
  recurringTransactions: RecurringTransaction[],
  onProgress?: (processed: number, total: number) => void
): Promise<{ rows: ImportPreviewRow[]; dateRange: { from: string; to: string } | null }> {
  const context = createPreviewContext(existingTransactions, recurringTransactions);

  const results: ImportPreviewRow[] = [];
  const total = parsedFile.rows.length;
  let dateFrom: string | null = null;
  let dateTo: string | null = null;

  for (let offset = 0; offset < total; offset += BUILD_PREVIEW_CHUNK_SIZE) {
    const chunkEnd = Math.min(offset + BUILD_PREVIEW_CHUNK_SIZE, total);

    for (let i = offset; i < chunkEnd; i++) {
      const rawRow = parsedFile.rows[i];
      const mapped: ImportMappedRow = applyMappings(rawRow, mappings);
      const row = toPreviewRow(context, i + 1, rawRow, mapped, normalizeRow(mapped, userDefaultCurrency));

      if (row.normalized) {
        // Track date range for dedup scoping
        if (!dateFrom || row.normalized.date < dateFrom) dateFrom = row.normalized.date;
        if (!dateTo || row.normalized.date > dateTo) dateTo = row.normalized.date;
      }

      results.push(row);
    }

    onProgress?.(chunkEnd, total);

    if (chunkEnd < total) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  return {
    rows: results,
    dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : null,
  };
}

/**
 * Build preview rows from rows that are already normalized (AI drafts).
 * Each row goes back through normalizeRow with AI_DRAFT, then the same
 * dedupe, recurring and status steps as buildPreviewRows.
 * The import save drops conversion data, so a row with original_currency
 * is invalid instead of being saved without it.
 */
export function previewRowsFromNormalized(
  rows: NormalizedTransactionRow[],
  existingTransactions: Transaction[],
  recurringTransactions: RecurringTransaction[]
): ImportPreviewRow[] {
  const context = createPreviewContext(existingTransactions, recurringTransactions);

  return rows.map((row, i) => {
    const mapped: ImportMappedRow = {
      date: row.date,
      amount: row.amount,
      currency: row.currency,
      description: row.description,
      type: row.type,
      category: row.category,
      recipient: row.recipient,
      payment_method: row.payment_method,
      is_chomesh: row.is_chomesh,
    };
    // Without original_currency, row.currency is already the user's default.
    const result = normalizeRow(mapped, row.currency as Currency, AI_DRAFT);
    const savable: NormalizeRowResult =
      row.original_currency === null
        ? result
        : {
            normalized: null,
            issues: [
              ...result.issues,
              { code: "foreign_currency_not_supported", field: "currency", detail: row.original_currency },
            ],
          };
    return toPreviewRow(context, i + 1, { ...row }, mapped, savable);
  });
}

/**
 * Compute import summary statistics from preview rows.
 */
export function computeImportSummary(rows: ImportPreviewRow[]): ImportSummary {
  let ready = 0;
  let invalid = 0;
  let needsReview = 0;
  let duplicateWarnings = 0;
  let recurringWarnings = 0;
  let approved = 0;
  let approvedIncome = 0;
  let approvedExpenses = 0;
  let approvedDonations = 0;
  let dateRangeMin: string | null = null;
  let dateRangeMax: string | null = null;
  const issueCounts: Partial<Record<import("./import-session.types").ImportIssueCode, number>> = {};

  for (const row of rows) {
    if (row.status === "ready") ready++;
    else if (row.status === "invalid") invalid++;
    else if (row.status === "needs_review") needsReview++;

    // Count per-issue-code occurrences (one per row, even if the row has multiple of the same code)
    const seenCodes = new Set<string>();
    for (const issue of row.issues) {
      if (!seenCodes.has(issue.code)) {
        seenCodes.add(issue.code);
        issueCounts[issue.code] = (issueCounts[issue.code] ?? 0) + 1;
      }
    }

    if (row.issues.some((i) => i.code === "possible_duplicate")) duplicateWarnings++;
    if (row.issues.some((i) => i.code === "possible_recurring")) recurringWarnings++;

    if (row.approved && row.normalized) {
      approved++;
      const { type, date, amount } = row.normalized;
      if (type === "income" || type === "exempt-income") approvedIncome += amount;
      else if (type === "expense" || type === "recognized-expense") approvedExpenses += amount;
      else if (type === "donation" || type === "non_tithe_donation") approvedDonations += amount;

      if (!dateRangeMin || date < dateRangeMin) dateRangeMin = date;
      if (!dateRangeMax || date > dateRangeMax) dateRangeMax = date;
    }
  }

  return {
    total: rows.length,
    ready,
    invalid,
    needsReview,
    duplicateWarnings,
    recurringWarnings,
    issueCounts,
    approved,
    approvedIncome,
    approvedExpenses,
    approvedDonations,
    dateRangeMin,
    dateRangeMax,
  };
}
