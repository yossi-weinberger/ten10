import { describe, expect, it } from "vitest";
import { ONBOARDING_TARGETS } from "../constants";
import { FORM_STEP_IDS, HOME_STEP_IDS } from "../types";
import {
  buildFirstRunSteps,
  firstRunStartIndex,
  getStepId,
  shouldDriveFirstRunTour,
  shouldDriveImportTour,
} from "./firstRun";

const copy = {
  next: "Next",
  prev: "Back",
  done: "Continue on my own",
  progress: "{{current}} / {{total}}",
  homeIntroTitle: "Home",
  homeIntroDescription: "Start here",
  dateRangeTitle: "Range",
  dateRangeDescription: "Pick a range",
  titheBalanceTitle: "Tithe",
  titheBalanceDescription: "Credit or debit",
  openingBalanceTitle: "Opening",
  openingBalanceDescription: "Set it once",
  cardQuickAddTitle: "Quick add",
  cardQuickAddDescription: "Use the +",
  continueToFormTitle: "Ready?",
  continueToFormDescription: "Open the form",
  continueToForm: "Go to form",
  formIntroTitle: "Form",
  formIntroDescription: "The whole form",
  formImportTitle: "Import",
  formImportDescription: "Upload a file",
  formBasicsTitle: "Basics",
  formBasicsDescription: "Type and amount",
  flagsTitle: "Flags",
  flagsDescription: "Chomesh and maaser",
  recurringTitle: "Recurring",
  recurringDescription: "Standing order",
  liveBalanceTitle: "Live",
  liveBalanceDescription: "Sidebar updates",
};

describe("buildFirstRunSteps", () => {
  it("walks the cards before the date range, then continues to the form", () => {
    const steps = buildFirstRunSteps(copy, "rtl", "/");

    expect(steps.map((step) => getStepId(step))).toEqual([...HOME_STEP_IDS]);
    expect(steps[0]?.element).toBe(ONBOARDING_TARGETS.homeIntro);
    expect(steps[1]?.element).toBe(ONBOARDING_TARGETS.titheBalance);
    expect(steps[2]?.element).toBe(ONBOARDING_TARGETS.openingBalance);
    expect(steps[3]?.element).toBe(ONBOARDING_TARGETS.cardQuickAdd);
    expect(steps[4]?.element).toBe(ONBOARDING_TARGETS.dateRange);
    expect(steps[5]?.element).toBeUndefined();
    expect(steps[5]?.popover?.nextBtnText).toBe("Go to form");
    expect(
      steps.every((step) => step.popover?.showButtons?.includes("previous")),
    ).toBe(true);
    expect(steps.every((step) => step.waitForElement === 5000)).toBe(true);
  });

  it("starts the form tour with everyday fields, then ends on import", () => {
    const formSteps = buildFirstRunSteps(copy, "rtl", "/add-transaction");

    expect(formSteps.map((step) => getStepId(step))).toEqual([...FORM_STEP_IDS]);
    expect(formSteps[0]?.element).toBe(ONBOARDING_TARGETS.transactionForm);
    expect(formSteps[0]?.popover?.disableButtons).toEqual([]);
    expect(formSteps[1]?.element).toBe(ONBOARDING_TARGETS.transactionBasics);
    expect(formSteps[2]?.element).toBe(ONBOARDING_TARGETS.transactionFlags);
    expect(formSteps.at(-1)?.element).toBe(ONBOARDING_TARGETS.transactionImport);
    expect(formSteps.at(-1)?.popover?.nextBtnText).toBe("Continue on my own");
    expect(
      formSteps.every((step) => step.popover?.showButtons?.includes("previous")),
    ).toBe(true);
  });

  it("resumes the Home tour after the opening-balance modal", () => {
    expect(firstRunStartIndex("/")).toBe(0);
    expect(firstRunStartIndex("/", "card-quick-add")).toBe(3);
    expect(firstRunStartIndex("/add-transaction", "card-quick-add")).toBe(0);
    expect(firstRunStartIndex("/add-transaction")).toBe(0);
  });

  it("keeps page help tours on the current page", () => {
    const homeHelp = buildFirstRunSteps(copy, "rtl", "/", { help: true });
    expect(homeHelp.map((step) => getStepId(step))).toEqual([...HOME_STEP_IDS]);
    expect(homeHelp.at(-1)?.popover?.nextBtnText).toBe("Go to form");

    const formHelp = buildFirstRunSteps(copy, "rtl", "/add-transaction", {
      help: true,
    });
    expect(formHelp.map((step) => getStepId(step))).toEqual([...FORM_STEP_IDS]);
    expect(formHelp[0]?.popover?.disableButtons).toBeUndefined();
  });

  it("does not drive the first-run tour on settings or other pages", () => {
    expect(shouldDriveFirstRunTour("/")).toBe(true);
    expect(shouldDriveFirstRunTour("/add-transaction")).toBe(true);
    expect(shouldDriveFirstRunTour("/settings")).toBe(false);
    expect(shouldDriveFirstRunTour("/analytics")).toBe(false);
    expect(shouldDriveImportTour("/transactions-table/import")).toBe(true);
    expect(shouldDriveImportTour("/")).toBe(false);
  });
});
