import type { DriveStep } from "driver.js";
import { ONBOARDING_TARGETS } from "../constants";
import {
  FORM_STEP_IDS,
  HOME_STEP_IDS,
  isStepId,
  type StepId,
} from "../types";

export interface FirstRunCopy {
  next: string;
  prev: string;
  done: string;
  progress: string;
  homeIntroTitle: string;
  homeIntroDescription: string;
  dateRangeTitle: string;
  dateRangeDescription: string;
  titheBalanceTitle: string;
  titheBalanceDescription: string;
  openingBalanceTitle: string;
  openingBalanceDescription: string;
  cardQuickAddTitle: string;
  cardQuickAddDescription: string;
  continueToFormTitle: string;
  continueToFormDescription: string;
  continueToForm: string;
  formIntroTitle: string;
  formIntroDescription: string;
  formBasicsTitle: string;
  formBasicsDescription: string;
  flagsTitle: string;
  flagsDescription: string;
  recurringTitle: string;
  recurringDescription: string;
  liveBalanceTitle: string;
  liveBalanceDescription: string;
}

export function getStepId(step?: DriveStep): StepId | undefined {
  const stepId = step?.data?.stepId;
  return isStepId(stepId) ? stepId : undefined;
}

export function firstRunStartIndex(
  pathname: string,
  resumeStepId?: StepId | null,
): number {
  const ids = pathname.startsWith("/add-transaction")
    ? FORM_STEP_IDS
    : HOME_STEP_IDS;
  if (!resumeStepId) return 0;
  const index = ids.indexOf(resumeStepId);
  return index >= 0 ? index : 0;
}

export function shouldDriveFirstRunTour(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/add-transaction");
}

function stepOptions(stepId: StepId): Pick<DriveStep, "skipMissingElement" | "waitForElement" | "data"> {
  return {
    skipMissingElement: true,
    waitForElement: 5000,
    data: { stepId },
  };
}

export function buildFirstRunSteps(
  copy: FirstRunCopy,
  dir: "rtl" | "ltr",
  pathname = "/",
): DriveStep[] {
  const ctaSide = dir === "rtl" ? "left" : "right";

  const homeSteps: DriveStep[] = [
    {
      element: ONBOARDING_TARGETS.homeIntro,
      ...stepOptions("home-intro"),
      popover: {
        title: copy.homeIntroTitle,
        description: copy.homeIntroDescription,
        side: "bottom",
        align: "start",
        showButtons: ["next", "close"],
        nextBtnText: copy.next,
      },
    },
    {
      element: ONBOARDING_TARGETS.dateRange,
      ...stepOptions("date-range"),
      popover: {
        title: copy.dateRangeTitle,
        description: copy.dateRangeDescription,
        side: "bottom",
        align: "end",
        showButtons: ["next", "close"],
        nextBtnText: copy.next,
      },
    },
    {
      element: ONBOARDING_TARGETS.titheBalance,
      ...stepOptions("tithe-balance"),
      popover: {
        title: copy.titheBalanceTitle,
        description: copy.titheBalanceDescription,
        side: "bottom",
        align: "start",
        showButtons: ["next", "close"],
        nextBtnText: copy.next,
      },
    },
    {
      element: ONBOARDING_TARGETS.openingBalance,
      ...stepOptions("opening-balance"),
      disableActiveInteraction: false,
      popover: {
        title: copy.openingBalanceTitle,
        description: copy.openingBalanceDescription,
        side: ctaSide,
        align: "start",
        showButtons: ["next", "close"],
        nextBtnText: copy.next,
      },
    },
    {
      element: ONBOARDING_TARGETS.cardQuickAdd,
      ...stepOptions("card-quick-add"),
      disableActiveInteraction: false,
      popover: {
        title: copy.cardQuickAddTitle,
        description: copy.cardQuickAddDescription,
        side: "top",
        align: "start",
        showButtons: ["next", "close"],
        nextBtnText: copy.next,
      },
    },
    {
      ...stepOptions("continue-to-form"),
      popover: {
        title: copy.continueToFormTitle,
        description: copy.continueToFormDescription,
        showButtons: ["next", "close"],
        nextBtnText: copy.continueToForm,
      },
    },
  ];

  const formSteps: DriveStep[] = [
    {
      element: ONBOARDING_TARGETS.transactionForm,
      ...stepOptions("transaction-form"),
      popover: {
        title: copy.formIntroTitle,
        description: copy.formIntroDescription,
        side: "top",
        align: "start",
        showButtons: ["next", "close"],
        nextBtnText: copy.next,
      },
    },
    {
      element: ONBOARDING_TARGETS.transactionBasics,
      ...stepOptions("transaction-basics"),
      popover: {
        title: copy.formBasicsTitle,
        description: copy.formBasicsDescription,
        side: "bottom",
        align: "start",
        showButtons: ["next", "close"],
        nextBtnText: copy.next,
      },
    },
    {
      element: ONBOARDING_TARGETS.transactionFlags,
      ...stepOptions("transaction-flags"),
      popover: {
        title: copy.flagsTitle,
        description: copy.flagsDescription,
        side: "top",
        align: "start",
        showButtons: ["next", "close"],
        nextBtnText: copy.next,
      },
    },
    {
      element: ONBOARDING_TARGETS.recurringToggle,
      ...stepOptions("recurring-toggle"),
      popover: {
        title: copy.recurringTitle,
        description: copy.recurringDescription,
        side: "top",
        align: "start",
        showButtons: ["next", "close"],
        nextBtnText: copy.next,
      },
    },
    {
      element: ONBOARDING_TARGETS.liveBalance,
      ...stepOptions("live-balance"),
      popover: {
        title: copy.liveBalanceTitle,
        description: copy.liveBalanceDescription,
        side: dir === "rtl" ? "left" : "right",
        align: "start",
        showButtons: ["next", "close"],
        nextBtnText: copy.done,
        doneBtnText: copy.done,
      },
    },
  ];

  if (pathname.startsWith("/add-transaction")) {
    return formSteps;
  }

  return homeSteps;
}
