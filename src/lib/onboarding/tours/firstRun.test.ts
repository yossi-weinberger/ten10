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
  dateRangeTitle: "Range",
  dateRangeDescription: "Pick a range",
  titheBalanceTitle: "Tithe",
  titheBalanceDescription: "Credit or debit",
  openingBalanceTitle: "Opening",
  openingBalanceDescription: "Set it once",
  cardQuickAddTitle: "Quick add",
  cardQuickAddDescription: "Use the +",
  flagsTitle: "Flags",
  flagsDescription: "Chomesh and maaser",
  recurringTitle: "Recurring",
  recurringDescription: "Standing order",
  liveBalanceTitle: "Live",
  liveBalanceDescription: "Sidebar updates",
};

describe("buildFirstRunSteps", () => {
  it("drives Home targets including opening balance and card quick-add", () => {
    const steps = buildFirstRunSteps(copy, "rtl", "/");

    expect(steps.map((step) => getStepId(step))).toEqual([...HOME_STEP_IDS]);
    expect(steps[0]?.element).toBe(ONBOARDING_TARGETS.dateRange);
    expect(steps[2]?.element).toBe(ONBOARDING_TARGETS.openingBalance);
    expect(steps[3]?.advanceOnClick).toBe(true);
    expect(steps.every((step) => step.waitForElement === 5000)).toBe(true);
    expect(steps[3]?.popover?.side).toBe("left");
  });

  it("keeps form steps off the Home drive", () => {
    const formSteps = buildFirstRunSteps(copy, "rtl", "/add-transaction");

    expect(formSteps.map((step) => getStepId(step))).toEqual([...FORM_STEP_IDS]);
    expect(formSteps[0]?.element).toBe(ONBOARDING_TARGETS.transactionFlags);
    expect(formSteps[2]?.element).toBe(ONBOARDING_TARGETS.liveBalance);
  });

  it("flips interactive popover sides in LTR", () => {
    const steps = buildFirstRunSteps(copy, "ltr", "/");
    expect(steps[3]?.popover?.side).toBe("right");
  });

  it("resumes the Home tour after the opening-balance modal", () => {
    expect(firstRunStartIndex("/")).toBe(0);
    expect(firstRunStartIndex("/", "card-quick-add")).toBe(3);
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
