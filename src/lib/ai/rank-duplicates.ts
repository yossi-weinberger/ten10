import { supabase } from "@/lib/supabaseClient";

export interface DuplicateRankScore {
  id: string;
  probability: number;
}

export async function rankDuplicateCandidates(input: {
  type: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
}): Promise<DuplicateRankScore[] | null> {
  const { data, error } = await supabase.functions.invoke("ai-rank-duplicates", {
    body: input,
  });
  if (error || !data || typeof data !== "object") return null;
  const payload = data as { ranked?: unknown; scores?: unknown };
  if (payload.ranked !== true || !Array.isArray(payload.scores)) return null;
  return payload.scores.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const score = row as { id?: unknown; probability?: unknown };
    if (typeof score.id !== "string" || typeof score.probability !== "number") return [];
    if (!Number.isFinite(score.probability)) return [];
    return [{ id: score.id, probability: score.probability }];
  });
}
