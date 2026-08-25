export type OnboardingStatus = "idle" | "started" | "skipped" | "completed";

export type OnboardingPlatform = "web" | "desktop";

export type TourId = "first-run" | "import";

export type PageTourId = "home" | "form" | "import";

export const HOME_STEP_IDS = [
  "home-intro",
  "tithe-balance",
  "opening-balance",
  "card-quick-add",
  "date-range",
  "continue-to-form",
] as const;

export const FORM_STEP_IDS = [
  "transaction-form",
  "transaction-basics",
  "transaction-flags",
  "recurring-toggle",
  "live-balance",
  "transaction-import",
] as const;

export const IMPORT_STEP_IDS = [
  "import-intro",
  "import-steps",
  "import-checklist",
  "import-template",
  "import-upload",
  "import-mapping",
  "import-review",
  "import-approve",
] as const;

export const ONBOARDING_STEP_IDS = [
  ...HOME_STEP_IDS,
  ...FORM_STEP_IDS,
  ...IMPORT_STEP_IDS,
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
