import type { ImportPreviewRow } from "./import-session.types";

/**
 * Rows that cannot be approved or persisted yet:
 * invalid, unresolved card_refund, or normalized type still unset.
 */
export function rowBlocksApproval(
  row: Pick<ImportPreviewRow, "status" | "issues" | "normalized">,
): boolean {
  if (row.status === "invalid") return true;
  if (row.issues.some((issue) => issue.code === "card_refund")) return true;
  if (row.normalized != null && row.normalized.type == null) return true;
  return false;
}

/** Approved rows that are safe to persist (excludes blocked refunds). */
export function getApprovedRows(rows: ImportPreviewRow[]): ImportPreviewRow[] {
  return rows.filter(
    (r) => r.approved && r.normalized != null && !rowBlocksApproval(r),
  );
}
