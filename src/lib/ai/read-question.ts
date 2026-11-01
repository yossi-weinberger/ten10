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

export type ReadQuestionSlotsResult = QuestionSlots & {
  measurementId: string | null;
  period: { from: string | null; to: string | null } | null;
};

/** Null when Jev did not answer. The caller then uses the word parser. */
export async function readQuestionSlots(
  text: string,
  options: { calendar?: "gregorian" | "hebrew"; today?: string } = {},
): Promise<ReadQuestionSlotsResult | null> {
  if (!aiCallsAllowed()) return null;
  const { data, error } = await supabase.functions.invoke("ai-read-question", {
    body: { text, calendar: options.calendar, today: options.today },
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
    period?: unknown;
  };
  if (record.reason === "unavailable" || !("family" in record)) return null;
  const payment = typeof record.paymentMethod === "string" ? record.paymentMethod : null;
  const period = record.period && typeof record.period === "object"
    ? record.period as { from?: unknown; to?: unknown }
    : null;
  return {
    family: asFamily(record.family),
    measure: asMeasure(record.measure),
    recipient: asName(record.recipient),
    category: asName(record.category),
    paymentMethod: payment && (PAYMENT_METHOD_KEYS as readonly string[]).includes(payment) ? payment : null,
    measurementId: typeof record.measurement_id === "string" ? record.measurement_id : null,
    period: period && (typeof period.from === "string" || period.from === null)
      ? { from: typeof period.from === "string" ? period.from : null, to: typeof period.to === "string" ? period.to : null }
      : null,
  };
}
