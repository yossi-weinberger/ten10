/**
 * Central mapping of DB field names for the project.
 * Use when normalizing data from old export files (camelCase) to DB schema (snake_case),
 * or when you need a single source of truth for transaction column names.
 *
 * Sources of truth:
 * - TypeScript: src/types/transaction.ts (Transaction interface)
 * - Supabase: migrations 20260121 (currency), 20260122 (update_user_transaction allowed_columns),
 *   Edge Function process-recurring-transactions insert list
 * - SQLite: src-tauri/src/commands/db_commands.rs (CREATE/ALTER), transaction_commands.rs (INSERT)
 */

/** camelCase -> snake_case for Transaction table (old export files may use camelCase) */
export const TRANSACTION_CAMEL_TO_SNAKE: Record<string, string> = {
  createdAt: "created_at",
  updatedAt: "updated_at",
  isChomesh: "is_chomesh",
  originalAmount: "original_amount",
  originalCurrency: "original_currency",
  conversionRate: "conversion_rate",
  conversionDate: "conversion_date",
  rateSource: "rate_source",
  executionCount: "execution_count",
  totalOccurrences: "total_occurrences",
  recurringStatus: "recurring_status",
  recurringFrequency: "recurring_frequency",
  occurrenceNumber: "occurrence_number",
  recurringDayOfMonth: "recurring_day_of_month",
  recurringTotalCount: "recurring_total_count",
};

/** camelCase -> snake_case for RecurringTransaction table */
export const RECURRING_CAMEL_TO_SNAKE: Record<string, string> = {
  createdAt: "created_at",
  updatedAt: "updated_at",
  startDate: "start_date",
  nextDueDate: "next_due_date",
  dayOfMonth: "day_of_month",
  totalOccurrences: "total_occurrences",
  executionCount: "execution_count",
  isChomesh: "is_chomesh",
  originalAmount: "original_amount",
  originalCurrency: "original_currency",
  conversionRate: "conversion_rate",
  conversionDate: "conversion_date",
  rateSource: "rate_source",
};

/**
 * Keys to remove from transaction row before insert.
 * - id: auto-generated on insert (Supabase gen_random_uuid(); Desktop nanoid in app).
 * - recurring_info: joined data, not a column (TransactionForTable display only).
 * - is_recurring / isRecurring: removed in migration (db_commands DROP).
 * - sourceRecurringId (camelCase): dropped; caller supplies source_recurring_id (new recurring id from import).
 * - recurring_day_of_month, recurring_total_count (and camelCase): not sent on insert (addTransaction strips; RPC allows recurring_total_count for update only).
 * - execution_count, total_occurrences, recurring_status, recurring_frequency: not columns in transactions table; come from JOIN with recurring_transactions in reads. Edge Function insert does not send them.
 */
export const TRANSACTION_KEYS_TO_DROP_ON_INSERT: string[] = [
  "id",
  "recurring_info",
  "is_recurring",
  "isRecurring",
  "sourceRecurringId",
  "recurring_day_of_month",
  "recurring_total_count",
  "recurringDayOfMonth",
  "recurringTotalCount",
  "execution_count",
  "total_occurrences",
  "recurring_status",
  "recurring_frequency",
];

/**
 * Keys to remove from recurring transaction row before insert.
 * - id: auto-generated on insert.
 */
export const RECURRING_KEYS_TO_DROP_ON_INSERT: string[] = ["id"];

/**
 * Normalize an object: map known camelCase keys to snake_case and drop excluded keys.
 * Used for import from old export files into Supabase (snake_case schema).
 */
export function normalizeKeysToSnake<T extends Record<string, unknown>>(
  obj: T,
  camelToSnake: Record<string, string>,
  keysToDrop: string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...obj };
  for (const [camel, snake] of Object.entries(camelToSnake)) {
    if (camel in result && result[camel] !== undefined) {
      result[snake] = result[camel];
      delete result[camel];
    }
  }
  for (const key of keysToDrop) {
    delete result[key];
  }
  return result;
}
