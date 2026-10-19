import { supabase } from "@/lib/supabaseClient";
import { INTAKE_INTENTS, type IntakeIntent } from "@/lib/ai/classify-intake";

export type IntentFallbackResult =
  | { ok: true; intent: IntakeIntent | null; confidence: number | null }
  | { ok: false; reason: "UNAVAILABLE" };

export async function classifyIntentFallback(text: string): Promise<IntentFallbackResult> {
  const { data, error } = await supabase.functions.invoke("ai-classify-intent", {
    body: { text },
  });
  if (error || !data || typeof data !== "object") return { ok: false, reason: "UNAVAILABLE" };
  const record = data as { intent?: unknown; reason?: unknown; confidence?: unknown };
  if (record.reason === "unavailable") return { ok: false, reason: "UNAVAILABLE" };
  const intent = record.intent;
  const confidence = typeof record.confidence === "number"
    && record.confidence >= 0
    && record.confidence <= 1
    ? record.confidence
    : null;
  if (typeof intent !== "string" || !(INTAKE_INTENTS as readonly string[]).includes(intent)) {
    return { ok: true, intent: null, confidence: null };
  }
  return { ok: true, intent: intent as IntakeIntent, confidence };
}
