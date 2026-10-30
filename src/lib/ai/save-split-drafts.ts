import { supabase } from "@/lib/supabaseClient";
import { aiCallsAllowed } from "@/lib/ai/flags";
import { ExchangeRateService } from "@/lib/services/exchange-rate.service";
import type { CurrencyCode } from "@/lib/currencies";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import { buildCommitPayload, type CommitPayload } from "./build-commit-payload";
import { textIntakePayload } from "./text-intake-payload";
import type { SplitDraft } from "./split-cards";

export type SaveSplitResult =
  | { ok: true; saved: { key: string; transactionId: string; itemId: string }[] }
  | { ok: false; reason: "NO_RATE" | "AUTH" | "SAVE_FAILED" };

function asDraft(card: SplitDraft): TextTransactionDraft | null {
  if (card.type === null || card.date === null) return null;
  return {
    date: card.date,
    amount: card.amount,
    currency: card.currency,
    type: card.type,
    requestedRate: null,
    description: card.description,
    category: null,
    paymentMethod: null,
  };
}

export async function saveSplitDrafts(
  cards: readonly SplitDraft[],
  idempotencyKey: string,
): Promise<SaveSplitResult> {
  if (!aiCallsAllowed()) return { ok: false, reason: "SAVE_FAILED" };
  const chosen = cards.filter((card) => card.checked && card.transactionId === null);
  if (chosen.length === 0) return { ok: false, reason: "SAVE_FAILED" };

  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData.user;
  if (authError || !user) return { ok: false, reason: "AUTH" };
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("default_currency")
    .eq("id", user.id)
    .single();
  if (profileError || !profile?.default_currency) return { ok: false, reason: "SAVE_FAILED" };
  const defaultCurrency = String(profile.default_currency).toUpperCase();

  const items: { key: string; payload: CommitPayload & { original_description: string; extracted_amount: number } }[] = [];
  for (const card of chosen) {
    const draft = asDraft(card);
    if (!draft) return { ok: false, reason: "SAVE_FAILED" };
    let autoRate: number | null = null;
    if (draft.currency !== defaultCurrency) {
      autoRate = await ExchangeRateService.fetchExchangeRate(
        draft.currency as CurrencyCode,
        defaultCurrency as CurrencyCode,
      );
    }
    const built = buildCommitPayload({
      draft,
      defaultCurrency,
      autoRate,
      idempotencyKey: `${idempotencyKey}:${card.key}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jerusalem",
    });
    if (!built.ok) return built;
    items.push({ key: card.key, payload: textIntakePayload(built.payload, { description: card.description, amount: card.amount }) });
  }

  const { data, error } = await supabase.rpc("create_ai_text_intake_items", {
    p_payload: { idempotency_key: idempotencyKey, items: items.map((item) => item.payload) },
  });
  const created = data as { item_id?: string; version?: number; item_index?: number }[] | null;
  if (error || !created || created.length !== items.length) return { ok: false, reason: "SAVE_FAILED" };

  const { data: committedRaw, error: commitError } = await supabase.rpc("commit_ai_intake_items", {
    p_items: created.map((row) => ({ id: row.item_id, expected_version: row.version })),
  });
  const committed = committedRaw as { transaction_ids?: string[] } | null;
  const ids = committed?.transaction_ids ?? [];
  if (commitError || ids.length !== created.length) return { ok: false, reason: "SAVE_FAILED" };

  return {
    ok: true,
    saved: created.map((row, index) => ({
      key: items[row.item_index ?? index]?.key ?? items[index].key,
      transactionId: ids[index],
      itemId: row.item_id ?? "",
    })),
  };
}
