const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Matches ai.undo_intake_commit: unedited, and created within 7 days. */
export function canUndoAiTransaction(
  transaction: { created_at: string; updated_at: string },
  now = Date.now(),
): boolean {
  const created = Date.parse(transaction.created_at);
  const updated = Date.parse(transaction.updated_at);
  if (!Number.isFinite(created) || !Number.isFinite(updated)) return false;
  if (now - created > SEVEN_DAYS_MS) return false;
  return Math.abs(updated - created) < 1000;
}
