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
