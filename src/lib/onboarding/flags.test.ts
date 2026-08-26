import { beforeEach, describe, expect, it, vi } from "vitest";
import { ONBOARDING_FEATURE_FLAG } from "./constants";

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

import { isNewUserOnboardingEnabled } from "./flags";

beforeEach(() => {
  isPostHogSupported.mockReset();
  getPlatform.mockReset();
  isFeatureEnabled.mockReset();
});

describe("isNewUserOnboardingEnabled", () => {
  it("fails closed on Web when the flag is missing or false", () => {
    isPostHogSupported.mockReturnValue(true);
    isFeatureEnabled.mockReturnValue(false);
    expect(isNewUserOnboardingEnabled()).toBe(false);
    expect(isFeatureEnabled).toHaveBeenCalledWith(ONBOARDING_FEATURE_FLAG);
  });

  it("is on for Desktop when PostHog is unsupported", () => {
    isPostHogSupported.mockReturnValue(false);
    getPlatform.mockReturnValue("desktop");
    expect(isNewUserOnboardingEnabled()).toBe(true);
    expect(isFeatureEnabled).not.toHaveBeenCalled();
  });

  it("stays off for Web when PostHog is unsupported", () => {
    isPostHogSupported.mockReturnValue(false);
    getPlatform.mockReturnValue("web");
    expect(isNewUserOnboardingEnabled()).toBe(false);
  });
});
