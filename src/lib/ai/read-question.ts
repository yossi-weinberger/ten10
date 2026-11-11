import { supabase } from "@/lib/supabaseClient";
import { aiCallsAllowed } from "@/lib/ai/flags";
import { claimBetaConsentRequired } from "@/lib/ai/beta-consent-required";
import { PAYMENT_METHOD_KEYS } from "@/lib/payment-methods";
import {
  asQuestionFamily,
  asQuestionMeasure,
  asQuestionSubject,
  trimQuestionSlotName,
  type QuestionSlots,
} from "../../../supabase/functions/_shared/ai/question-slots.ts";
import { readLimitInfo, type LimitInfo } from "@/lib/ai/limit-reason";

export type ReadQuestionSlotsResult = (QuestionSlots & {
  measurementId: string | null;
  period: { kind: "all" } | { kind: "span"; from: string; to: string } | null;
  nameText: string | null;
}) | { limit: LimitInfo } | { betaConsentRequired: true };

/** Null when the question reader service is unavailable or did not return slots. Returns limit info when a usage limit was hit. */
export async function readQuestionSlots(
  text: string,
  /** `turn` is the asking message's, so the question rides on that message's charge. */
  options: { calendar?: "gregorian" | "hebrew"; today?: string; context?: string; turn?: string } = {},
): Promise<ReadQuestionSlotsResult | null> {
  if (!aiCallsAllowed()) return null;
  const { data, error } = await supabase.functions.invoke("ai-read-question", {
    body: {
      text,
      calendar: options.calendar,
      today: options.today,
      ...(options.context ? { context: options.context } : {}),
      ...(options.turn ? { turn: options.turn } : {}),
    },
  });
  if (await claimBetaConsentRequired(error, data)) return { betaConsentRequired: true };
  if (error || !data || typeof data !== "object") return null;
  const limit = readLimitInfo(data);
  if (limit) return { limit };
  const record = data as {
    reason?: unknown;
    family?: unknown;
    measure?: unknown;
    recipient?: unknown;
    category?: unknown;
    paymentMethod?: unknown;
    measurement_id?: unknown;
    period?: unknown;
    name_text?: unknown;
    subject?: unknown;
  };
  if (record.reason === "unavailable" || !("family" in record)) return null;
  const payment = typeof record.paymentMethod === "string" ? record.paymentMethod : null;
  const rawPeriod = record.period && typeof record.period === "object"
    ? record.period as { kind?: unknown; from?: unknown; to?: unknown }
    : null;
  const period = rawPeriod?.kind === "all"
    ? { kind: "all" as const }
    : rawPeriod?.kind === "span" && typeof rawPeriod.from === "string" && typeof rawPeriod.to === "string"
      ? { kind: "span" as const, from: rawPeriod.from, to: rawPeriod.to }
      : null;
  return {
    family: asQuestionFamily(record.family),
    measure: asQuestionMeasure(record.measure),
    recipient: trimQuestionSlotName(record.recipient),
    category: trimQuestionSlotName(record.category),
    paymentMethod: payment && (PAYMENT_METHOD_KEYS as readonly string[]).includes(payment) ? payment : null,
    measurementId: typeof record.measurement_id === "string" ? record.measurement_id : null,
    period,
    nameText: trimQuestionSlotName(record.name_text),
    subject: asQuestionSubject(record.subject),
  };
}
