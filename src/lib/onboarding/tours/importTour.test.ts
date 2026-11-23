import { describe, expect, it } from "vitest";
import { ONBOARDING_TARGETS } from "../constants";
import { IMPORT_TOUR_STEP_IDS } from "../types";
import { getStepId } from "./firstRun";
import { buildImportTourSteps } from "./importTour";

const copy = {
  next: "Next",
  prev: "Back",
  done: "Done",
  introTitle: "Import",
  introDescription: "Upload a file",
  stepsTitle: "Stages",
  stepsDescription: "Three stages",
  uploadTitle: "Upload",
  uploadDescription: "Choose a file",
  mappingTitle: "Mapping",
  mappingDescription: "Match columns",
  reviewTitle: "Review",
  reviewDescription: "Check rows",
  approveTitle: "Approve",
  approveDescription: "Then save",
};

describe("buildImportTourSteps", () => {
  it("walks the import process without the removed template step", () => {
    const steps = buildImportTourSteps(copy);
    const stepIds = steps.map((step) => getStepId(step));

    expect(stepIds).toEqual([...IMPORT_TOUR_STEP_IDS]);
    expect(stepIds).not.toContain("import-template");
    expect(steps).toHaveLength(6);
    expect(steps[0]?.element).toBe(ONBOARDING_TARGETS.importIntro);
    expect(steps[1]?.element).toBe(ONBOARDING_TARGETS.importSteps);
    expect(steps[2]?.element).toBe(ONBOARDING_TARGETS.importUpload);
    expect(steps[3]?.element).toBe(ONBOARDING_TARGETS.importMapping);
    expect(steps[4]?.element).toBe(ONBOARDING_TARGETS.importReview);
    expect(steps[5]?.element).toBe(ONBOARDING_TARGETS.importApprove);
    expect(steps[2]?.skipMissingElement).toBe(false);
    expect(steps[3]?.skipMissingElement).toBe(false);
    expect(steps[4]?.skipMissingElement).toBe(false);
    expect(steps[5]?.skipMissingElement).toBe(false);
    expect(steps[2]?.waitForElement).toBe(20000);
    expect(steps[3]?.waitForElement).toBe(20000);
    expect(steps[4]?.waitForElement).toBe(20000);
    expect(steps[5]?.waitForElement).toBe(20000);
    expect(steps.at(-1)?.popover?.nextBtnText).toBe("Done");
    expect(
      steps.every((step) => step.popover?.showButtons?.includes("previous")),
    ).toBe(true);
  });
});
