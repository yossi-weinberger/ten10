/** Reads the answer of `consume_ai_usage` and `consume_ai_call`. */

export type UsageKind = "text" | "receipt" | "speech";

export type UsageBlockReason = "quota_exhausted" | "rate_limited" | "daily_limit" | "unavailable";

export type UsageDecision =
  | { allowed: true; usageId: string | null }
  | { allowed: false; reason: UsageBlockReason; resetsAt: string | null };

const BLOCK_REASONS: readonly UsageBlockReason[] = ["quota_exhausted", "rate_limited", "daily_limit"];

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
