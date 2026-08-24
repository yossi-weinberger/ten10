import { trackProductEvent } from "@/lib/analytics/productAnalytics";
import { CURRENT_ONBOARDING_VERSION, ONBOARDING_TOUR_ID } from "./constants";
import type { StepId } from "./types";

function versionProps() {
  return { version: CURRENT_ONBOARDING_VERSION };
}

function tourProps() {
  return { ...versionProps(), tour_id: ONBOARDING_TOUR_ID };
}

export function trackOnboardingOffered(): void {
  trackProductEvent("onboarding_offered", versionProps());
}

export function trackOnboardingStarted(): void {
  trackProductEvent("onboarding_started", tourProps());
}

export function trackOnboardingStepViewed(stepId: StepId): void {
  trackProductEvent("onboarding_step_viewed", {
    ...tourProps(),
    step_id: stepId,
  });
}

export function trackOnboardingStepCompleted(stepId: StepId): void {
  trackProductEvent("onboarding_step_completed", {
    ...tourProps(),
    step_id: stepId,
  });
}

export function trackOnboardingSkipped(stepId?: StepId): void {
  trackProductEvent("onboarding_skipped", {
    ...tourProps(),
    step_id: stepId,
  });
}

export function trackOnboardingCompleted(): void {
  trackProductEvent("onboarding_completed", tourProps());
}

export function trackOnboardingRestarted(): void {
  trackProductEvent("onboarding_restarted", versionProps());
}
