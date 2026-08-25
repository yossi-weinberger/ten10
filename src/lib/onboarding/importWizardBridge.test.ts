import { describe, expect, it, vi } from "vitest";
import {
  importWizardScreenForStep,
  notifyOnboardingImportWizardScreen,
  subscribeOnboardingImportWizardScreen,
} from "./importWizardBridge";

describe("import wizard bridge", () => {
  it("maps import steps to the prepare or upload screen", () => {
    expect(importWizardScreenForStep("import-intro")).toBe("prepare");
    expect(importWizardScreenForStep("import-steps")).toBe("prepare");
    expect(importWizardScreenForStep("import-template")).toBe("prepare");
    expect(importWizardScreenForStep("import-upload")).toBe("upload");
    expect(importWizardScreenForStep("import-mapping")).toBe("upload");
    expect(importWizardScreenForStep("import-review")).toBe("upload");
    expect(importWizardScreenForStep("import-approve")).toBe("upload");
    expect(importWizardScreenForStep("transaction-form")).toBeNull();
  });

  it("notifies subscribers of the requested screen", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeOnboardingImportWizardScreen(listener);

    notifyOnboardingImportWizardScreen("upload");
    expect(listener).toHaveBeenCalledWith("upload");

    unsubscribe();
    notifyOnboardingImportWizardScreen("prepare");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
