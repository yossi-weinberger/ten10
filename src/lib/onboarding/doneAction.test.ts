import { describe, expect, it } from "vitest";
import { resolveOnboardingDoneAction } from "./doneAction";

describe("resolveOnboardingDoneAction", () => {
  it("keeps the tour alive when Done is clicked on continue-to-form", () => {
    expect(resolveOnboardingDoneAction("continue-to-form")).toBe(
      "continue-to-form",
    );
  });

  it("advances unfinished import screens instead of ending the tour", () => {
    expect(resolveOnboardingDoneAction("import-upload")).toBe("advance");
    expect(resolveOnboardingDoneAction("import-mapping")).toBe("advance");
    expect(resolveOnboardingDoneAction("import-approve")).toBe("pause");
  });

  it("pauses on a normal last step", () => {
    expect(resolveOnboardingDoneAction("transaction-import")).toBe("pause");
    expect(resolveOnboardingDoneAction(undefined)).toBe("pause");
  });
});
