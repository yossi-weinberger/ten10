/** Integer percent. A zero or missing total stays 0, never NaN. */
export function aiShare(ai: number, all: number): number {
  if (!Number.isFinite(ai) || !Number.isFinite(all) || all <= 0) return 0;
  return Math.round((ai / all) * 100);
}

/**
 * Label for a small share. Under 10% keeps one decimal.
 * A positive share that rounds to 0.0 is "<0.1", never "0".
 * The percent sign is added by the translation.
 */
export function formatAiShare(ai: number, all: number): string {
  if (!Number.isFinite(ai) || ai <= 0 || !Number.isFinite(all) || all <= 0) return "0";
  const raw = (ai / all) * 100;
  if (raw >= 10) return String(Math.round(raw));
  const oneDecimal = raw.toFixed(1);
  if (oneDecimal === "0.0") return "<0.1";
  return oneDecimal;
}
