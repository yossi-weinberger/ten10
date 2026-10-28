import type { IntakeIntent } from "./intent.ts";
import { intentIsConfident, type IntakeCount } from "./jev-intent.ts";
import { amountsFromText } from "./text-draft.ts";

/**
 * A confident Jev answer wins, because the parser also counts installments,
 * percentages and head counts. Below the floor, `several` and `list` are kept,
 * and an unsure `one` or no answer becomes `several` when the text has two or more amounts.
 */
export function effectiveIntakeCount(
  text: string,
  count: IntakeCount | null,
  confidence: number | null,
): IntakeCount {
  if (count !== null && intentIsConfident(confidence)) return count;
  if (count === "several" || count === "list") return count;
  return amountsFromText(text).length >= 2 ? "several" : "one";
}

/** Count matters only for a transaction. */
export function recordsOneAtATime(
  intent: IntakeIntent,
  text: string,
  count: IntakeCount | null,
  confidence: number | null,
): boolean {
  return intent === "add_transaction" && effectiveIntakeCount(text, count, confidence) !== "one";
}
