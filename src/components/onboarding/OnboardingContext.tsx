import { createContext, useContext } from "react";

export interface OnboardingUiValue {
  showHomeCta: boolean;
  showGettingStarted: boolean;
  hasFirstTransaction: boolean;
  analyticsOpened: boolean;
  dismissChecklist: () => void;
  restartTour: () => void;
  startImportTour: () => void;
}

export const defaultOnboardingUi: OnboardingUiValue = {
  showHomeCta: false,
  showGettingStarted: false,
  hasFirstTransaction: false,
  analyticsOpened: false,
  dismissChecklist: () => undefined,
  restartTour: () => undefined,
  startImportTour: () => undefined,
};

export const OnboardingUiContext = createContext<OnboardingUiValue | null>(null);

export function useOnboardingUi(): OnboardingUiValue {
  return useContext(OnboardingUiContext) ?? defaultOnboardingUi;
}
