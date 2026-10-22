import {
  fallbackIntent,
  intentIsConfident,
  isBareCapabilityQuestion,
  parseUserRule,
  selectHalachaPage,
  type IntakeIntent,
} from "@/lib/ai/classify-intake";

export type ShownIntent = IntakeIntent | "ask";

type Decided =
  | { ok: true; intent: IntakeIntent | null; confidence: number | null }
  | { ok: false };

/**
 * A published halacha page is a local match. It wins when the classifier
 * is unsure or says the sentence is out of scope. A confident transaction,
 * data question, rule, or duplicate scan still wins.
 */
export function shownIntent(source: string, today: string, decided: Decided): ShownIntent {
  const page = selectHalachaPage(source);
  const confident = decided.ok && decided.intent !== null && intentIsConfident(decided.confidence);

  if (!confident && isBareCapabilityQuestion(source) && !page) return "help";
  if (decided.ok && decided.intent && !confident) return page ? "domain_adjacent" : "ask";
  if (!decided.ok || decided.intent === null) {
    const local = fallbackIntent(source, today);
    return page && local === "out_of_scope" ? "domain_adjacent" : local;
  }
  if (decided.intent === "domain_adjacent") return page ? "domain_adjacent" : "out_of_scope";
  if (decided.intent === "out_of_scope") return page ? "domain_adjacent" : "out_of_scope";
  if (decided.intent === "create_rule" && !parseUserRule(source)) return "out_of_scope";
  return decided.intent;
}
