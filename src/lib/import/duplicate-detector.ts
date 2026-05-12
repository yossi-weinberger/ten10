import type { ImportNormalizedRow, ImportRowIssue } from "./import-session.types";
import type { Transaction } from "@/types/transaction";

/** Lightweight fingerprint for CSV/Excel import deduplication. */
function buildImportFingerprint(row: ImportNormalizedRow): string {
  return JSON.stringify([
    row.date,
    row.amount,
    row.currency,
    row.type,
    (row.description ?? "").trim().toLowerCase().slice(0, 50),
    (row.category ?? "").trim().toLowerCase(),
  ]);
}

function buildExistingFingerprint(tx: Transaction): string {
  return JSON.stringify([
    tx.date,
    tx.amount,
    tx.currency,
    tx.type,
    (tx.description ?? "").trim().toLowerCase().slice(0, 50),
    (tx.category ?? "").trim().toLowerCase(),
  ]);
}

/**
 * Build a Set of fingerprints from existing transactions for O(1) lookup.
 */
export function buildExistingFingerprintSet(
  existing: Transaction[]
): Set<string> {
  const set = new Set<string>();
  for (const tx of existing) {
    set.add(buildExistingFingerprint(tx));
  }
  return set;
}

/**
 * Check if a normalized row is a possible duplicate of an existing transaction.
 * Returns a `possible_duplicate` issue if found, or null otherwise.
 */
export function checkDuplicate(
  row: ImportNormalizedRow,
  existingFingerprints: Set<string>
): ImportRowIssue | null {
  const fp = buildImportFingerprint(row);
  if (existingFingerprints.has(fp)) {
    return { code: "possible_duplicate" };
  }
  return null;
}

/**
 * Also check for duplicates within the import batch itself
 * (row-against-previously-seen rows in the same file).
 */
export function buildBatchFingerprintSet(): {
  seen: Set<string>;
  check: (row: ImportNormalizedRow) => ImportRowIssue | null;
} {
  const seen = new Set<string>();
  return {
    seen,
    check(row: ImportNormalizedRow): ImportRowIssue | null {
      const fp = buildImportFingerprint(row);
      if (seen.has(fp)) {
        return { code: "possible_duplicate" };
      }
      seen.add(fp);
      return null;
    },
  };
}
