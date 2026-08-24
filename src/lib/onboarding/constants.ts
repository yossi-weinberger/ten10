export const CURRENT_ONBOARDING_VERSION = 1;

/** Web accounts created before this instant are never offered v1. */
export const ONBOARDING_V1_ELIGIBLE_AFTER = "2026-08-24T00:00:00.000Z";

export const ONBOARDING_FEATURE_FLAG = "new-user-onboarding-v1";

export const ONBOARDING_TOUR_ID = "first-run" as const;

export const ONBOARDING_TOUR_ACTIVE_KEY = "ten10.onboarding.v1";

export const ONBOARDING_TARGETS = {
  homeSummary: "[data-onboarding='home-summary']",
  addTransactionCta: "[data-onboarding='add-transaction-cta']",
  transactionForm: "[data-onboarding='transaction-form']",
} as const;
