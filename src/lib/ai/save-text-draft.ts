import { supabase } from "@/lib/supabaseClient";
import { ExchangeRateService } from "@/lib/services/exchange-rate.service";
import type { CurrencyCode } from "@/lib/currencies";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import { buildCommitPayload } from "./build-commit-payload";
import { textIntakePayload } from "./text-intake-payload";

export type SaveTextDraftResult =
  | { ok: true; transactionId: string; itemId: string; sameEvent?: false }
  | { ok: true; transactionId: null; itemId: string; sameEvent: true }
  | { ok: false; reason: "NO_RATE" | "AUTH" | "SAVE_FAILED" };

export async function saveTextDraft(
  draft: TextTransactionDraft,
  original: { description: string; amount: number } = draft,
  duplicate?: { choice: "saved_anyway" | "same_event"; candidateIds: string[] },
): Promise<SaveTextDraftResult> {
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
  let autoRate: number | null = null;
  if (draft.currency !== defaultCurrency && draft.requestedRate === null) {
    autoRate = await ExchangeRateService.fetchExchangeRate(
      draft.currency as CurrencyCode,
      defaultCurrency as CurrencyCode,
    );
  }

  const built = buildCommitPayload({
    draft,
    defaultCurrency,
    autoRate,
    idempotencyKey: crypto.randomUUID(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jerusalem",
  });
  if (!built.ok) return built;

  const { data: createdRaw, error: createError } = await supabase.rpc("create_ai_text_intake", {
    p_payload: textIntakePayload(built.payload, original, duplicate),
  });
  const created = createdRaw as { item_id?: string; version?: number; skip_commit?: boolean } | null;
  if (createError || !created?.item_id || created.version === undefined) {
    return { ok: false, reason: "SAVE_FAILED" };
  }
  if (created.skip_commit) {
    return { ok: true, transactionId: null, itemId: created.item_id, sameEvent: true };
  }

  const { data: committedRaw, error: commitError } = await supabase.rpc("commit_ai_intake_items", {
    p_items: [{ id: created.item_id, expected_version: created.version }],
  });
  const committed = committedRaw as { transaction_ids?: string[]; already_committed?: string[] } | null;
  const transactionId = committed?.transaction_ids?.[0] ?? committed?.already_committed?.[0];
  if (commitError || !transactionId) {
    await supabase.rpc("reject_uncommitted_ai_item", { p_item_id: created.item_id });
    return { ok: false, reason: "SAVE_FAILED" };
  }

  return { ok: true, transactionId, itemId: created.item_id };
}
