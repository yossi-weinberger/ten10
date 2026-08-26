import { createContext, useContext } from "react";
import type { PageTourId } from "@/lib/onboarding/types";

export interface OnboardingUiValue {
  showHomeCta: boolean;
  showGettingStarted: boolean;
  hasFirstTransaction: boolean;
  analyticsOpened: boolean;
  isTourRunning: boolean;
  dismissChecklist: () => void;
  restartTour: () => void;
  startPageTour: (tour: PageTourId) => void;
}

export const defaultOnboardingUi: OnboardingUiValue = {
  showHomeCta: false,
  showGettingStarted: false,
  hasFirstTransaction: false,
  analyticsOpened: false,
  isTourRunning: false,
  dismissChecklist: () => undefined,
  restartTour: () => undefined,
  startPageTour: () => undefined,
};

export const OnboardingUiContext = createContext<OnboardingUiValue | null>(null);

export function useOnboardingUi(): OnboardingUiValue {
  return useContext(OnboardingUiContext) ?? defaultOnboardingUi;
}
