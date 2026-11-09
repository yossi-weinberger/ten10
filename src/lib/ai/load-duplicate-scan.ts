import { supabase } from "@/lib/supabaseClient";
import { aiCallsAllowed } from "@/lib/ai/flags";
import { type DuplicatePair, type SavedTransactionRow } from "./duplicate-scan";

export type DuplicateScanResult =
  | { ok: true; count: number; pairs: DuplicatePair[] }
  | { ok: false; reason: "FAILED" };

function readSide(value: unknown): SavedTransactionRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as {
    id?: unknown;
    date?: unknown;
    amount?: unknown;
    currency?: unknown;
    description?: unknown;
  };
  const amount = typeof row.amount === "number" ? row.amount : Number(row.amount);
  if (typeof row.id !== "string" || typeof row.date !== "string" || !Number.isFinite(amount)) return null;
  return {
    id: row.id,
    date: row.date,
    amount,
    currency: typeof row.currency === "string" ? row.currency : "",
    type: "",
    description: typeof row.description === "string" ? row.description : "",
  };
}

export async function dismissDuplicatePair(leftId: string, rightId: string): Promise<boolean> {
  if (!aiCallsAllowed()) return false;
  const { error } = await supabase.rpc("dismiss_ai_duplicate_pair", {
    p_a: leftId,
    p_b: rightId,
  });
  return !error;
}

export async function loadDuplicateScan(): Promise<DuplicateScanResult> {
  if (!aiCallsAllowed()) return { ok: false, reason: "FAILED" };
  const { data, error } = await supabase.rpc("list_ai_saved_duplicate_pairs");
  if (error || !data || typeof data !== "object") return { ok: false, reason: "FAILED" };
  const body = data as { count?: unknown; pairs?: unknown };
  const count = typeof body.count === "number" ? body.count : Number(body.count);
  if (!Number.isFinite(count) || !Array.isArray(body.pairs)) return { ok: false, reason: "FAILED" };
  const pairs = body.pairs.flatMap((pair) => {
    if (!pair || typeof pair !== "object") return [];
    const record = pair as { left?: unknown; right?: unknown };
    const left = readSide(record.left);
    const right = readSide(record.right);
    if (!left || !right) return [];
    return [{ left, right }];
  });
  return { ok: true, count, pairs };
}
