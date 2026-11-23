import type { ImportPreviewRow } from "./import-session.types";
import { revalidateAfterEdit } from "./validation";
import { getBulkCategoryFamily } from "@/lib/tableTransactions/bulkActions";
import type { Transaction, RecurringTransaction, TransactionType } from "@/types/transaction";

export type ImportBulkEditPatch = {
  type?: TransactionType;
  category?: string | null;
};

export type ImportBulkEditContext = {
  existingTransactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
};

/**
 * Apply a local bulk type/category patch to selected import preview rows.
 * Does not touch the DB — only returns an updated previewRows array.
 */
export function applyBulkEdit(
  rows: readonly ImportPreviewRow[],
  ids: readonly string[],
  patch: ImportBulkEditPatch,
  context: ImportBulkEditContext,
): ImportPreviewRow[] {
  if (patch.type === undefined && patch.category === undefined) {
    return [...rows];
  }

  const idSet = new Set(ids);

  return rows.map((row) => {
    if (!idSet.has(row.id) || !row.normalized) {
      return row;
    }

    const previousType = row.normalized.type;
    const nextType = patch.type ?? previousType;
    let nextCategory = row.normalized.category;

    if (patch.type !== undefined) {
      const previousFamily =
        previousType == null
          ? null
          : getBulkCategoryFamily([{ type: previousType }]);
      const nextFamily = getBulkCategoryFamily([{ type: patch.type }]);
      if (previousFamily !== nextFamily && patch.category === undefined) {
        nextCategory = null;
      }
    }

    if (patch.category !== undefined) {
      nextCategory = patch.category;
    }

    const updated: ImportPreviewRow = {
      ...row,
      normalized: {
        ...row.normalized,
        type: nextType,
        category: nextCategory,
      },
    };

    const { issues, status } = revalidateAfterEdit(updated, context);

    return {
      ...updated,
      issues,
      status,
      approved: status === "invalid" ? false : row.approved,
    };
  });
}
