import { supabase } from "@/lib/supabaseClient";
import { aiCallsAllowed } from "@/lib/ai/flags";
import { INTAKE_COUNTS, INTAKE_INTENTS, type IntakeCount, type IntakeIntent } from "@/lib/ai/classify-intake";

export type IntentFallbackResult =
  | {
    ok: true;
    intent: IntakeIntent | null;
    confidence: number | null;
    count: IntakeCount | null;
    countConfidence: number | null;
  }
  | { ok: false; reason: "UNAVAILABLE" };

function readConfidence(value: unknown): number | null {
  return typeof value === "number" && value >= 0 && value <= 1 ? value : null;
}

export async function classifyIntentFallback(text: string): Promise<IntentFallbackResult> {
  if (!aiCallsAllowed()) return { ok: false, reason: "UNAVAILABLE" };
  const { data, error } = await supabase.functions.invoke("ai-classify-intent", {
    body: { text },
  });
  if (error || !data || typeof data !== "object") return { ok: false, reason: "UNAVAILABLE" };
  const record = data as {
    intent?: unknown;
    reason?: unknown;
    confidence?: unknown;
    count?: unknown;
    count_confidence?: unknown;
  };
  if (record.reason === "unavailable") return { ok: false, reason: "UNAVAILABLE" };
  const intent = record.intent;
  if (typeof intent !== "string" || !(INTAKE_INTENTS as readonly string[]).includes(intent)) {
    return { ok: true, intent: null, confidence: null, count: null, countConfidence: null };
  }
  const count = typeof record.count === "string" && (INTAKE_COUNTS as readonly string[]).includes(record.count)
    ? record.count as IntakeCount
    : null;
  return {
    ok: true,
    intent: intent as IntakeIntent,
    confidence: readConfidence(record.confidence),
    count,
    countConfidence: count === null ? null : readConfidence(record.count_confidence),
  };
}
