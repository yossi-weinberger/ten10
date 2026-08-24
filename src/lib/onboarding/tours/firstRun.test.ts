import { describe, expect, it } from "vitest";
import { ONBOARDING_TARGETS } from "../constants";
import { FORM_STEP_IDS, HOME_STEP_IDS } from "../types";
import {
  buildFirstRunSteps,
  firstRunStartIndex,
  getStepId,
  shouldDriveFirstRunTour,
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
  it("drives Home targets and a form-continue message without a tour-only CTA", () => {
    const steps = buildFirstRunSteps(copy, "rtl", "/");

    expect(steps.map((step) => getStepId(step))).toEqual([...HOME_STEP_IDS]);
    expect(steps[0]?.element).toBe(ONBOARDING_TARGETS.homeIntro);
    expect(steps[3]?.element).toBe(ONBOARDING_TARGETS.openingBalance);
    expect(steps[4]?.element).toBe(ONBOARDING_TARGETS.cardQuickAdd);
    expect(steps[5]?.element).toBeUndefined();
    expect(steps[5]?.popover?.nextBtnText).toBe("Go to form");
    expect(steps.every((step) => step.waitForElement === 5000)).toBe(true);
  });

  it("starts the form tour with the full form, then everyday fields", () => {
    const formSteps = buildFirstRunSteps(copy, "rtl", "/add-transaction");

    expect(formSteps.map((step) => getStepId(step))).toEqual([...FORM_STEP_IDS]);
    expect(formSteps[0]?.element).toBe(ONBOARDING_TARGETS.transactionForm);
    expect(formSteps[1]?.element).toBe(ONBOARDING_TARGETS.transactionBasics);
    expect(formSteps[2]?.element).toBe(ONBOARDING_TARGETS.transactionFlags);
  });

  it("resumes the Home tour after the opening-balance modal", () => {
    expect(firstRunStartIndex("/")).toBe(0);
    expect(firstRunStartIndex("/", "card-quick-add")).toBe(4);
    expect(firstRunStartIndex("/add-transaction", "card-quick-add")).toBe(0);
    expect(firstRunStartIndex("/add-transaction")).toBe(0);
  });

  it("does not drive the tour on settings or other pages", () => {
    expect(shouldDriveFirstRunTour("/")).toBe(true);
    expect(shouldDriveFirstRunTour("/add-transaction")).toBe(true);
    expect(shouldDriveFirstRunTour("/settings")).toBe(false);
    expect(shouldDriveFirstRunTour("/analytics")).toBe(false);
  });
});
