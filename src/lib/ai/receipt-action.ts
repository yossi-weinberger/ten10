/** The row action is shown only while a linked receipt is still inside its retention window. */
export function receiptStillAvailable(
  expiresAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!expiresAt) return false;
  const time = Date.parse(expiresAt);
  return Number.isFinite(time) && time > now;
}

export function showReceiptAction(input: {
  platform: string;
  enabled: boolean;
  expiresAt: string | null | undefined;
  now?: number;
}): boolean {
  if (input.platform !== "web" || !input.enabled) return false;
  return receiptStillAvailable(input.expiresAt, input.now);
}

/** Date portion for useDisplayDate. A timestamptz is read in local time. */
export function receiptExpiryDate(expiresAt: string): string {
  const time = Date.parse(expiresAt);
  if (!Number.isFinite(time)) return expiresAt.slice(0, 10);
  const date = new Date(time);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
