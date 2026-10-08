import { parseLocalDate } from "@/lib/utils/local-date";

/** Earliest date allowed for new or edited transactions and recurring start dates. */
export const MIN_TRANSACTION_DATE = "2000-01-01";

export function isOnOrAfterMinTransactionDate(isoDate: string): boolean {
  return isoDate >= MIN_TRANSACTION_DATE;
}

export function minTransactionDateLocal(): Date {
  return parseLocalDate(MIN_TRANSACTION_DATE);
}
