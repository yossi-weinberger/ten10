import type { DateRange } from "react-day-picker";
import type { TableTransactionFilters } from "@/lib/tableTransactions/tableTransactions.types";
import { formatLocalDate } from "@/lib/utils/local-date";

export function serializeTransactionDateRange(
  dateRange: DateRange | undefined,
): TableTransactionFilters["dateRange"] {
  return {
    from: dateRange?.from ? formatLocalDate(dateRange.from) : null,
    to: dateRange?.to ? formatLocalDate(dateRange.to) : null,
  };
}
