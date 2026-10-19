import he from "../../../public/locales/he/transactions.json";
import en from "../../../public/locales/en/transactions.json";

/** Spoken words that are not the form label but mean a built-in category. */
const SPOKEN_ALIASES: Record<string, string> = {
  אוכל: "food",
};

let labels: Map<string, string> | null = null;

function labelMap(): Map<string, string> {
  if (labels) return labels;
  const map = new Map<string, string>();
  for (const bundle of [he, en]) {
    const groups = bundle.transactionForm.category;
    for (const type of ["income", "expense"] as const) {
      for (const [key, label] of Object.entries(groups[type])) {
        map.set(key.toLowerCase(), key);
        map.set(label.trim().toLowerCase(), key);
      }
    }
  }
  for (const [alias, key] of Object.entries(SPOKEN_ALIASES)) {
    map.set(alias, key);
  }
  labels = map;
  return map;
}

function canonicalCategory(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";
  return labelMap().get(trimmed) ?? trimmed;
}

/**
 * One category key. Hebrew labels and the English key collapse together,
 * and "Food " is the same category as "food".
 */
export function matchUserCategory(topic: string, names: readonly string[]): string | null {
  const needle = canonicalCategory(topic);
  if (needle.length < 2) return null;
  const hits = new Set(
    names
      .map((name) => canonicalCategory(name))
      .filter((name) => name === needle),
  );
  if (hits.size !== 1) return null;
  return [...hits][0] ?? null;
}
