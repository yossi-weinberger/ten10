import { supabase } from "@/lib/supabaseClient";
import { findDuplicatePairs, type DuplicatePair, type SavedTransactionRow } from "./duplicate-scan";

export type DuplicateScanResult =
  | { ok: true; pairs: DuplicatePair[] }
  | { ok: false; reason: "FAILED" };

export async function loadDuplicateScan(): Promise<DuplicateScanResult> {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, date, amount, currency, type, description");
  if (error || !data) return { ok: false, reason: "FAILED" };
  const rows: SavedTransactionRow[] = data.flatMap((row) => {
    const amount = typeof row.amount === "number" ? row.amount : Number(row.amount);
    if (typeof row.id !== "string" || typeof row.date !== "string" || typeof row.type !== "string") return [];
    if (!Number.isFinite(amount)) return [];
    return [{
      id: row.id,
      date: row.date,
      amount,
      currency: typeof row.currency === "string" ? row.currency : "",
      type: row.type,
      description: typeof row.description === "string" ? row.description : "",
    }];
  });
  return { ok: true, pairs: findDuplicatePairs(rows) };
}
