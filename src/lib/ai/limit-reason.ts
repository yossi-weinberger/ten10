/** Reads AI usage limit information from edge function responses. */

export type LimitKind = "daily_limit" | "quota_exhausted" | "rate_limited";

export interface LimitInfo {
  kind: LimitKind;
  resetsAt: string | null;
}

/**
 * Extracts limit information from an AI edge function response body.
 * Returns null if the response does not indicate a usage limit was hit.
 */
export function readLimitInfo(body: unknown): LimitInfo | null {
  if (!body || typeof body !== "object") return null;
  const record = body as { reason?: unknown; resets_at?: unknown };
  const reason = record.reason;
  if (reason !== "daily_limit" && reason !== "quota_exhausted" && reason !== "rate_limited") {
    return null;
  }
  return {
    kind: reason,
    resetsAt: typeof record.resets_at === "string" ? record.resets_at : null,
  };
}
