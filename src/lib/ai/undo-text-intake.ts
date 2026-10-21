import { supabase } from "@/lib/supabaseClient";
import { aiCallsAllowed } from "@/lib/ai/flags";

export type UndoTextIntakeResult =
  | { ok: true; alreadyReverted: boolean }
  | { ok: false; reason: "NOT_ALLOWED" | "FAILED" };

type UndoPayload = {
  reverted?: boolean;
  alreadyReverted?: boolean;
  error?: string;
};

export function readUndoPayload(payload: UndoPayload | null): UndoTextIntakeResult {
  if (payload?.reverted) return { ok: true, alreadyReverted: false };
  if (payload?.alreadyReverted) return { ok: true, alreadyReverted: true };
  return { ok: false, reason: "NOT_ALLOWED" };
}

export async function undoTextIntake(itemId: string): Promise<UndoTextIntakeResult> {
  if (!aiCallsAllowed()) return { ok: false, reason: "FAILED" };
  const { data, error } = await supabase.rpc("undo_ai_intake_commit", {
    p_item_id: itemId,
  });
  if (error) return { ok: false, reason: "FAILED" };
  return readUndoPayload(data as UndoPayload | null);
}

export async function undoAiTransaction(transactionId: string): Promise<UndoTextIntakeResult> {
  if (!aiCallsAllowed()) return { ok: false, reason: "FAILED" };
  const { data, error } = await supabase.rpc("undo_ai_transaction", {
    p_transaction_id: transactionId,
  });
  if (error) return { ok: false, reason: "FAILED" };
  return readUndoPayload(data as UndoPayload | null);
}
