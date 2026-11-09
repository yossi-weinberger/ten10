import type { InspirationRecord } from "./inspiration-library";

export const INSPIRATION_RECENT_KEY = "ten10.ai.inspiration.recent";
export const INSPIRATION_RECENT_LIMIT = 10;

export interface InspirationView {
  id: string;
  title: string;
  body: string;
  source: string;
}

/** The imported library marks a missing source with a placeholder. The reader sees no source instead. */
const NO_SOURCE = /(^|[;.]\s*)[^;.]*(לא צוין במקור המיובא|Not named in the imported source)[^;.]*\.?\s*$/;

export function visibleSource(source: string): string {
  return source.replace(NO_SOURCE, (_match, separator: string) => (separator.startsWith(".") ? "." : "")).trim();
}

export interface IdStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function itemsForLanguage(items: readonly InspirationRecord[], language: string): InspirationView[] {
  if (language.toLowerCase().startsWith("en")) {
    return items.flatMap((item) => {
      if (!item.body_en) return [];
      return [{
        id: item.id,
        title: item.title_en || item.title,
        body: item.body_en,
        source: visibleSource(item.source_en ?? ""),
      }];
    });
  }
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    body: item.body,
    source: visibleSource(item.source),
  }));
}

export function readRecentIds(storage: IdStorage | null): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(INSPIRATION_RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string").slice(-INSPIRATION_RECENT_LIMIT);
  } catch {
    return [];
  }
}

export function rememberInspiration(storage: IdStorage | null, id: string): void {
  if (!storage) return;
  try {
    const recent = readRecentIds(storage).filter((item) => item !== id);
    recent.push(id);
    storage.setItem(INSPIRATION_RECENT_KEY, JSON.stringify(recent.slice(-INSPIRATION_RECENT_LIMIT)));
  } catch {
    // Private mode and a broken store still show the card.
  }
}

export function pickInspiration(
  items: readonly InspirationView[],
  recentIds: readonly string[],
  random: () => number,
): InspirationView | null {
  if (items.length === 0) return null;
  const recent = new Set(recentIds.slice(-INSPIRATION_RECENT_LIMIT));
  const unseen = items.filter((item) => !recent.has(item.id));
  const pool = unseen.length > 0 ? unseen : items;
  const index = Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)));
  return pool[index] ?? null;
}

export function browserIdStorage(): IdStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
