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
 * A published halacha page is a local match. It wins when the classifier
 * is unsure or says the sentence is out of scope. A confident transaction,
 * data question, rule, or duplicate scan still wins.
 * When the classifier does not answer, the user is asked. The local intent parser stays unused.
 */
export function shownIntent(source: string, _today: string, decided: Decided): ShownIntent {
  const modelPage = decided.ok ? decided.halachaPage ?? null : null;
  const page = modelPage === "personal"
    ? null
    : modelPage && modelPage !== "none"
      ? modelPage
      : selectHalachaPage(source);
  const confident = decided.ok && decided.intent !== null && intentIsConfident(decided.confidence);

  if (!confident && isBareCapabilityQuestion(source) && !page) return "help";
  if (decided.ok && decided.intent && !confident) return page ? "domain_adjacent" : "ask";
  if (!decided.ok || decided.intent === null) return page ? "domain_adjacent" : "ask";
  if (decided.intent === "domain_adjacent") return page ? "domain_adjacent" : "out_of_scope";
  if (decided.intent === "out_of_scope") return page ? "domain_adjacent" : "out_of_scope";
  return decided.intent;
}
