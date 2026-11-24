export type ImportWizardStep = "upload" | "mapping" | "review" | "result";

const LABELED_STEPS = ["upload", "mapping", "review"] as const;

/**
 * Desktop line tracks the gaps between the three visible dots (0 / 50 / 100).
 * Mobile bar has no dots, so each step fills an equal slice (33 / 67 / 100).
 * "result" is not a labeled step; it falls back to index 0 and does not throw.
 */
export function getStepProgress(step: ImportWizardStep): { line: number; bar: number } {
  const labeledStepIndex = Math.max(
    0,
    LABELED_STEPS.indexOf(step as (typeof LABELED_STEPS)[number]),
  );
  const line = (labeledStepIndex / (LABELED_STEPS.length - 1)) * 100;
  const bar = ((labeledStepIndex + 1) / LABELED_STEPS.length) * 100;
  return { line, bar };
}
