export type OnboardingImportWizardScreen = "prepare" | "upload" | "mapping";

export type OnboardingImportReachedStep = "mapping" | "review";

type ImportWizardListener = (screen: OnboardingImportWizardScreen) => void;
type ImportAdvanceListener = () => void;
type ImportReachedListener = (step: OnboardingImportReachedStep) => void;

const screenListeners = new Set<ImportWizardListener>();
const uploadNextListeners = new Set<ImportAdvanceListener>();
const mappingNextListeners = new Set<ImportAdvanceListener>();
const reachedListeners = new Set<ImportReachedListener>();

let refreshTour: (() => void) | null = null;

const IMPORT_UPLOAD_STEP_IDS = new Set<string>(["import-upload"]);

export function importWizardScreenForStep(
  stepId: string | undefined,
): OnboardingImportWizardScreen | null {
  if (!stepId?.startsWith("import-")) return null;
  if (IMPORT_UPLOAD_STEP_IDS.has(stepId)) return "upload";
  if (stepId === "import-mapping") return "mapping";
  if (stepId === "import-review" || stepId === "import-approve") {
    return null;
  }
  return "prepare";
}

export function notifyOnboardingImportWizardScreen(
  screen: OnboardingImportWizardScreen,
): void {
  for (const listener of screenListeners) {
    listener(screen);
  }
}

export function subscribeOnboardingImportWizardScreen(
  handler: ImportWizardListener,
): () => void {
  screenListeners.add(handler);
  return () => {
    screenListeners.delete(handler);
  };
}

export function notifyOnboardingImportUploadNext(): void {
  for (const listener of uploadNextListeners) {
    listener();
  }
}

export function subscribeOnboardingImportUploadNext(
  handler: ImportAdvanceListener,
): () => void {
  uploadNextListeners.add(handler);
  return () => {
    uploadNextListeners.delete(handler);
  };
}

export function notifyOnboardingImportMappingNext(): void {
  for (const listener of mappingNextListeners) {
    listener();
  }
}

export function subscribeOnboardingImportMappingNext(
  handler: ImportAdvanceListener,
): () => void {
  mappingNextListeners.add(handler);
  return () => {
    mappingNextListeners.delete(handler);
  };
}

export function notifyOnboardingImportReached(
  step: OnboardingImportReachedStep,
): void {
  for (const listener of reachedListeners) {
    listener(step);
  }
}

export function subscribeOnboardingImportReached(
  handler: ImportReachedListener,
): () => void {
  reachedListeners.add(handler);
  return () => {
    reachedListeners.delete(handler);
  };
}

export function registerOnboardingTourRefresh(fn: (() => void) | null): void {
  refreshTour = fn;
}

export function requestOnboardingTourRefresh(): void {
  refreshTour?.();
}
