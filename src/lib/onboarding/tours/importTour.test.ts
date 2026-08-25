import { describe, expect, it } from "vitest";
import { ONBOARDING_TARGETS } from "../constants";
import { IMPORT_STEP_IDS } from "../types";
import { getStepId } from "./firstRun";
import { buildImportTourSteps } from "./importTour";

const copy = {
  next: "Next",
  prev: "Back",
  done: "Done",
  introTitle: "Import",
  introDescription: "Upload a file",
  stepsTitle: "Stages",
  stepsDescription: "Four stages",
  checklistTitle: "Process",
  checklistDescription: "Review first",
  templateTitle: "Template",
  templateDescription: "Download it",
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
  it("walks the full import process including mapping, review, and approve", () => {
    const steps = buildImportTourSteps(copy);

    expect(steps.map((step) => getStepId(step))).toEqual([...IMPORT_STEP_IDS]);
    expect(steps[0]?.element).toBe(ONBOARDING_TARGETS.importIntro);
    expect(steps[1]?.element).toBe(ONBOARDING_TARGETS.importSteps);
    expect(steps[2]?.element).toBe(ONBOARDING_TARGETS.importChecklist);
    expect(steps[3]?.element).toBe(ONBOARDING_TARGETS.importTemplate);
    expect(steps[4]?.element).toBe(ONBOARDING_TARGETS.importUpload);
    expect(steps[5]?.element).toBe(ONBOARDING_TARGETS.importMapping);
    expect(steps[6]?.element).toBe(ONBOARDING_TARGETS.importReview);
    expect(steps[7]?.element).toBe(ONBOARDING_TARGETS.importApprove);
    expect(steps.at(-1)?.popover?.nextBtnText).toBe("Done");
    expect(
      steps.every((step) => step.popover?.showButtons?.includes("previous")),
    ).toBe(true);
  });
});
