import { supabase } from "@/lib/supabaseClient";

export interface DuplicateCandidate {
  date: string;
  amount: number;
  description: string;
}

export function readDuplicateCandidates(data: unknown): DuplicateCandidate[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const record = row as { date?: unknown; amount?: unknown; description?: unknown };
    const amount = typeof record.amount === "number" ? record.amount : Number(record.amount);
    if (typeof record.date !== "string" || !Number.isFinite(amount)) return [];
    return [{
      date: record.date,
      amount,
      description: typeof record.description === "string" ? record.description : "",
    }];
  });
}

export async function listDuplicateCandidates(input: {
  type: string;
  date: string;
  amount: number;
  currency: string;
}): Promise<DuplicateCandidate[]> {
  const { data, error } = await supabase.rpc("list_ai_duplicate_candidates", {
    p_type: input.type,
    p_date: input.date,
    p_amount: input.amount,
    p_currency: input.currency,
  });
  if (error) return [];
  return readDuplicateCandidates(data);
}
