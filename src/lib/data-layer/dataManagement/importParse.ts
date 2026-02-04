import { RecurringTransaction, Transaction } from "@/types/transaction";
import { logger } from "@/lib/logger";
import {
  TRANSACTION_CAMEL_TO_SNAKE,
  TRANSACTION_KEYS_TO_DROP_ON_INSERT,
  normalizeKeysToSnake,
} from "../fieldMapping";
import { ImportFileSchema } from "../importSchemas";

/**
 * Normalize a transaction from an export file for Supabase insert.
 * Uses central field mapping (fieldMapping.ts): camelCase -> snake_case and keys to drop.
 * source_recurring_id comes from param (new recurring id from import), not from file.
 */
export function normalizeTransactionRowForSupabase(
  transaction: Record<string, unknown>,
  user_id: string,
  source_recurring_id: string | null
): Record<string, unknown> {
  return normalizeKeysToSnake(
    { ...transaction, user_id, source_recurring_id },
    TRANSACTION_CAMEL_TO_SNAKE,
    TRANSACTION_KEYS_TO_DROP_ON_INSERT
  );
}

export function parseImportFile(raw: string): {
  transactions: Transaction[];
  recurring: RecurringTransaction[];
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    logger.error("Import file JSON parse error:", error);
    throw new Error("invalid_json");
  }

  const result = ImportFileSchema.safeParse(parsed);
  if (!result.success) {
    logger.error("Import file schema validation error:", result.error);
    const err = new Error("invalid_structure");
    (err as Error & { zodError?: unknown }).zodError = result.error;
    throw err;
  }

  return {
    transactions: result.data.transactions as unknown as Transaction[],
    recurring: result.data
      .recurring_transactions as unknown as RecurringTransaction[],
  };
}
