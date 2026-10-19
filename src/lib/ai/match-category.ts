/** Exact category name from the user's own list. One match only. */
export function matchUserCategory(topic: string, names: readonly string[]): string | null {
  const needle = topic.trim().toLowerCase();
  if (needle.length < 2) return null;
  const hits = names.filter((name) => name.trim().toLowerCase() === needle);
  return hits.length === 1 ? hits[0] : null;
}
