export type OnboardingStatus = "idle" | "started" | "skipped" | "completed";

export type OnboardingPlatform = "web" | "desktop";

export type TourId = "first-run";

export const HOME_STEP_IDS = [
  "date-range",
  "tithe-balance",
  "opening-balance",
  "card-quick-add",
] as const;

export const FORM_STEP_IDS = [
  "transaction-flags",
  "recurring-toggle",
  "live-balance",
] as const;

export const ONBOARDING_STEP_IDS = [
  ...HOME_STEP_IDS,
  ...FORM_STEP_IDS,
] as const;

export type StepId = (typeof ONBOARDING_STEP_IDS)[number];

export function isStepId(value: unknown): value is StepId {
  return (
    typeof value === "string" &&
    (ONBOARDING_STEP_IDS as readonly string[]).includes(value)
  );
}

export interface OnboardingState {
  version: number | null;
  status: OnboardingStatus;
  checklistDismissed?: boolean;
  analyticsOpened?: boolean;
}

export interface OnboardingEligibilityInput {
  platform: OnboardingPlatform;
  userCreatedAt: string | null;
  termsAccepted: boolean;
  transactionCount: number;
  flagEnabled: boolean;
  onboarding: OnboardingState | undefined;
  currentVersion: number;
}

export type TransactionOnboardingOutcome =
  | "success_dialog"
  | "silent_complete"
  | "ignore";
