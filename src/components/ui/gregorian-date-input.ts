import { format, parse } from "date-fns";

export type GregorianDateInputPattern = "dd/MM/yyyy" | "MM/dd/yyyy";

/** Accept only a full value in the pattern. Partial years such as 12/09/20 do not round-trip. */
export function parseExactGregorianDateInput(
  value: string,
  pattern: GregorianDateInputPattern = "dd/MM/yyyy",
): Date | null {
  const parsedDate = parse(value, pattern, new Date(2020, 0, 1));
  if (!(parsedDate instanceof Date) || Number.isNaN(parsedDate.getTime())) {
    return null;
  }
  if (format(parsedDate, pattern) !== value) {
    return null;
  }
  return parsedDate;
}
