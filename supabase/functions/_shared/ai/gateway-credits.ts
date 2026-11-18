export type GatewayCredits = {
  balance: string;
  totalUsed: string;
  passRemaining: string | null;
};

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** The Gateway returns USD amounts as strings. A missing balance is not a zero balance. */
export function parseGatewayCredits(body: unknown): GatewayCredits | null {
  const row = record(body);
  if (!row || typeof row.balance !== "string" || typeof row.total_used !== "string") return null;
  const pass = record(row.token_pass);
  const remaining = pass && typeof pass.remaining === "string" ? pass.remaining : null;
  return { balance: row.balance, totalUsed: row.total_used, passRemaining: remaining };
}
