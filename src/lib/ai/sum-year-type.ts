import { supabase } from "@/lib/supabaseClient";
import { typesForFamily, type YearTypeSum } from "@/lib/ai/classify-intake";

export type YearTypeSumResult =
  | { ok: true; total: number; count: number; currency: string | null }
  | { ok: false; reason: "MIXED" | "FAILED" };

const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

export async function sumYearType(question: YearTypeSum): Promise<YearTypeSumResult> {
  const rows: { amount: number; currency: string }[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from("transactions")
      .select("amount, currency")
      .in("type", [...typesForFamily(question.type)])
      .gte("date", question.from)
      .lte("date", question.to)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data) return { ok: false, reason: "FAILED" };
    for (const row of data) {
      const amount = typeof row.amount === "number" ? row.amount : Number(row.amount);
      if (!Number.isFinite(amount)) continue;
      rows.push({
        amount,
        currency: typeof row.currency === "string" ? row.currency : "",
      });
    }
    if (data.length < PAGE_SIZE) break;
    if (page === MAX_PAGES - 1) return { ok: false, reason: "FAILED" };
  }

  const currencies = new Set(rows.map((row) => row.currency.toUpperCase()).filter((currency) => currency.length > 0));
  if (question.measure !== "count" && currencies.size > 1) return { ok: false, reason: "MIXED" };

  const summed = rows.reduce((sum, row) => sum + row.amount, 0);
  const months = question.months < 1 ? 1 : question.months;
  const peak = rows.reduce((max, row) => Math.max(max, row.amount), 0);
  const total = question.measure === "average"
    ? summed / months
    : question.measure === "max"
      ? peak
      : summed;
  const currency = currencies.values().next().value;
  return {
    ok: true,
    total: Math.round(total * 100) / 100,
    count: rows.length,
    currency: typeof currency === "string" ? currency : null,
  };
}
