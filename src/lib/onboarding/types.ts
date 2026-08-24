export type OnboardingStatus = "idle" | "started" | "skipped" | "completed";

export type OnboardingPlatform = "web" | "desktop";

export type TourId = "first-run";

export type StepId = "home-summary" | "add-transaction-cta" | "transaction-form";

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
