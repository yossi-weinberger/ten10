import type { IntakeIntent } from "./intent.ts";
import { intentIsConfident, type IntakeCount } from "./jev-intent.ts";
import { amountsFromText } from "./text-draft.ts";

/**
 * Jev's count when confident, else `one`. Two or more amounts in the text
 * turn `one` into `several`, so a second amount is never dropped silently.
 */
export function effectiveIntakeCount(
  text: string,
  count: IntakeCount | null,
  confidence: number | null,
): IntakeCount {
  const answered = count !== null && intentIsConfident(confidence) ? count : "one";
  if (answered === "one" && amountsFromText(text).length >= 2) return "several";
  return answered;
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
