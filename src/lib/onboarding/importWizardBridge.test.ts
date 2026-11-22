import { describe, expect, it, vi } from "vitest";
import {
  importWizardScreenForStep,
  notifyOnboardingImportMappingNext,
  notifyOnboardingImportWizardScreen,
  subscribeOnboardingImportMappingNext,
  subscribeOnboardingImportWizardScreen,
} from "./importWizardBridge";

describe("import wizard bridge", () => {
  it("maps import steps to the upload or mapping screen", () => {
    expect(importWizardScreenForStep("import-intro")).toBe("upload");
    expect(importWizardScreenForStep("import-steps")).toBe("upload");
    expect(importWizardScreenForStep("import-upload")).toBe("upload");
    expect(importWizardScreenForStep("import-mapping")).toBe("mapping");
    expect(importWizardScreenForStep("import-review")).toBeNull();
    expect(importWizardScreenForStep("import-approve")).toBeNull();
    expect(importWizardScreenForStep("transaction-form")).toBeNull();
  });

  it("notifies subscribers of the requested screen", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeOnboardingImportWizardScreen(listener);

    notifyOnboardingImportWizardScreen("upload");
    expect(listener).toHaveBeenCalledWith("upload");

    unsubscribe();
    notifyOnboardingImportWizardScreen("mapping");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("notifies subscribers when the mapping step should advance", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeOnboardingImportMappingNext(listener);

    notifyOnboardingImportMappingNext();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    notifyOnboardingImportMappingNext();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
