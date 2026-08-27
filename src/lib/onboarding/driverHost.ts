import { driver, type Driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { logger } from "@/lib/logger";
import {
  importWizardScreenForStep,
  notifyOnboardingImportMappingNext,
  notifyOnboardingImportUploadNext,
  notifyOnboardingImportWizardScreen,
  registerOnboardingTourRefresh,
  subscribeOnboardingImportReached,
} from "./importWizardBridge";
import { resolveOnboardingDoneAction } from "./doneAction";
import { getStepId } from "./tours/firstRun";
import type { StepId } from "./types";

function syncImportWizardToStep(stepId: StepId | undefined): void {
  const screen = importWizardScreenForStep(stepId);
  if (screen) {
    notifyOnboardingImportWizardScreen(screen);
  }
}

const POPOVER_CLASS = "ten10-driver-popover";
const EXTRA_STAGE_ATTR = "data-ten10-extra-stage";
const STAGE_FRAME_ATTR = "data-ten10-stage-frame";
const STAGE_PADDING = 8;
const STAGE_RADIUS = 8;

function extraStageHolePath(rect: DOMRect): string {
  const width = rect.width + STAGE_PADDING * 2;
  const height = rect.height + STAGE_PADDING * 2;
  const radius = Math.floor(
    Math.max(Math.min(STAGE_RADIUS, width / 2, height / 2), 0),
  );
  const startX = rect.x - STAGE_PADDING + radius;
  const startY = rect.y - STAGE_PADDING;
  const innerWidth = width - radius * 2;
  const innerHeight = height - radius * 2;
  return `M${startX},${startY} h${innerWidth} a${radius},${radius} 0 0 1 ${radius},${radius} v${innerHeight} a${radius},${radius} 0 0 1 -${radius},${radius} h-${innerWidth} a${radius},${radius} 0 0 1 -${radius},-${radius} v-${innerHeight} a${radius},${radius} 0 0 1 ${radius},-${radius} z`;
}

let extraStageObserver: MutationObserver | null = null;
let writingExtraStages = false;
let extraStagePrimary: Element | undefined;

function overlayHasExtraHoles(path: string): boolean {
  return (path.match(/M/g)?.length ?? 0) > 2;
}

function clearStageFrames(): void {
  document.querySelectorAll(`[${STAGE_FRAME_ATTR}]`).forEach((node) => {
    node.remove();
  });
}

function syncStageFrames(): void {
  clearStageFrames();
  document
    .querySelectorAll("[data-onboarding='card-quick-add']")
    .forEach((node) => {
      const rect = node.getBoundingClientRect();
      const frame = document.createElement("div");
      frame.setAttribute(STAGE_FRAME_ATTR, "");
      frame.className = "ten10-onboarding-stage-frame";
      frame.style.top = `${rect.y - STAGE_PADDING}px`;
      frame.style.left = `${rect.x - STAGE_PADDING}px`;
      frame.style.width = `${rect.width + STAGE_PADDING * 2}px`;
      frame.style.height = `${rect.height + STAGE_PADDING * 2}px`;
      document.body.appendChild(frame);
    });
}

function clearExtraQuickAddStages(): void {
  extraStageObserver?.disconnect();
  extraStageObserver = null;
  extraStagePrimary = undefined;
  writingExtraStages = false;
  clearStageFrames();
  document.querySelectorAll(`[${EXTRA_STAGE_ATTR}]`).forEach((node) => {
    node.classList.remove("driver-active-element");
    node.removeAttribute(EXTRA_STAGE_ATTR);
  });
}

function applyExtraQuickAddStages(): void {
  const path = document.querySelector(".driver-overlay path");
  const buttons = document.querySelectorAll(
    "[data-onboarding='card-quick-add']",
  );
  const extras: string[] = [];

  buttons.forEach((node) => {
    if (node === extraStagePrimary) return;
    extras.push(extraStageHolePath(node.getBoundingClientRect()));
    node.classList.add("driver-active-element");
    node.setAttribute(EXTRA_STAGE_ATTR, "true");
  });

  if (path) {
    const current = path.getAttribute("d") ?? "";
    if (extras.length > 0 && !overlayHasExtraHoles(current)) {
      writingExtraStages = true;
      path.setAttribute("d", `${current} ${extras.join(" ")}`);
      writingExtraStages = false;
    }
  }

  syncStageFrames();
}

function addExtraQuickAddStages(primary?: Element): void {
  extraStagePrimary = primary;
  applyExtraQuickAddStages();

  if (extraStageObserver) return;
  const path = document.querySelector(".driver-overlay path");
  if (!path) return;

  extraStageObserver = new MutationObserver(() => {
    if (writingExtraStages) return;
    applyExtraQuickAddStages();
  });
  extraStageObserver.observe(path, {
    attributes: true,
    attributeFilter: ["d"],
  });
}

export interface OnboardingTourCallbacks {
  onStepViewed: (stepId: StepId) => void;
  onStepCompleted: (stepId: StepId) => void;
  onPaused: () => void;
  onContinueToForm?: () => void;
  onBackToHome?: () => void;
}

let activeDriver: Driver | null = null;
let startingDestroy = false;
let unsubscribeImportReached: (() => void) | null = null;

export function isOnboardingTourRunning(): boolean {
  return activeDriver?.isActive() === true;
}

export function destroyOnboardingTour(): void {
  unsubscribeImportReached?.();
  unsubscribeImportReached = null;
  registerOnboardingTourRefresh(null);
  clearExtraQuickAddStages();
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

  const advanceFromActiveStep = (): void => {
    const stepId = getStepId(activeDriver?.getActiveStep());
    if (stepId === "continue-to-form") {
      callbacks.onStepCompleted(stepId);
      callbacks.onContinueToForm?.();
      return;
    }
    if (stepId === "import-upload") {
      notifyOnboardingImportUploadNext();
      // Move off the upload target before the wizard unmounts it.
      activeDriver?.moveNext();
      return;
    }
    if (stepId === "import-mapping") {
      notifyOnboardingImportMappingNext();
      activeDriver?.moveNext();
      return;
    }
    const nextId = getStepId(input.steps[(lastIndex ?? 0) + 1]);
    syncImportWizardToStep(nextId);
    activeDriver?.moveNext();
  };

  activeDriver = driver({
    steps: input.steps,
    animate: true,
    smoothScroll: true,
    stagePadding: 8,
    stageRadius: 8,
    overlayColor: "rgb(15, 23, 42)",
    overlayOpacity: 0.5,
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
      advanceFromActiveStep();
    },
    onPrevClick: () => {
      const stepId = getStepId(activeDriver?.getActiveStep());
      if (stepId === "transaction-form") {
        callbacks.onBackToHome?.();
        return;
      }
      const previousId = getStepId(input.steps[(lastIndex ?? 0) - 1]);
      syncImportWizardToStep(previousId);
      activeDriver?.movePrevious();
    },
    onHighlightStarted: (_element, step, { index }) => {
      if (!_element && step.element) {
        logger.warn("[onboarding] Target missing for step", getStepId(step));
      }
      const stepId = getStepId(step);
      syncImportWizardToStep(stepId);
      if (stepId === "card-quick-add") {
        addExtraQuickAddStages(_element);
      } else {
        clearExtraQuickAddStages();
      }
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
    onHighlighted: (element, step) => {
      if (getStepId(step) === "card-quick-add") {
        addExtraQuickAddStages(element);
      }
    },
    onCloseClick: () => {
      callbacks.onPaused();
      destroyOnboardingTour();
    },
    onDoneClick: () => {
      const stepId = getStepId(activeDriver?.getActiveStep());
      const doneAction = resolveOnboardingDoneAction(stepId);
      switch (doneAction) {
        case "continue-to-form":
          if (stepId) {
            callbacks.onStepCompleted(stepId);
          }
          callbacks.onContinueToForm?.();
          destroyOnboardingTour();
          return;
        case "advance":
          // Driver.js calls Done when later import screens are not in the DOM yet.
          advanceFromActiveStep();
          return;
        case "pause":
          if (stepId) {
            callbacks.onStepCompleted(stepId);
          }
          callbacks.onPaused();
          destroyOnboardingTour();
          return;
        default: {
          const _exhaustive: never = doneAction;
          return _exhaustive;
        }
      }
    },
    onDestroyStarted: () => {
      if (startingDestroy) {
        return;
      }
      const stepId = getStepId(activeDriver?.getActiveStep());
      if (stepId === "continue-to-form") {
        callbacks.onStepCompleted(stepId);
        callbacks.onContinueToForm?.();
        return;
      }
      if (stepId?.startsWith("import-") && stepId !== "import-approve") {
        return;
      }
      callbacks.onPaused();
      destroyOnboardingTour();
    },
  });

  registerOnboardingTourRefresh(() => {
    activeDriver?.refresh();
  });
  unsubscribeImportReached = subscribeOnboardingImportReached((step) => {
    let stepId: StepId;
    switch (step) {
      case "mapping":
        stepId = "import-mapping";
        break;
      case "review":
        stepId = "import-review";
        break;
      default: {
        const _exhaustive: never = step;
        return _exhaustive;
      }
    }
    const index = input.steps.findIndex(
      (tourStep) => getStepId(tourStep) === stepId,
    );
    if (index >= 0) {
      activeDriver?.moveTo(index);
    }
  });

  const startIndex = input.startIndex ?? 0;
  syncImportWizardToStep(getStepId(input.steps[startIndex]));
  activeDriver.drive(startIndex);
}
