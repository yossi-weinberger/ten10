import { parseLocalDate } from "@/lib/utils/local-date";

/** Earliest date allowed for new or edited transactions and recurring start dates. */
export const MIN_TRANSACTION_DATE = "2000-01-01";

const CANONICAL_ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isOnOrAfterMinTransactionDate(isoDate: string): boolean {
  if (!CANONICAL_ISO_DATE.test(isoDate)) {
    return false;
  }
  return isoDate >= MIN_TRANSACTION_DATE;
}

export function minTransactionDateLocal(): Date {
  return parseLocalDate(MIN_TRANSACTION_DATE);
}
