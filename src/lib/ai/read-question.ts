import { supabase } from "@/lib/supabaseClient";
import { aiCallsAllowed } from "@/lib/ai/flags";
import { PAYMENT_METHOD_KEYS } from "@/lib/payment-methods";
import type { QuestionFamily, QuestionMeasure, QuestionSlots } from "../../../supabase/functions/_shared/ai/question-slots.ts";

const FAMILIES = ["donation", "income", "expense"] as const;
const MEASURES = ["sum", "count", "average", "max"] as const;

function asFamily(value: unknown): QuestionFamily | null {
  return FAMILIES.find((family) => family === value) ?? null;
}

function asMeasure(value: unknown): QuestionMeasure | null {
  return MEASURES.find((measure) => measure === value) ?? null;
}

function asName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 80) : null;
}

export type ReadQuestionSlotsResult = QuestionSlots & { measurementId: string | null };

/** Null when Jev did not answer. The caller then uses the word parser. */
export async function readQuestionSlots(text: string): Promise<ReadQuestionSlotsResult | null> {
  if (!aiCallsAllowed()) return null;
  const { data, error } = await supabase.functions.invoke("ai-read-question", {
    body: { text },
  });
  if (error || !data || typeof data !== "object") return null;
  const record = data as {
    reason?: unknown;
    family?: unknown;
    measure?: unknown;
    recipient?: unknown;
    category?: unknown;
    paymentMethod?: unknown;
    measurement_id?: unknown;
  };
  if (record.reason === "unavailable" || !("family" in record)) return null;
  const payment = typeof record.paymentMethod === "string" ? record.paymentMethod : null;
  return {
    family: asFamily(record.family),
    measure: asMeasure(record.measure),
    recipient: asName(record.recipient),
    category: asName(record.category),
    paymentMethod: payment && (PAYMENT_METHOD_KEYS as readonly string[]).includes(payment) ? payment : null,
    measurementId: typeof record.measurement_id === "string" ? record.measurement_id : null,
  };
}
