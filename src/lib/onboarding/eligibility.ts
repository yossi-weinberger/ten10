import { ONBOARDING_V1_ELIGIBLE_AFTER } from "./constants";
import type {
  OnboardingEligibilityInput,
  OnboardingState,
  TransactionOnboardingOutcome,
} from "./types";

function hasFinishedCurrentVersion(
  onboarding: OnboardingState | undefined,
  currentVersion: number,
): boolean {
  if (!onboarding) return false;
  if (onboarding.status !== "skipped" && onboarding.status !== "completed") {
    return false;
  }
  return (onboarding.version ?? 0) >= currentVersion;
}

function hasStartedCurrentVersion(
  onboarding: OnboardingState | undefined,
  currentVersion: number,
): boolean {
  if (!onboarding || onboarding.status !== "started") return false;
  return (onboarding.version ?? 0) >= currentVersion;
}

function isCreatedOnOrAfterCutoff(userCreatedAt: string | null): boolean {
  if (!userCreatedAt) return false;
  return (
    new Date(userCreatedAt).getTime() >=
    new Date(ONBOARDING_V1_ELIGIBLE_AFTER).getTime()
  );
}

export function isOnboardingEligible(
  input: OnboardingEligibilityInput,
): boolean {
  if (!input.termsAccepted) return false;
  if (input.transactionCount > 0) return false;
  if (hasFinishedCurrentVersion(input.onboarding, input.currentVersion)) {
    return false;
  }
  if (hasStartedCurrentVersion(input.onboarding, input.currentVersion)) {
    return false;
  }

  if (input.platform === "desktop") {
    return true;
  }

  if (!input.flagEnabled) return false;
  return isCreatedOnOrAfterCutoff(input.userCreatedAt);
}

export function resolveTransactionOnboardingOutcome(input: {
  status: OnboardingState["status"];
  tourActive: boolean;
}): TransactionOnboardingOutcome {
  if (input.status === "skipped" || input.status === "completed") {
    return "ignore";
  }
  if (input.status !== "started") {
    return "ignore";
  }
  return input.tourActive ? "success_dialog" : "silent_complete";
}
