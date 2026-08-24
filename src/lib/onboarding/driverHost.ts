import { driver, type Driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { logger } from "@/lib/logger";
import { getStepId } from "./tours/firstRun";
import type { StepId } from "./types";

const POPOVER_CLASS = "ten10-driver-popover";

export interface OnboardingTourCallbacks {
  onStepViewed: (stepId: StepId) => void;
  onStepCompleted: (stepId: StepId) => void;
  onPaused: () => void;
  onContinueToForm: () => void;
}

let activeDriver: Driver | null = null;
let startingDestroy = false;

export function isOnboardingTourRunning(): boolean {
  return activeDriver?.isActive() === true;
}

export function destroyOnboardingTour(): void {
  if (!activeDriver) return;
  startingDestroy = true;
  activeDriver.destroy();
  activeDriver = null;
  startingDestroy = false;
}

export function startOnboardingTour(input: {
  steps: DriveStep[];
  startIndex?: number;
  dir: "rtl" | "ltr";
  nextBtnText: string;
  prevBtnText: string;
  doneBtnText: string;
  progressText: string;
  callbacks: OnboardingTourCallbacks;
}): void {
  destroyOnboardingTour();

  if (input.steps.length === 0) {
    logger.warn("[onboarding] Tour has no steps");
    return;
  }

  const { callbacks } = input;
  let lastIndex: number | undefined;

  activeDriver = driver({
    steps: input.steps,
    animate: true,
    smoothScroll: true,
    stagePadding: 8,
    stageRadius: 8,
    allowClose: true,
    allowKeyboardControl: true,
    skipMissingElement: true,
    disableActiveInteraction: false,
    showProgress: true,
    progressText: input.progressText,
    nextBtnText: input.nextBtnText,
    prevBtnText: input.prevBtnText,
    doneBtnText: input.doneBtnText,
    popoverClass: POPOVER_CLASS,
    onPopoverRender: (popover) => {
      popover.wrapper.setAttribute("dir", input.dir);
    },
    onNextClick: () => {
      const stepId = getStepId(activeDriver?.getActiveStep());
      if (stepId === "continue-to-form") {
        callbacks.onStepCompleted(stepId);
        callbacks.onContinueToForm();
        return;
      }
      activeDriver?.moveNext();
    },
    onHighlightStarted: (_element, step, { index }) => {
      if (!_element && step.element) {
        logger.warn("[onboarding] Target missing for step", getStepId(step));
      }
      const stepId = getStepId(step);
      if (stepId) {
        callbacks.onStepViewed(stepId);
      }
      if (lastIndex !== undefined && lastIndex !== index) {
        const previous = input.steps[lastIndex];
        const previousId = previous ? getStepId(previous) : undefined;
        if (previousId) {
          callbacks.onStepCompleted(previousId);
        }
      }
      lastIndex = index;
    },
    onCloseClick: () => {
      callbacks.onPaused();
      destroyOnboardingTour();
    },
    onDoneClick: () => {
      const step = activeDriver?.getActiveStep();
      const stepId = step ? getStepId(step) : undefined;
      if (stepId === "continue-to-form") {
        callbacks.onStepCompleted(stepId);
        callbacks.onContinueToForm();
        return;
      }
      if (stepId) {
        callbacks.onStepCompleted(stepId);
      }
      callbacks.onPaused();
      destroyOnboardingTour();
    },
    onDestroyStarted: () => {
      if (startingDestroy) {
        return;
      }
      const stepId = getStepId(activeDriver?.getActiveStep());
      if (stepId === "continue-to-form") {
        callbacks.onStepCompleted(stepId);
        callbacks.onContinueToForm();
        return;
      }
      callbacks.onPaused();
      destroyOnboardingTour();
    },
  });

  activeDriver.drive(input.startIndex ?? 0);
}
