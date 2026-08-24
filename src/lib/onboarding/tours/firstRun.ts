import type { DriveStep } from "driver.js";
import { ONBOARDING_TARGETS } from "../constants";
import type { StepId } from "../types";

export interface FirstRunCopy {
  next: string;
  prev: string;
  done: string;
  progress: string;
  homeSummaryTitle: string;
  homeSummaryDescription: string;
  addCtaTitle: string;
  addCtaDescription: string;
  formTitle: string;
  formDescription: string;
}

export function getStepId(step: DriveStep): StepId | undefined {
  const stepId = step.data?.stepId;
  if (
    stepId === "home-summary" ||
    stepId === "add-transaction-cta" ||
    stepId === "transaction-form"
  ) {
    return stepId;
  }
  return undefined;
}

export function firstRunStartIndex(pathname: string): number {
  return pathname.startsWith("/add-transaction") ? 2 : 0;
}

export function shouldDriveFirstRunTour(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/add-transaction");
}

export function buildFirstRunSteps(
  copy: FirstRunCopy,
  dir: "rtl" | "ltr",
): DriveStep[] {
  const ctaSide = dir === "rtl" ? "left" : "right";

  return [
    {
      element: ONBOARDING_TARGETS.homeSummary,
      skipMissingElement: true,
      data: { stepId: "home-summary" },
      popover: {
        title: copy.homeSummaryTitle,
        description: copy.homeSummaryDescription,
        side: "bottom",
        align: "start",
        showButtons: ["next", "close"],
        nextBtnText: copy.next,
      },
    },
    {
      element: ONBOARDING_TARGETS.addTransactionCta,
      skipMissingElement: true,
      advanceOnClick: true,
      disableActiveInteraction: false,
      data: { stepId: "add-transaction-cta" },
      popover: {
        title: copy.addCtaTitle,
        description: copy.addCtaDescription,
        side: ctaSide,
        align: "start",
        showButtons: ["close"],
      },
    },
    {
      element: ONBOARDING_TARGETS.transactionForm,
      skipMissingElement: true,
      waitForElement: 5000,
      data: { stepId: "transaction-form" },
      popover: {
        title: copy.formTitle,
        description: copy.formDescription,
        side: "top",
        align: "start",
        showButtons: ["next", "close"],
        nextBtnText: copy.done,
        doneBtnText: copy.done,
      },
    },
  ];
}
