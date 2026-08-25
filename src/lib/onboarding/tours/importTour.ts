import type { DriveStep } from "driver.js";
import { ONBOARDING_TARGETS } from "../constants";
import { tourNavButtons, type FirstRunCopy } from "./firstRun";

export interface ImportTourCopy {
  next: string;
  prev: string;
  done: string;
  introTitle: string;
  introDescription: string;
  stepsTitle: string;
  stepsDescription: string;
  checklistTitle: string;
  checklistDescription: string;
  templateTitle: string;
  templateDescription: string;
  uploadTitle: string;
  uploadDescription: string;
  mappingTitle: string;
  mappingDescription: string;
  reviewTitle: string;
  reviewDescription: string;
  approveTitle: string;
  approveDescription: string;
}

function importStep(
  stepId: string,
  element: string | undefined,
  title: string,
  description: string,
  copy: Pick<FirstRunCopy, "next" | "prev">,
  nextBtnText?: string,
  doneBtnText?: string,
): DriveStep {
  return {
    ...(element ? { element } : {}),
    skipMissingElement: true,
    waitForElement: element ? 5000 : undefined,
    data: { stepId },
    popover: {
      title,
      description,
      side: "bottom",
      align: "start",
      ...tourNavButtons(copy, nextBtnText ?? copy.next),
      doneBtnText,
    },
  };
}

export function buildImportTourSteps(copy: ImportTourCopy): DriveStep[] {
  const nav = { next: copy.next, prev: copy.prev };
  return [
    importStep(
      "import-intro",
      ONBOARDING_TARGETS.importIntro,
      copy.introTitle,
      copy.introDescription,
      nav,
    ),
    importStep(
      "import-steps",
      ONBOARDING_TARGETS.importSteps,
      copy.stepsTitle,
      copy.stepsDescription,
      nav,
    ),
    importStep(
      "import-checklist",
      ONBOARDING_TARGETS.importChecklist,
      copy.checklistTitle,
      copy.checklistDescription,
      nav,
    ),
    importStep(
      "import-template",
      ONBOARDING_TARGETS.importTemplate,
      copy.templateTitle,
      copy.templateDescription,
      nav,
    ),
    importStep(
      "import-upload",
      ONBOARDING_TARGETS.importUpload,
      copy.uploadTitle,
      copy.uploadDescription,
      nav,
    ),
    importStep(
      "import-mapping",
      undefined,
      copy.mappingTitle,
      copy.mappingDescription,
      nav,
    ),
    importStep(
      "import-review",
      undefined,
      copy.reviewTitle,
      copy.reviewDescription,
      nav,
    ),
    importStep(
      "import-approve",
      undefined,
      copy.approveTitle,
      copy.approveDescription,
      nav,
      copy.done,
      copy.done,
    ),
  ];
}
