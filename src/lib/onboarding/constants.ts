export const CURRENT_ONBOARDING_VERSION = 1;

/** Web accounts created before this instant are never offered v1. */
export const ONBOARDING_V1_ELIGIBLE_AFTER = "2026-08-24T00:00:00.000Z";

export const ONBOARDING_FEATURE_FLAG = "new-user-onboarding-v1";

export const ONBOARDING_TOUR_ID = "first-run" as const;
export const IMPORT_TOUR_ID = "import" as const;

export const ONBOARDING_TOUR_ACTIVE_KEY = "ten10.onboarding.v1";

export const ONBOARDING_TARGETS = {
  homeIntro: "[data-onboarding='home-intro']",
  dateRange: "[data-onboarding='date-range']",
  titheBalance: "[data-onboarding='tithe-balance']",
  openingBalance: "[data-onboarding='opening-balance']",
  cardQuickAdd: "[data-onboarding='card-quick-add']",
  transactionForm: "[data-onboarding='transaction-form']",
  transactionImport: "[data-onboarding='transaction-import']",
  transactionBasics: "[data-onboarding='transaction-basics']",
  transactionFlags: "[data-onboarding='transaction-flags']",
  recurringToggle: "[data-onboarding='recurring-toggle']",
  liveBalance: "[data-onboarding='live-balance']",
  importIntro: "[data-onboarding='import-intro']",
  importChecklist: "[data-onboarding='import-checklist']",
  importTemplate: "[data-onboarding='import-template']",
  importUpload: "[data-onboarding='import-upload']",
} as const;
