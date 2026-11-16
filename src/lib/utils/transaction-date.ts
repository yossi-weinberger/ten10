import { parseLocalDate } from "@/lib/utils/local-date";
import {
  isOnOrAfterMinTransactionDate,
  MIN_TRANSACTION_DATE,
} from "../../../supabase/functions/_shared/transaction-domain/normalize-core.ts";

export { isOnOrAfterMinTransactionDate, MIN_TRANSACTION_DATE };

export function minTransactionDateLocal(): Date {
  return parseLocalDate(MIN_TRANSACTION_DATE);
}
