import type { RecurringTransaction, Transaction } from "@/types/transaction";
import { parseImportFile } from "./importParse";

/**
 * Normalizes one import row: V2 table rows may be `TransactionForTable`-like
 * (`transaction` + `recurring_info`) or a plain `Transaction`.
 */
export function unpackImportTransactionItem(item: unknown): {
  transaction: Record<string, unknown>;
  recurringInfo: Record<string, unknown> | undefined;
  oldRecurringId: string | undefined;
} {
  const row = item as Record<string, unknown>;
  const inner = row.transaction;
  const transaction = (
    inner && typeof inner === "object" && inner !== null ? inner : row
  ) as Record<string, unknown>;
  const recurringInfoRaw = row.recurring_info;
  const recurringInfo =
    recurringInfoRaw &&
    typeof recurringInfoRaw === "object" &&
    recurringInfoRaw !== null
      ? (recurringInfoRaw as Record<string, unknown>)
      : undefined;

  const sourceRecurring = transaction.source_recurring_id;
  const sourceFromTx =
    typeof sourceRecurring === "string" ? sourceRecurring : undefined;
  const recIdVal =
    recurringInfo && typeof recurringInfo.id === "string"
      ? recurringInfo.id
      : undefined;

  return {
    transaction,
    recurringInfo,
    oldRecurringId: sourceFromTx ?? recIdVal,
  };
}

export const WEB_IMPORT_BATCH_SIZE = 100;

export type ParseImportFileResult =
  | {
      ok: true;
      transactions: Transaction[];
      recurring: RecurringTransaction[];
    }
  | { ok: false; error: "invalid_json" | "invalid_structure" };

/**
 * Parse and validate backup JSON. Centralizes error classification for web/desktop import.
 */
export function tryParseImportFileContents(raw: string): ParseImportFileResult {
  try {
    const { transactions, recurring } = parseImportFile(raw);
    return { ok: true, transactions, recurring };
  } catch (e) {
    if (e instanceof Error && e.message === "invalid_structure") {
      return { ok: false, error: "invalid_structure" };
    }
    return { ok: false, error: "invalid_json" };
  }
}

export function isImportPayloadEmpty(
  transactions: Transaction[],
  recurring: RecurringTransaction[]
): boolean {
  return transactions.length === 0 && recurring.length === 0;
}

export const TRANSACTION_DEDUPE_SELECT_FIELDS = [
  "date",
  "amount",
  "currency",
  "type",
  "category",
  "description",
  "recipient",
  "payment_method",
  "is_chomesh",
  "original_amount",
  "original_currency",
  "conversion_rate",
  "conversion_date",
  "rate_source",
  "occurrence_number",
] as const;

const TRANSACTION_FINGERPRINT_FIELDS = [
  ["date"],
  ["amount"],
  ["currency"],
  ["type"],
  ["category"],
  ["description"],
  ["recipient"],
  ["payment_method", "paymentMethod"],
  ["is_chomesh", "isChomesh"],
  ["original_amount", "originalAmount"],
  ["original_currency", "originalCurrency"],
  ["conversion_rate", "conversionRate"],
  ["conversion_date", "conversionDate"],
  ["rate_source", "rateSource"],
  ["occurrence_number", "occurrenceNumber"],
] as const;

export interface ImportDuplicateFilterResult<T> {
  unique: T[];
  duplicates: T[];
}

function readFirstKnownField(
  row: Record<string, unknown>,
  keys: readonly string[]
): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return row[key];
    }
  }
  return null;
}

function normalizeFingerprintValue(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "boolean" || value === null) {
    return value;
  }
  return value ?? null;
}

export function buildTransactionImportFingerprint(item: unknown): string {
  const { transaction } = unpackImportTransactionItem(item);
  const normalized = TRANSACTION_FINGERPRINT_FIELDS.map((keys) =>
    normalizeFingerprintValue(readFirstKnownField(transaction, keys))
  );
  return JSON.stringify(normalized);
}

export function filterDuplicateImportTransactions<T>(
  imported: T[],
  existing: unknown[]
): ImportDuplicateFilterResult<T> {
  const seenFingerprints = new Set(
    existing.map((transaction) => buildTransactionImportFingerprint(transaction))
  );
  const unique: T[] = [];
  const duplicates: T[] = [];

  for (const item of imported) {
    const fingerprint = buildTransactionImportFingerprint(item);
    if (seenFingerprints.has(fingerprint)) {
      duplicates.push(item);
      continue;
    }

    seenFingerprints.add(fingerprint);
    unique.push(item);
  }

  return { unique, duplicates };
}

/** Total progress steps for web import (recurring inserts + tx prep + tx batch inserts). */
export function getWebImportProgressTotal(
  recurringCount: number,
  transactionCount: number
): number {
  return recurringCount + 2 * transactionCount;
}

/** Total progress steps for desktop import (recurring inserts + per-transaction inserts). */
export function getDesktopImportProgressTotal(
  recurringCount: number,
  transactionCount: number
): number {
  return recurringCount + transactionCount;
}
