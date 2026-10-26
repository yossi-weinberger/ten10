/** Integer percent. A zero or missing total stays 0, never NaN. */
export function aiShare(ai: number, all: number): number {
  if (!Number.isFinite(ai) || !Number.isFinite(all) || all <= 0) return 0;
  return Math.round((ai / all) * 100);
}
