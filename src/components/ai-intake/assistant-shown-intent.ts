import {
  intentIsConfident,
  isBareCapabilityQuestion,
  selectHalachaPage,
  type IntakeIntent,
} from "@/lib/ai/classify-intake";

export type ShownIntent = IntakeIntent | "ask";

type Decided =
  | { ok: true; intent: IntakeIntent | null; confidence: number | null; halachaPage?: string | null }
  | { ok: false };

/**
 * A published halacha page wins when Jev names one at or above the confidence floor.
 * Below that floor the page is treated as unanswered, and the local page list is used.
 * When the classifier does not answer the intent, the user is asked.
 */
export function shownIntent(source: string, _today: string, decided: Decided): ShownIntent {
  const answered = decided.ok && decided.halachaPage !== undefined;
  const modelPage = answered ? decided.halachaPage ?? null : null;
  const page = !answered
    ? selectHalachaPage(source)
    : modelPage === "personal" || modelPage === "none" || modelPage === null
      ? null
      : modelPage;
  const confident = decided.ok && decided.intent !== null && intentIsConfident(decided.confidence);

  if (!confident && isBareCapabilityQuestion(source) && !page) return "help";
  if (decided.ok && decided.intent && !confident) return page ? "domain_adjacent" : "ask";
  if (!decided.ok || decided.intent === null) return page ? "domain_adjacent" : "ask";
  if (decided.intent === "domain_adjacent") return page ? "domain_adjacent" : "out_of_scope";
  if (decided.intent === "out_of_scope") return page ? "domain_adjacent" : "out_of_scope";
  return decided.intent;
}
