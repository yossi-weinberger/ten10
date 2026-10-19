/**
 * Shadow measurement for auto-save. The save itself stays off.
 * wouldAutoSave is the full gate in §10.6, including decide().
 * eligibleWithoutModel is every other check, so the cohort can be measured now.
 */

export interface ShadowAutoSaveChecks {
  expense: boolean;
  sameCurrency: boolean;
  explicit: boolean;
  known: boolean;
  duplicate: boolean;
  decideAvailable: boolean;
}

export interface ShadowAutoSaveResult {
  eligibleWithoutModel: boolean;
  wouldAutoSave: boolean;
  blockedBy: string[];
}

export function evaluateShadowAutoSave(checks: ShadowAutoSaveChecks): ShadowAutoSaveResult {
  const blockedBy: string[] = [];
  if (!checks.expense) blockedBy.push("NOT_EXPENSE");
  if (!checks.sameCurrency) blockedBy.push("CURRENCY");
  if (!checks.explicit) blockedBy.push("NOT_EXPLICIT");
  if (!checks.known) blockedBy.push("UNKNOWN_MERCHANT");
  if (checks.duplicate) blockedBy.push("DUPLICATE_CANDIDATE");
  if (!checks.decideAvailable) blockedBy.push("DECIDE_UNAVAILABLE");

  const eligibleWithoutModel = blockedBy.every((code) => code === "DECIDE_UNAVAILABLE");
  return {
    eligibleWithoutModel,
    wouldAutoSave: blockedBy.length === 0,
    blockedBy,
  };
}
