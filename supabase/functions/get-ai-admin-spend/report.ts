export type GatewaySpendRow = {
  label: string;
  totalCost: number;
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
};

export type DayCost = { day: string; totalCost: number; requestCount: number };

function numberField(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function results(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") return [];
  const rows = (payload as { results?: unknown }).results;
  if (!Array.isArray(rows)) return [];
  return rows.filter((row): row is Record<string, unknown> => !!row && typeof row === "object");
}

/** Reads a gateway spend report. Drops empty user and tag buckets. */
export function parseGatewayReport(payload: unknown): GatewaySpendRow[] {
  const rows: GatewaySpendRow[] = [];
  for (const record of results(payload)) {
    const label = [record.model, record.day, record.user, record.tag].find(
      (value) => typeof value === "string" && value.length > 0,
    );
    if (typeof label !== "string") continue;
    rows.push({
      label,
      totalCost: numberField(record.total_cost),
      requestCount: numberField(record.request_count),
      inputTokens: numberField(record.input_tokens),
      outputTokens: numberField(record.output_tokens),
    });
  }
  return rows;
}

/** One row per UTC day of a `group_by=day` report, sorted by day. */
export function dailyCosts(payload: unknown): DayCost[] {
  const totals = new Map<string, DayCost>();
  for (const record of results(payload)) {
    if (typeof record.day !== "string" || record.day.length === 0) continue;
    const current = totals.get(record.day) ?? { day: record.day, totalCost: 0, requestCount: 0 };
    current.totalCost += numberField(record.total_cost);
    current.requestCount += numberField(record.request_count);
    totals.set(record.day, current);
  }
  return [...totals.values()].sort((left, right) => left.day.localeCompare(right.day));
}

/** App calls are untagged, so app spend is the day total minus `source:eval`. */
export function appDailyCosts(total: DayCost[], evalDays: DayCost[]): DayCost[] {
  const evalByDay = new Map(evalDays.map((row) => [row.day, row]));
  return total.map((row) => {
    const evalRow = evalByDay.get(row.day);
    return {
      day: row.day,
      totalCost: Math.max(0, row.totalCost - (evalRow?.totalCost ?? 0)),
      requestCount: Math.max(0, row.requestCount - (evalRow?.requestCount ?? 0)),
    };
  });
}

export function sumCost(rows: DayCost[]): number {
  return rows.reduce((sum, row) => sum + row.totalCost, 0);
}

/** True only for the boolean returned by is_admin_user(). */
export function isAdminFlag(value: unknown): boolean {
  return value === true;
}
