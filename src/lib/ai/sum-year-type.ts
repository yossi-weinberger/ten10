import { supabase } from "@/lib/supabaseClient";
import { typesForFamily, type YearTypeSum } from "@/lib/ai/classify-intake";

export type YearTypeSumResult =
  | { ok: true; total: number; count: number; currency: string | null }
  | { ok: false; reason: "MIXED" | "FAILED" };

export async function sumYearType(question: YearTypeSum): Promise<YearTypeSumResult> {
  const { data, error } = await supabase
    .from("transactions")
    .select("amount, currency")
    .in("type", [...typesForFamily(question.type)])
    .gte("date", `${question.year}-01-01`)
    .lte("date", `${question.year}-12-31`);
  if (error || !data) return { ok: false, reason: "FAILED" };

  const currencies = new Set(
    data
      .map((row) => (typeof row.currency === "string" ? row.currency.toUpperCase() : ""))
      .filter((currency) => currency.length > 0),
  );
  if (currencies.size > 1) return { ok: false, reason: "MIXED" };

  const total = data.reduce((sum, row) => sum + Number(row.amount), 0);
  const currency = currencies.values().next().value;
  return {
    ok: true,
    total: Math.round(total * 100) / 100,
    count: data.length,
    currency: typeof currency === "string" ? currency : null,
  };
}
