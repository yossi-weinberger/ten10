import type { ImportNormalizedRow, ImportRowIssue } from "./import-session.types";
import type { RecurringTransaction } from "@/types/transaction";

const AMOUNT_TOLERANCE_PERCENT = 0.05; // 5%
const DAY_OF_MONTH_TOLERANCE = 3; // ±3 days

/**
 * Check if a normalized row may match an existing recurring transaction.
 * Returns a `possible_recurring` warning issue, or null if no match.
 */
export function checkRecurringWarning(
  row: ImportNormalizedRow,
  recurringTransactions: RecurringTransaction[]
): ImportRowIssue | null {
  const rowDate = new Date(row.date + "T00:00:00");
  const rowDayOfMonth = rowDate.getDate();

  for (const rec of recurringTransactions) {
    if (rec.status !== "active" && rec.status !== "paused") continue;
    if (rec.currency !== row.currency) continue;
    if (rec.type !== row.type) continue;

    // Amount match within tolerance
    const amountDiff = Math.abs(rec.amount - row.amount);
    const tolerance = rec.amount * AMOUNT_TOLERANCE_PERCENT;
    if (amountDiff > tolerance + 0.01) continue;

    // Day-of-month match (for monthly recurring)
    if (rec.frequency === "monthly" && rec.day_of_month) {
      const diff = Math.abs(rec.day_of_month - rowDayOfMonth);
      if (diff > DAY_OF_MONTH_TOLERANCE) continue;
    }

    // Description / recipient similarity (optional — skip if both are null)
    const recDesc = (rec.description ?? "").trim().toLowerCase();
    const rowDesc = (row.description ?? "").trim().toLowerCase();
    if (recDesc && rowDesc && !fuzzyMatch(recDesc, rowDesc)) {
      continue;
    }

    return { code: "possible_recurring" };
  }

  return null;
}

/** Naive substring-based fuzzy match. */
function fuzzyMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  if (shorter.length < 4) return false;
  return longer.includes(shorter.slice(0, Math.ceil(shorter.length * 0.6)));
}
