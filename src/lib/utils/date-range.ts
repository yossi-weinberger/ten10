import { formatLocalDate, parseLocalDate } from "./local-date";

/**
 * Compute the "previous period" date range of the same length as the active one.
 * Used for delta % comparison on KPI cards.
 */
export function getPreviousPeriodRange(
  startDate: string,
  endDate: string
): { startDate: string; endDate: string } {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const startOrdinal = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  );
  const endOrdinal = Date.UTC(
    end.getFullYear(),
    end.getMonth(),
    end.getDate(),
  );
  const inclusiveDays = Math.round(
    (endOrdinal - startOrdinal) / (24 * 60 * 60 * 1000),
  ) + 1;
  const prevEnd = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() - 1,
  );
  const prevStart = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() - inclusiveDays,
  );

  return {
    startDate: formatLocalDate(prevStart),
    endDate: formatLocalDate(prevEnd),
  };
}
