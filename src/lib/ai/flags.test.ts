import { beforeEach, describe, expect, it, vi } from "vitest";
import { AI_INTAKE_WEB_FLAG } from "./flags";

const isPostHogSupported = vi.fn();
const getPlatform = vi.fn();
const isFeatureEnabled = vi.fn();

vi.mock("@/lib/analytics/posthogClient", () => ({
  isPostHogSupported: () => isPostHogSupported(),
}));

vi.mock("@/lib/platformManager", () => ({
  getPlatform: () => getPlatform(),
}));

vi.mock("posthog-js", () => ({
  default: {
    isFeatureEnabled: (...args: unknown[]) => isFeatureEnabled(...args),
  },
}));

import { aiCallsAllowed, isAiIntakeEnabled, showAiIntakeUi } from "./flags";

beforeEach(() => {
  isPostHogSupported.mockReset();
  getPlatform.mockReset();
  isFeatureEnabled.mockReset();
});

describe("isAiIntakeEnabled", () => {
  it("stays off when the flag is missing", () => {
    getPlatform.mockReturnValue("web");
    isPostHogSupported.mockReturnValue(true);
    isFeatureEnabled.mockReturnValue(undefined);
    expect(isAiIntakeEnabled()).toBe(false);
    expect(isFeatureEnabled).toHaveBeenCalledWith(AI_INTAKE_WEB_FLAG);
  });

  it("stays off on desktop even if the flag is on", () => {
    getPlatform.mockReturnValue("desktop");
    isPostHogSupported.mockReturnValue(true);
    isFeatureEnabled.mockReturnValue(true);
    expect(isAiIntakeEnabled()).toBe(false);
    expect(isFeatureEnabled).not.toHaveBeenCalled();
  });

  it("turns on for web when the flag is exactly true", () => {
    getPlatform.mockReturnValue("web");
    isPostHogSupported.mockReturnValue(true);
    isFeatureEnabled.mockReturnValue(true);
    expect(isAiIntakeEnabled()).toBe(true);
  });

  it("hides the shell on desktop, while loading, and when signed out", () => {
    getPlatform.mockReturnValue("desktop");
    isPostHogSupported.mockReturnValue(true);
    isFeatureEnabled.mockReturnValue(true);
    expect(showAiIntakeUi("desktop", true)).toBe(false);
    expect(showAiIntakeUi("loading", true)).toBe(false);
    expect(showAiIntakeUi("web", false)).toBe(false);
    expect(isFeatureEnabled).not.toHaveBeenCalled();
  });

  it("does not call the network on desktop", () => {
    getPlatform.mockReturnValue("desktop");
    expect(aiCallsAllowed()).toBe(false);
    getPlatform.mockReturnValue("loading");
    expect(aiCallsAllowed()).toBe(false);
    getPlatform.mockReturnValue("web");
    expect(aiCallsAllowed()).toBe(true);
  });
});
