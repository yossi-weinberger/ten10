/**
 * Matches a spoken name to one saved recipient. The model reads the words.
 */

function foldName(value: string): string {
  return value.trim().toLowerCase().replace(/["״׳']/g, "").replace(/[-־]/g, " ").replace(/\s+/g, " ").trim();
}

/** The saved spelling of `topic`, ignoring case, quote marks and hyphens. */
export function matchSavedName(topic: string, names: readonly string[]): string | null {
  const needle = foldName(topic);
  const hits = names
    .map((name) => ({ raw: name.trim(), key: foldName(name) }))
    .filter((name) => name.key.length > 1 && name.key === needle)
    .sort((left, right) => right.key.length - left.key.length);
  if (hits.length === 0) return null;
  return hits[0]?.raw ?? null;
}
