import {
  intentIsConfident,
  type IntakeIntent,
} from "@/lib/ai/classify-intake";

export type ShownIntent = IntakeIntent | "ask" | "ask_rabbi";

type Decided =
  | { ok: true; intent: IntakeIntent | null; confidence: number | null; halachaPage?: string | null }
  | { ok: false };

/** A page, including a personal question, needs the confidence floor. */
export function namedHalachaPage(page: string | null, confidence: number | null): string | null {
  if (!page || page === "none") return null;
  return intentIsConfident(confidence) ? page : null;
}

function modelPage(decided: Decided): string | null {
  if (!decided.ok) return null;
  const page = decided.halachaPage ?? null;
  if (page === null || page === "personal" || page === "none") return null;
  return page;
}

/**
 * A page is shown only when Jev named one. An unsure intent asks the user.
 * Word lists do not choose a page or turn a question into help.
 */
export function shownIntent(_source: string, _today: string, decided: Decided): ShownIntent {
  const personal = decided.ok && decided.halachaPage === "personal";
  const page = modelPage(decided);
  const confident = decided.ok && decided.intent !== null && intentIsConfident(decided.confidence);
  if (personal && (!confident || decided.intent === "out_of_scope" || decided.intent === "domain_adjacent")) {
    return "ask_rabbi";
  }

  if (decided.ok && decided.intent && !confident) return page ? "domain_adjacent" : "ask";
  if (!decided.ok || decided.intent === null) return page ? "domain_adjacent" : "ask";
  if (decided.intent === "domain_adjacent") return page ? "domain_adjacent" : "out_of_scope";
  if (decided.intent === "out_of_scope") return page ? "domain_adjacent" : "out_of_scope";
  return decided.intent;
}
