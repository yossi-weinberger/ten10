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
  checklistTitle: "Process",
  checklistDescription: "Review first",
  templateTitle: "Template",
  templateDescription: "Download it",
  uploadTitle: "Upload",
  uploadDescription: "Choose a file",
};

describe("buildImportTourSteps", () => {
  it("covers the prepare-screen import flow with previous on every step", () => {
    const steps = buildImportTourSteps(copy);

    expect(steps.map((step) => getStepId(step))).toEqual([...IMPORT_STEP_IDS]);
    expect(steps[0]?.element).toBe(ONBOARDING_TARGETS.importIntro);
    expect(steps[1]?.element).toBe(ONBOARDING_TARGETS.importChecklist);
    expect(steps[2]?.element).toBe(ONBOARDING_TARGETS.importTemplate);
    expect(steps[3]?.element).toBe(ONBOARDING_TARGETS.importUpload);
    expect(
      steps.every((step) => step.popover?.showButtons?.includes("previous")),
    ).toBe(true);
  });
});
