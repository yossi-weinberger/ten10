import { supabase } from "@/lib/supabaseClient";

export interface DuplicateCandidate {
  id: string;
  date: string;
  amount: number;
  description: string;
  kind: "transaction" | "draft";
}

export function readDuplicateCandidates(data: unknown): DuplicateCandidate[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const record = row as {
      id?: unknown;
      date?: unknown;
      amount?: unknown;
      description?: unknown;
      kind?: unknown;
    };
    const amount = typeof record.amount === "number" ? record.amount : Number(record.amount);
    if (
      typeof record.id !== "string"
      || typeof record.date !== "string"
      || (record.kind !== "transaction" && record.kind !== "draft")
      || !Number.isFinite(amount)
    ) {
      return [];
    }
    return [{
      id: record.id,
      date: record.date,
      amount,
      description: typeof record.description === "string" ? record.description : "",
      kind: record.kind,
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
