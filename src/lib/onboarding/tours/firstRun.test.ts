import { describe, expect, it } from "vitest";
import { ONBOARDING_TARGETS } from "../constants";
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
  homeSummaryTitle: "Summary",
  homeSummaryDescription: "See balances here",
  addCtaTitle: "Add a transaction",
  addCtaDescription: "Start here",
  formTitle: "Enter the transaction",
  formDescription: "Fill the form",
};

describe("buildFirstRunSteps", () => {
  it("uses stable selectors and interactive Driver.js options", () => {
    const steps = buildFirstRunSteps(copy, "rtl");

    expect(steps).toHaveLength(3);
    expect(steps[0]?.element).toBe(ONBOARDING_TARGETS.homeSummary);
    expect(steps[1]?.element).toBe(ONBOARDING_TARGETS.addTransactionCta);
    expect(steps[2]?.element).toBe(ONBOARDING_TARGETS.transactionForm);
    expect(steps[1]?.advanceOnClick).toBe(true);
    expect(steps[1]?.disableActiveInteraction).toBe(false);
    expect(steps[2]?.waitForElement).toBe(5000);
    expect(steps.every((step) => step.skipMissingElement)).toBe(true);
    expect(getStepId(steps[0]!)).toBe("home-summary");
    expect(steps[1]?.popover?.side).toBe("left");
  });

  it("flips the CTA popover side in LTR", () => {
    const steps = buildFirstRunSteps(copy, "ltr");
    expect(steps[1]?.popover?.side).toBe("right");
  });

  it("resumes the form step on the add-transaction route", () => {
    expect(firstRunStartIndex("/")).toBe(0);
    expect(firstRunStartIndex("/add-transaction")).toBe(2);
  });

  it("does not drive the tour on settings or other pages", () => {
    expect(shouldDriveFirstRunTour("/")).toBe(true);
    expect(shouldDriveFirstRunTour("/add-transaction")).toBe(true);
    expect(shouldDriveFirstRunTour("/settings")).toBe(false);
    expect(shouldDriveFirstRunTour("/analytics")).toBe(false);
  });
});
