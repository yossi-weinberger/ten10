export const RECENT_SIGNUP_WINDOW_MS = 48 * 60 * 60 * 1000;

export function isRecentAuthUser(
  createdAt: string | undefined,
  now = Date.now()
): boolean {
  if (!createdAt) return false;
  const timestamp = Date.parse(createdAt);
  return (
    Number.isFinite(timestamp) &&
    now - timestamp >= 0 &&
    now - timestamp < RECENT_SIGNUP_WINDOW_MS
  );
}
