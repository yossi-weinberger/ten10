import { bucketGrain, bucketKey, type AiBucketGrain } from "../_shared/ai/admin-buckets.ts";

export type GatewaySpendRow = {
  label: string;
  totalCost: number;
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
};

function numberField(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Reads a gateway spend report. Drops empty user and tag buckets. */
export function parseGatewayReport(payload: unknown): GatewaySpendRow[] {
  if (!payload || typeof payload !== "object") return [];
  const results = (payload as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];
  const rows: GatewaySpendRow[] = [];
  for (const item of results) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
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

export function sourceTotals(payload: unknown): { app: number; evalCost: number } {
  let app = 0;
  let evalCost = 0;
  for (const row of parseGatewayReport(payload)) {
    if (row.label === "source:app") app += row.totalCost;
    if (row.label === "source:eval") evalCost += row.totalCost;
  }
  return { app, evalCost };
}

export type SpendBucket = { bucket: string; totalCost: number; requestCount: number };

export function aggregateDayReport(
  payload: unknown,
  from: string,
  to: string,
): { grain: AiBucketGrain; buckets: SpendBucket[] } {
  const grain = bucketGrain(from, to);
  const totals = new Map<string, SpendBucket>();
  if (payload && typeof payload === "object") {
    const results = (payload as { results?: unknown }).results;
    if (Array.isArray(results)) {
      for (const item of results) {
        if (!item || typeof item !== "object") continue;
        const record = item as Record<string, unknown>;
        if (typeof record.day !== "string" || record.day.length === 0) continue;
        const bucket = bucketKey(record.day, grain);
        const current = totals.get(bucket) ?? { bucket, totalCost: 0, requestCount: 0 };
        current.totalCost += numberField(record.total_cost);
        current.requestCount += numberField(record.request_count);
        totals.set(bucket, current);
      }
    }
  }
  return {
    grain,
    buckets: [...totals.values()].sort((left, right) => left.bucket.localeCompare(right.bucket)),
  };
}

/** True only for the boolean returned by is_admin_user(). */
export function isAdminFlag(value: unknown): boolean {
  return value === true;
}
