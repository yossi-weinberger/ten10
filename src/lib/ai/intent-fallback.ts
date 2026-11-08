import { supabase } from "@/lib/supabaseClient";
import { aiCallsAllowed } from "@/lib/ai/flags";
import { INTAKE_INTENTS, type IntakeIntent } from "@/lib/ai/classify-intake";

export type IntentFallbackResult =
  | {
    ok: true;
    intent: IntakeIntent | null;
    confidence: number | null;
    halachaPage: string | null;
    halachaPageConfidence: number | null;
    /** The message asked for chomesh on its income. */
    chomesh?: boolean;
  }
  | { ok: false; reason: "UNAVAILABLE" };

function readConfidence(value: unknown): number | null {
  return typeof value === "number" && value >= 0 && value <= 1 ? value : null;
}

/** `context` is the earlier-turns block from conversationContext, or "". `turn` is shared with the split call. */
export async function classifyIntentFallback(text: string, context = "", turn?: string): Promise<IntentFallbackResult> {
  if (!aiCallsAllowed()) return { ok: false, reason: "UNAVAILABLE" };
  const { data, error } = await supabase.functions.invoke("ai-classify-intent", {
    body: { text, ...(context ? { context } : {}), ...(turn ? { turn } : {}) },
  });
  if (error || !data || typeof data !== "object") return { ok: false, reason: "UNAVAILABLE" };
  const record = data as {
    intent?: unknown;
    reason?: unknown;
    confidence?: unknown;
    halacha_page?: unknown;
    halacha_page_confidence?: unknown;
    chomesh?: unknown;
  };
  if (record.reason === "unavailable") return { ok: false, reason: "UNAVAILABLE" };
  const intent = record.intent;
  if (typeof intent !== "string" || !(INTAKE_INTENTS as readonly string[]).includes(intent)) {
    return { ok: true, intent: null, confidence: null, halachaPage: null, halachaPageConfidence: null };
  }
  return {
    ok: true,
    intent: intent as IntakeIntent,
    confidence: readConfidence(record.confidence),
    halachaPage: typeof record.halacha_page === "string" ? record.halacha_page : null,
    halachaPageConfidence: readConfidence(record.halacha_page_confidence),
    chomesh: record.chomesh === true,
  };
}
