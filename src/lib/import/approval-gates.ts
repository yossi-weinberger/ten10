import type { ImportPreviewRow } from "./import-session.types";

/** Rows with unresolved card refunds cannot be approved until edited. */
export function rowBlocksApproval(
  row: Pick<ImportPreviewRow, "status" | "issues">,
): boolean {
  if (row.status === "invalid") return true;
  return row.issues.some((issue) => issue.code === "card_refund");
}
