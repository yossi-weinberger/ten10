import { supabase } from "@/lib/supabaseClient";
import { findDuplicatePairs, type DuplicatePair, type SavedTransactionRow } from "./duplicate-scan";

export type DuplicateScanResult =
  | { ok: true; pairs: DuplicatePair[] }
  | { ok: false; reason: "FAILED" };

const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

function readRows(data: readonly Record<string, unknown>[]): SavedTransactionRow[] {
  return data.flatMap((row) => {
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
}

export async function loadDuplicateScan(): Promise<DuplicateScanResult> {
  const rows: SavedTransactionRow[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from("transactions")
      .select("id, date, amount, currency, type, description")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data) return { ok: false, reason: "FAILED" };
    rows.push(...readRows(data));
    if (data.length < PAGE_SIZE) return { ok: true, pairs: findDuplicatePairs(rows) };
  }
  return { ok: false, reason: "FAILED" };
}
