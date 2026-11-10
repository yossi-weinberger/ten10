import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAiAccessCache, setCachedAiAccessForTests } from "./ai-access-cache";
import { AI_INTAKE_WEB_FLAG, aiCallsAllowed, isAiFeatureFlagEnabled, isAiIntakeEnabled, showAiIntakeUi } from "./flags";

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

beforeEach(() => {
  isPostHogSupported.mockReset();
  getPlatform.mockReset();
  isFeatureEnabled.mockReset();
  vi.stubEnv("VITE_AI_INTAKE_ENABLED", "true");
  clearAiAccessCache();
});

afterEach(() => {
  clearAiAccessCache();
  vi.unstubAllEnvs();
});

describe("isAiIntakeEnabled and kill-switch audit", () => {
  describe("when kill-switch is active (VITE_AI_INTAKE_ENABLED !== 'true')", () => {
    it("is completely disabled when env variable is missing or false", () => {
      vi.stubEnv("VITE_AI_INTAKE_ENABLED", "");
      expect(isAiFeatureFlagEnabled()).toBe(false);

      getPlatform.mockReturnValue("web");
      isPostHogSupported.mockReturnValue(true);
      isFeatureEnabled.mockReturnValue(true);

      expect(isAiIntakeEnabled()).toBe(false);
      expect(showAiIntakeUi("web", true)).toBe(false);
      expect(aiCallsAllowed()).toBe(false);
      expect(isFeatureEnabled).not.toHaveBeenCalled();

      vi.stubEnv("VITE_AI_INTAKE_ENABLED", "false");
      expect(isAiFeatureFlagEnabled()).toBe(false);
      expect(isAiIntakeEnabled()).toBe(false);
      expect(showAiIntakeUi("web", true)).toBe(false);
      expect(aiCallsAllowed()).toBe(false);
    });
  });

  describe("when kill-switch is inactive (VITE_AI_INTAKE_ENABLED === 'true')", () => {
    it("stays off when the PostHog flag is missing", () => {
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

    it("stays off until plan access arrives, even when the PostHog flag is on", () => {
      getPlatform.mockReturnValue("web");
      isPostHogSupported.mockReturnValue(true);
      isFeatureEnabled.mockReturnValue(true);
      expect(isAiIntakeEnabled()).toBe(false);
      expect(showAiIntakeUi("web", true)).toBe(false);
      expect(aiCallsAllowed()).toBe(false);
    });

    it("stays off when the signed-in user has no plan", () => {
      getPlatform.mockReturnValue("web");
      isPostHogSupported.mockReturnValue(true);
      isFeatureEnabled.mockReturnValue(true);
      setCachedAiAccessForTests("user-1", false);
      expect(isAiIntakeEnabled()).toBe(false);
      expect(showAiIntakeUi("web", true)).toBe(false);
      expect(aiCallsAllowed()).toBe(false);
    });

    it("turns on for web when the flag is exactly true and access is allowed", () => {
      getPlatform.mockReturnValue("web");
      isPostHogSupported.mockReturnValue(true);
      isFeatureEnabled.mockReturnValue(true);
      setCachedAiAccessForTests("user-1", true);
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

    it("does not call the network on desktop, while loading, or without a plan", () => {
      getPlatform.mockReturnValue("desktop");
      expect(aiCallsAllowed()).toBe(false);
      getPlatform.mockReturnValue("loading");
      expect(aiCallsAllowed()).toBe(false);
      getPlatform.mockReturnValue("web");
      expect(aiCallsAllowed()).toBe(false);
      setCachedAiAccessForTests("user-1", true);
      expect(aiCallsAllowed()).toBe(true);
    });
  });
});

