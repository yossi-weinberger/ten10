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
