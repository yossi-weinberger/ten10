import type { Transaction } from "@/types/transaction";
import i18n from "@/lib/i18n";
import { formatCategory } from "@/lib/category-registry";

/**
 * Shared row-derivation logic used identically by both the CSV and Excel
 * transaction exporters (export-csv.ts, export-excel.ts). Kept separate from
 * PDF export, which reads recurrence off a different shape (TransactionForTable's
 * `recurring_info`) rather than these flat Transaction fields.
 */
export function getRecurringExportInfo(
  transaction: Pick<
    Transaction,
    "source_recurring_id" | "recurring_frequency" | "occurrence_number" | "total_occurrences"
  >,
  currentLanguage: string
): { isRecurring: boolean; frequencyText: string; progressText: string } {
  const isRecurring = !!(
    transaction.source_recurring_id || transaction.recurring_frequency
  );

  const frequencyText = transaction.recurring_frequency
    ? i18n.t(`pdf.frequencies.${transaction.recurring_frequency}`, {
        lng: currentLanguage,
        ns: "common",
      }) || transaction.recurring_frequency
    : "";

  const progressText =
    transaction.occurrence_number && transaction.total_occurrences
      ? `${transaction.occurrence_number}/${transaction.total_occurrences}`
      : transaction.occurrence_number
      ? `${transaction.occurrence_number}/∞`
      : "";

  return { isRecurring, frequencyText, progressText };
}

/** Resolves a transaction's category label using the same income/expense base-type mapping in both exporters. */
export function getExportCategoryLabel(
  transaction: Pick<Transaction, "type" | "category">,
  currentLanguage: string
): string {
  const baseType =
    transaction.type === "income" || transaction.type === "exempt-income"
      ? "income"
      : transaction.type === "expense" || transaction.type === "recognized-expense"
      ? "expense"
      : undefined;
  return formatCategory(baseType, transaction.category, currentLanguage);
}
