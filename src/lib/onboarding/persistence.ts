import { useDonationStore } from "@/lib/store";
import { CURRENT_ONBOARDING_VERSION, ONBOARDING_TOUR_ACTIVE_KEY } from "./constants";
import type { OnboardingState } from "./types";

const idleOnboarding = (): OnboardingState => ({
  version: null,
  status: "idle",
});

export function getOnboardingState(): OnboardingState {
  return useDonationStore.getState().settings.onboarding ?? idleOnboarding();
}

function patchOnboarding(patch: Partial<OnboardingState>): void {
  const current = getOnboardingState();
  useDonationStore.getState().updateSettings({
    onboarding: { ...current, ...patch },
  });
}

export function startOnboarding(): void {
  patchOnboarding({
    version: CURRENT_ONBOARDING_VERSION,
    status: "started",
  });
}

export function skipOnboarding(): void {
  patchOnboarding({
    version: CURRENT_ONBOARDING_VERSION,
    status: "skipped",
  });
  setOnboardingTourActive(false);
}

export function completeOnboarding(): void {
  patchOnboarding({
    version: CURRENT_ONBOARDING_VERSION,
    status: "completed",
  });
  setOnboardingTourActive(false);
}

export function restartOnboarding(): void {
  patchOnboarding({
    version: CURRENT_ONBOARDING_VERSION,
    status: "started",
  });
  setOnboardingTourActive(true);
}

export function updateOnboardingChecklist(
  patch: Pick<OnboardingState, "checklistDismissed" | "analyticsOpened">,
): void {
  patchOnboarding(patch);
}

export function isOnboardingTourActive(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(ONBOARDING_TOUR_ACTIVE_KEY) === "true";
}

export function setOnboardingTourActive(active: boolean): void {
  if (typeof sessionStorage === "undefined") return;
  if (active) {
    sessionStorage.setItem(ONBOARDING_TOUR_ACTIVE_KEY, "true");
    return;
  }
  sessionStorage.removeItem(ONBOARDING_TOUR_ACTIVE_KEY);
}
