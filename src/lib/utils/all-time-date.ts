/**
 * Inclusive lower bound for the All-time dashboard filter.
 * Sent as a real date string so current prod RPCs that use
 * `date BETWEEN p_start_date::date AND p_end_date::date` still return
 * every stored row (including pre-1970) before any migration is applied.
 * Postgres date/text casts accept year 0001.
 */
export const ALL_TIME_START_DATE = "0001-01-01";

export function isAllTimeStartDate(startDate: string): boolean {
  return startDate === ALL_TIME_START_DATE;
}

/**
 * Args for RPCs that filter with `date BETWEEN p_start_date AND p_end_date`.
 * Start is always a string — never null — so a stale prod function cannot
 * collapse All-time to an empty BETWEEN range.
 */
export function toRpcDateRangeArgs(
  startDate: string,
  endDate: string,
): { p_start_date: string; p_end_date: string } {
  return {
    p_start_date: startDate,
    p_end_date: endDate,
  };
}
