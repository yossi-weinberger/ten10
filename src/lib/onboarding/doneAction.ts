import type { StepId } from "./types";

export type OnboardingDoneAction = "continue-to-form" | "advance" | "pause";

export function resolveOnboardingDoneAction(
  stepId: StepId | undefined,
): OnboardingDoneAction {
  if (stepId === "continue-to-form") {
    return "continue-to-form";
  }
  if (stepId?.startsWith("import-") && stepId !== "import-approve") {
    return "advance";
  }
  return "pause";
}
