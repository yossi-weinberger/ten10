import { trackProductEvent } from "@/lib/analytics/productAnalytics";
import { CURRENT_ONBOARDING_VERSION, ONBOARDING_TOUR_ID } from "./constants";
import type { StepId, TourId } from "./types";

function versionProps() {
  return { version: CURRENT_ONBOARDING_VERSION };
}

function tourProps(tourId: TourId = ONBOARDING_TOUR_ID) {
  return { ...versionProps(), tour_id: tourId };
}

export function trackOnboardingOffered(): void {
  trackProductEvent("onboarding_offered", versionProps());
}

export function trackOnboardingStarted(): void {
  trackProductEvent("onboarding_started", tourProps());
}

export function trackOnboardingStepViewed(
  stepId: StepId,
  tourId: TourId = ONBOARDING_TOUR_ID,
): void {
  trackProductEvent("onboarding_step_viewed", {
    ...tourProps(tourId),
    step_id: stepId,
  });
}

export function trackOnboardingStepCompleted(
  stepId: StepId,
  tourId: TourId = ONBOARDING_TOUR_ID,
): void {
  trackProductEvent("onboarding_step_completed", {
    ...tourProps(tourId),
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
