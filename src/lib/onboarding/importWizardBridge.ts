export type OnboardingImportWizardScreen = "prepare" | "upload";

type ImportWizardListener = (screen: OnboardingImportWizardScreen) => void;

const listeners = new Set<ImportWizardListener>();

const IMPORT_UPLOAD_STEP_IDS = new Set<string>([
  "import-upload",
  "import-mapping",
  "import-review",
  "import-approve",
]);

export function importWizardScreenForStep(
  stepId: string | undefined,
): OnboardingImportWizardScreen | null {
  if (!stepId?.startsWith("import-")) return null;
  return IMPORT_UPLOAD_STEP_IDS.has(stepId) ? "upload" : "prepare";
}

export function notifyOnboardingImportWizardScreen(
  screen: OnboardingImportWizardScreen,
): void {
  for (const listener of listeners) {
    listener(screen);
  }
}

export function subscribeOnboardingImportWizardScreen(
  handler: ImportWizardListener,
): () => void {
  listeners.add(handler);
  return () => {
    listeners.delete(handler);
  };
}
