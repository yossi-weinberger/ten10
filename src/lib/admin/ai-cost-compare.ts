export type CostCompareRow = {
  day: string;
  gateway: number;
  recorded: number;
  diff: number;
};

/**
 * Gateway app spend against the sum of `ai.model_calls.cost_usd`, per UTC day.
 * Days before the first recorded call are left out: there is nothing to compare yet.
 */
export function compareDailyCost(
  gatewayDays: Array<{ day: string; totalCost: number }>,
  recordedDays: Array<{ day: string; cost_usd: number }>,
  recordedFrom: string | null,
): CostCompareRow[] {
  if (!recordedFrom) return [];
  const rows = new Map<string, CostCompareRow>();
  const row = (day: string) => {
    const existing = rows.get(day) ?? { day, gateway: 0, recorded: 0, diff: 0 };
    rows.set(day, existing);
    return existing;
  };
  for (const item of gatewayDays) {
    if (item.day >= recordedFrom) row(item.day).gateway += item.totalCost;
  }
  for (const item of recordedDays) {
    if (item.day >= recordedFrom) row(item.day).recorded += Number(item.cost_usd);
  }
  return [...rows.values()]
    .map((item) => ({ ...item, diff: item.gateway - item.recorded }))
    .sort((left, right) => left.day.localeCompare(right.day));
}
