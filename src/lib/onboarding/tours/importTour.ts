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

const IMPORT_STEP_WAIT_MS = 5000;
const IMPORT_SCREEN_WAIT_MS = 20000;

function importStep(
  stepId: string,
  element: string | undefined,
  title: string,
  description: string,
  copy: Pick<FirstRunCopy, "next" | "prev">,
  nextBtnText?: string,
  doneBtnText?: string,
  waitForElementMs = IMPORT_STEP_WAIT_MS,
): DriveStep {
  return {
    ...(element ? { element } : {}),
    skipMissingElement: true,
    waitForElement: element ? waitForElementMs : undefined,
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
      ONBOARDING_TARGETS.importMapping,
      copy.mappingTitle,
      copy.mappingDescription,
      nav,
      undefined,
      undefined,
      IMPORT_SCREEN_WAIT_MS,
    ),
    importStep(
      "import-review",
      ONBOARDING_TARGETS.importReview,
      copy.reviewTitle,
      copy.reviewDescription,
      nav,
      undefined,
      undefined,
      IMPORT_SCREEN_WAIT_MS,
    ),
    importStep(
      "import-approve",
      ONBOARDING_TARGETS.importApprove,
      copy.approveTitle,
      copy.approveDescription,
      nav,
      copy.done,
      copy.done,
      IMPORT_SCREEN_WAIT_MS,
    ),
  ];
}
