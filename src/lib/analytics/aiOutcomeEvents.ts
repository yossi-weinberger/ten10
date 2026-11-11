import { trackProductEvent } from "./productAnalytics";

export type AiInputKind = "text" | "voice" | "receipt";

export type AiTurnFailureStage = "intent" | "split" | "receipt" | "speech" | "question";

export type AiTurnFailureReason =
  | "unavailable"
  | "unreadable"
  | "limit"
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

export function trackAiTurnStarted(input: AiInputKind) {
  trackProductEvent("ai_turn_started", { input });
}

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

export function normalizeQuestionText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase().replace(/[.?!,;:'"]+$/, "");
}

export function compareQuestions(
  current: { text: string; family: string; search: boolean },
  last: { text: string; family: string; search: boolean } | null,
  maxAgeMs: number,
  timestampNow: number,
  timestampLast: number | null
): boolean {
  if (!last || timestampLast === null) return false;
  if (timestampNow - timestampLast > maxAgeMs) return false;
  
  const normalizedCurrent = normalizeQuestionText(current.text);
  const normalizedLast = normalizeQuestionText(last.text);
  
  return (
    normalizedCurrent === normalizedLast &&
    current.family === last.family &&
    current.search === last.search
  );
}

export function mapErrorToFailureReason(reason?: string): AiTurnFailureReason {
  if (reason === "LIMIT") return "limit";
  if (reason === "UNAVAILABLE") return "unavailable";
  if (
    reason === "TOO_LARGE" ||
    reason === "TOO_LONG" ||
    reason === "UNREADABLE" ||
    reason === "UNHEARD" ||
    reason === "MIXED"
  ) {
    return "unreadable";
  }
  return "unknown";
}
