import { halachaNamespace as namespaceForHalachaPage } from "@/lib/ai/classify-intake";
import type { ParsedUserRule, YearTypeSum } from "@/lib/ai/classify-intake";
import type { ReadReceiptResult } from "@/lib/ai/read-receipt";
import type { OpenReceiptResult } from "@/lib/ai/open-receipt";
import type { TranscribeSpeechResult } from "@/lib/ai/transcribe-speech";
import type { QuestionFilter } from "@/lib/ai/sum-year-type";
import type { TurnCard } from "@/lib/ai/assistant-turn";
import type { ReadyDataReply, StatusKey } from "./assistant-reply-view";

export function isSingleReceipt(
  result: ReadReceiptResult,
): result is Extract<ReadReceiptResult, { route: "receipt" }> {
  return result.ok && result.route === "receipt";
}

export function publishedPageNamespace(pageId: string | null): string | null {
  if (!pageId || pageId === "personal" || pageId === "none") return null;
  return namespaceForHalachaPage(pageId);
}

export function parsedRuleFromCard(card: TurnCard): ParsedUserRule | null {
  if (card.type !== "rule") return null;
  const ruleAction = card.action;
  return {
    name: card.name,
    action: ruleAction === "exempt-income" || ruleAction === "recognized-expense" || ruleAction === "non_tithe_donation"
      ? ruleAction
      : "ambiguous",
  };
}

export function receiptFailureStatus(
  reason: Extract<ReadReceiptResult, { ok: false }>["reason"],
): StatusKey {
  return reason === "TOO_LARGE"
    ? "receiptTooLarge"
    : reason === "UNAVAILABLE"
      ? "providerFailed"
      : "receiptUnreadable";
}

export function receiptRouteStatus(
  route: Extract<ReadReceiptResult, { ok: true; route: "several_receipts" | "statement" }>["route"],
): StatusKey {
  switch (route) {
    case "several_receipts":
      return "severalReceipts";
    case "statement":
      return "bankStatement";
    default: {
      const unreachable: never = route;
      return unreachable;
    }
  }
}

export function voiceFailureStatus(
  reason: Extract<TranscribeSpeechResult, { ok: false }>["reason"],
): StatusKey {
  return reason === "TOO_LONG"
    ? "voiceTooLong"
    : reason === "UNAVAILABLE"
      ? "providerFailed"
      : "voiceUnheard";
}

export function openReceiptFailureStatus(
  status: Extract<OpenReceiptResult, { status: "none" | "unavailable" }>["status"],
): StatusKey {
  return status === "none" ? "receiptMissing" : "receiptUnavailable";
}

export function readyDataReply(
  question: YearTypeSum,
  filter: QuestionFilter,
  result: { total: number; count: number; currency: string | null },
): ReadyDataReply {
  return {
    status: "ready",
    year: question.year,
    month: question.month,
    measure: question.measure,
    type: question.type,
    paymentMethod: question.paymentMethod,
    recipient: filter.recipient ?? (question.recipient ? filter.description : null),
    category: filter.category ?? (!question.recipient && filter.description ? filter.description : null),
    from: question.from,
    to: question.to,
    total: result.total,
    count: result.count,
    currency: result.currency,
  };
}

export function namedQuestionAnswer(
  askedQuestion: YearTypeSum,
  name: string,
): { question: YearTypeSum; filter: QuestionFilter } {
  const question = askedQuestion.type === "donation"
    ? { ...askedQuestion, recipient: name, topic: null }
    : { ...askedQuestion, topic: name, recipient: null };
  const filter = askedQuestion.type === "donation"
    ? { category: null, description: null, recipient: name }
    : { category: name, description: null, recipient: null };
  return { question, filter };
}

export function unnamedQuestionAnswer(
  askedQuestion: YearTypeSum,
): { question: YearTypeSum; filter: QuestionFilter } {
  return {
    question: { ...askedQuestion, recipient: null, topic: null },
    filter: { category: null, description: null, recipient: null },
  };
}

export function sumFailureStatus(reason: "MIXED" | "FAILED"): "mixed" | "failed" {
  return reason === "MIXED" ? "mixed" : "failed";
}
