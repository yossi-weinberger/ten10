import type {
  ImportPreviewRow,
  ImportNormalizedRow,
  ImportRowIssue,
  ImportRowStatus,
} from "./import-session.types";
import type { Transaction, RecurringTransaction } from "@/types/transaction";
import { buildExistingFingerprintSet, checkDuplicate } from "./duplicate-detector";
import { checkRecurringWarning } from "./recurring-warning-detector";

/**
 * Compute the final status and any additional post-normalization issues.
 * Called after normalization + duplicate/recurring detection.
 */
export function computeRowStatus(
  row: Pick<ImportPreviewRow, "normalized" | "issues">
): ImportRowStatus {
  // No normalized data means normalization found fatal errors → invalid
  if (!row.normalized) return "invalid";

  const hasFatal = row.issues.some((i) => isFatalIssue(i));
  if (hasFatal) return "invalid";

  const hasWarning = row.issues.some((i) => isWarningIssue(i));
  if (hasWarning) return "needs_review";

  return "ready";
}

/** Issues that make a row invalid (cannot be approved). */
function isFatalIssue(issue: ImportRowIssue): boolean {
  const fatal: ImportRowIssue["code"][] = [
    "missing_required_field",
    "invalid_date",
    "invalid_amount",
    "zero_amount",
    "unsupported_currency",
    "foreign_currency_not_supported",
    "donation_recipient_required",
  ];
  return fatal.includes(issue.code);
}

/** Issues that are warnings (row can still be approved by user). */
function isWarningIssue(issue: ImportRowIssue): boolean {
  const warnings: ImportRowIssue["code"][] = [
    "ambiguous_debit_credit",
    "possible_duplicate",
    "possible_recurring",
    "formula_cell",
    "invalid_type",
    "income_keyword_match",
  ];
  return warnings.includes(issue.code);
}

/**
 * Post-normalization validation for donation-specific rules.
 * Recipient is optional — consistent with the existing transaction form behavior.
 * This function is kept as a no-op hook for future enforcement if the product decides to require it.
 */
export function validateDonationRules(
  normalized: ImportNormalizedRow,
  issues: ImportRowIssue[]
): void {
  // Recipient is not enforced for donations — matches existing add-transaction form behavior.
  // Keep the signature so callers don't need to change if enforcement is added later.
  void normalized;
  void issues;
}

/**
 * Determine the default approval state for a preview row.
 * - ready → selected by default
 * - needs_review → not selected by default
 * - invalid → cannot be selected (false)
 */
export function defaultApprovalForStatus(status: ImportRowStatus): boolean {
  return status === "ready";
}

/**
 * Re-validate a single row after an in-review edit.
 * Returns updated issues and status.
 *
 * If `context` is provided, duplicate and recurring checks are re-run against
 * the live data. If omitted, stale possible_duplicate / possible_recurring
 * warnings are cleared rather than blindly preserved.
 */
export function revalidateAfterEdit(
  row: ImportPreviewRow,
  context?: {
    existingTransactions: Transaction[];
    recurringTransactions: RecurringTransaction[];
  }
): Pick<ImportPreviewRow, "issues" | "status"> {
  if (!row.normalized) {
    return { issues: row.issues, status: "invalid" };
  }

  const issues: ImportRowIssue[] = [];

  validateDonationRules(row.normalized, issues);

  if (context) {
    const fps = buildExistingFingerprintSet(context.existingTransactions);
    const dupIssue = checkDuplicate(row.normalized, fps);
    if (dupIssue) issues.push(dupIssue);

    const recIssue = checkRecurringWarning(row.normalized, context.recurringTransactions);
    if (recIssue) issues.push(recIssue);
  }
  // When context is absent, possible_duplicate and possible_recurring are
  // intentionally dropped — stale warnings must not persist after an edit.

  const status = computeRowStatus({ normalized: row.normalized, issues });

  return { issues, status };
}
