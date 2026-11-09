type CacheEntry =
  | { status: "pending"; userId: string }
  | { status: "ready"; userId: string; allowed: boolean };

let entry: CacheEntry | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeAiAccessCache(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAiAccessCacheEntry(): CacheEntry | null {
  return entry;
}

/** True only after get_my_ai_access returned allowed for the cached user. Pending or missing is hidden. */
export function isCachedAiAccessAllowed(): boolean {
  return entry?.status === "ready" && entry.allowed;
}

export function beginAiAccessFetch(userId: string): boolean {
  if (entry?.userId === userId && (entry.status === "pending" || entry.status === "ready")) {
    return false;
  }
  entry = { status: "pending", userId };
  emit();
  return true;
}

export function completeAiAccessFetch(userId: string, allowed: boolean): void {
  if (entry?.userId !== userId) return;
  entry = { status: "ready", userId, allowed };
  emit();
}

export function clearAiAccessCache(): void {
  entry = null;
  emit();
}

/** Test helper: seed the sync cache the UI gates read. */
export function setCachedAiAccessForTests(userId: string, allowed: boolean): void {
  entry = { status: "ready", userId, allowed };
  emit();
}
