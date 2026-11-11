import { trackProductEvent } from "./productAnalytics";

export type AiInputKind = "text" | "voice" | "receipt";

export type AiTurnFailureStage = "intent" | "split" | "receipt" | "speech" | "question";

export type AiTurnFailureReason =
  | "unavailable"
  | "unreadable"
  | "limit"
  | "timeout"
  | "no_amount"
  | "unknown";

export type AiDraftCancelStage = "draft" | "question" | "recording";

export type AiDraftField =
  | "amount"
  | "type"
  | "date"
  | "category"
  | "payment_method"
  | "description"
  | "currency";

export function trackAiTurnFailed(
  input: AiInputKind,
  stage: AiTurnFailureStage,
  reason: AiTurnFailureReason,
) {
  trackProductEvent("ai_turn_failed", { input, stage, reason });
}

export function trackAiDraftCancelled(input: AiInputKind, stage: AiDraftCancelStage) {
  trackProductEvent("ai_draft_cancelled", { input, stage });
}

export function trackAiDraftCorrected(input: AiInputKind, fields: AiDraftField[]) {
  trackProductEvent("ai_draft_corrected", { input, fields });
}

export function trackAiQuestionReasked(within_seconds: number) {
  trackProductEvent("ai_question_reasked", { within_seconds });
}

export function mapErrorToFailureReason(
  errorCode?: string | null,
  reason?: string,
): AiTurnFailureReason {
  if (reason === "LIMIT") return "limit";
  if (reason === "UNAVAILABLE") return "unavailable";
  if (reason === "TOO_LARGE" || reason === "TOO_LONG") return "unreadable";
  if (reason === "TIMEOUT") return "timeout";
  if (errorCode === "no_amount") return "no_amount";
  return "unknown";
}
