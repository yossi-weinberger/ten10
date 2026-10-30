/** Reads the answer of `consume_ai_usage` and `consume_ai_call`. */

export type UsageKind = "text" | "receipt" | "speech";

export type UsageBlockReason = "quota_exhausted" | "rate_limited" | "daily_limit" | "unavailable";

export type UsageDecision =
  | { allowed: true; usageId: string | null }
  | { allowed: false; reason: UsageBlockReason; resetsAt: string | null };

const BLOCK_REASONS: readonly UsageBlockReason[] = ["quota_exhausted", "rate_limited", "daily_limit"];
const RELEASE_WINDOW_MS = 60_000;

/**
 * A client may release only its own text unit from the last minute.
 * Anything else would let a caller reset the quota.
 */
export function mayReleaseRecentTextUsage(
  row: { user_id?: unknown; kind?: unknown; created_at?: unknown; released_at?: unknown } | null,
  callerId: string,
  now: number,
): boolean {
  if (!row || row.user_id !== callerId || row.kind !== "text" || row.released_at) return false;
  if (typeof row.created_at !== "string") return false;
  const created = Date.parse(row.created_at);
  if (!Number.isFinite(created)) return false;
  const age = now - created;
  return age >= 0 && age <= RELEASE_WINDOW_MS;
}

/** A failed or unreadable check blocks the call: the provider is never reached without a count. */
export function readUsageDecision(data: unknown, error: unknown): UsageDecision {
  const blocked: UsageDecision = { allowed: false, reason: "unavailable", resetsAt: null };
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return blocked;
  const record = data as Record<string, unknown>;
  if (record.allowed === true) {
    return { allowed: true, usageId: typeof record.usage_id === "string" ? record.usage_id : null };
  }
  const reason = BLOCK_REASONS.find((value) => value === record.reason) ?? "unavailable";
  return {
    allowed: false,
    reason,
    resetsAt: typeof record.resets_at === "string" ? record.resets_at : null,
  };
}
