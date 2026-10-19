import { supabase } from "@/lib/supabaseClient";
import { EXPENSE_CATEGORY_KEYS, INCOME_CATEGORY_KEYS } from "@/lib/category-registry";
import { typesForFamily, type YearTypeSum } from "@/lib/ai/classify-intake";
import { matchUserCategory } from "./match-category";

export type YearTypeSumResult =
  | { ok: true; total: number; count: number; currency: string | null }
  | { ok: false; reason: "MIXED" | "FAILED" };

export type QuestionFilter = {
  category: string | null;
  description: string | null;
  recipient: string | null;
};

export type MissingName = {
  missing: "category" | "recipient";
  name: string;
};

async function categoriesForFamily(type: YearTypeSum["type"]): Promise<string[]> {
  const lists = await Promise.all(typesForFamily(type).map(async (transactionType) => {
    const { data, error } = await supabase.rpc("get_user_categories", { p_type: transactionType });
    if (error || !Array.isArray(data)) return [];
    return data.flatMap((row) => {
      if (!row || typeof row !== "object") return [];
      const category = (row as { category?: unknown }).category;
      return typeof category === "string" && category.trim() ? [category] : [];
    });
  }));
  const predefined = type === "income"
    ? INCOME_CATEGORY_KEYS
    : type === "expense"
      ? EXPENSE_CATEGORY_KEYS
      : [];
  return [...new Set([...predefined, ...lists.flat()])];
}

function readTotals(data: unknown): { total: number; count: number; maxAmount: number; currencies: string[] } | null {
  if (!data || typeof data !== "object") return null;
  const row = data as { total?: unknown; count?: unknown; max_amount?: unknown; currencies?: unknown };
  const total = typeof row.total === "number" ? row.total : Number(row.total);
  const count = typeof row.count === "number" ? row.count : Number(row.count);
  const maxAmount = typeof row.max_amount === "number" ? row.max_amount : Number(row.max_amount);
  if (!Number.isFinite(total) || !Number.isFinite(count) || !Number.isFinite(maxAmount)) return null;
  const currencies = Array.isArray(row.currencies)
    ? row.currencies.flatMap((currency) => typeof currency === "string" && currency ? [currency.toUpperCase()] : [])
    : [];
  return { total, count, maxAmount, currencies };
}

async function recipientsForUser(): Promise<string[]> {
  const { data, error } = await supabase.rpc("list_ai_recipients");
  if (error || !Array.isArray(data)) return [];
  return data.flatMap((name) => typeof name === "string" && name.trim() ? [name] : []);
}

function foldName(value: string): string {
  return value.trim().toLowerCase().replace(/["״׳']/g, "").replace(/[-־]/g, " ").replace(/\s+/g, " ").trim();
}

function matchSavedName(topic: string, names: readonly string[]): string | null {
  const needle = foldName(topic);
  const hits = names
    .map((name) => ({ raw: name.trim(), key: foldName(name) }))
    .filter((name) => name.key.length > 1 && name.key === needle)
    .sort((left, right) => right.key.length - left.key.length);
  if (hits.length === 0) return null;
  return hits[0]?.raw ?? null;
}

export async function resolveQuestionFilter(
  question: YearTypeSum,
  searchDescriptions: boolean,
): Promise<QuestionFilter | MissingName> {
  if (question.recipient) {
    const matched = matchSavedName(question.recipient, await recipientsForUser());
    if (matched) return { category: null, description: null, recipient: matched };
    if (searchDescriptions) return { category: null, description: question.recipient, recipient: null };
    return { missing: "recipient", name: question.recipient };
  }
  if (!question.topic) return { category: null, description: null, recipient: null };
  const matched = matchUserCategory(question.topic, await categoriesForFamily(question.type));
  if (matched) return { category: matched, description: null, recipient: null };
  if (searchDescriptions) return { category: null, description: question.topic, recipient: null };
  return { missing: "category", name: question.topic };
}

export async function sumYearType(
  question: YearTypeSum,
  filter: QuestionFilter,
): Promise<YearTypeSumResult> {
  const { data, error } = await supabase.rpc("ai_question_totals", {
    p_types: [...typesForFamily(question.type)],
    p_from: question.from,
    p_to: question.to,
    p_payment_method: question.paymentMethod,
    p_category: filter.category,
    p_description: filter.description,
    p_recipient: filter.recipient,
  });
  if (error) return { ok: false, reason: "FAILED" };
  const totals = readTotals(data);
  if (!totals) return { ok: false, reason: "FAILED" };
  if (question.measure !== "count" && totals.currencies.length > 1) {
    return { ok: false, reason: "MIXED" };
  }
  const months = question.months < 1 ? 1 : question.months;
  const total = question.measure === "average"
    ? totals.total / months
    : question.measure === "max"
      ? totals.maxAmount
      : totals.total;
  return {
    ok: true,
    total: Math.round(total * 100) / 100,
    count: totals.count,
    currency: totals.currencies[0] ?? null,
  };
}
