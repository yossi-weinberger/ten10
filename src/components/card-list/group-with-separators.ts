export type GroupedItem<T> =
  | { type: "item"; item: T }
  | { type: "separator"; key: string };

/**
 * When `enabled` is false, returns the items with no separators.
 * When `enabled` is true, inserts a separator before every contiguous run
 * that shares a key, including the first run.
 */
export function groupWithSeparators<T>(
  items: readonly T[],
  keyFn: (item: T) => string,
  enabled: boolean,
): GroupedItem<T>[] {
  if (!enabled) {
    return items.map((item) => ({ type: "item", item }));
  }

  const grouped: GroupedItem<T>[] = [];
  let previousKey: string | null = null;

  for (const item of items) {
    const key = keyFn(item);
    if (previousKey === null || previousKey !== key) {
      grouped.push({ type: "separator", key });
    }
    grouped.push({ type: "item", item });
    previousKey = key;
  }

  return grouped;
}
