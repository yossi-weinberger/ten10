import { format, parse } from "date-fns";

/** Accept only a full dd/MM/yyyy value. Partial years such as 12/09/20 do not round-trip. */
export function parseExactGregorianDateInput(value: string): Date | null {
  const parsedDate = parse(value, "dd/MM/yyyy", new Date(2020, 0, 1));
  if (!(parsedDate instanceof Date) || Number.isNaN(parsedDate.getTime())) {
    return null;
  }
  if (format(parsedDate, "dd/MM/yyyy") !== value) {
    return null;
  }
  return parsedDate;
}
