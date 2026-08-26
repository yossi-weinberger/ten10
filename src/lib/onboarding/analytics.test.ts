import { beforeEach, describe, expect, it, vi } from "vitest";
import { CURRENT_ONBOARDING_VERSION, ONBOARDING_TOUR_ID } from "./constants";

const trackProductEvent = vi.fn();

vi.mock("@/lib/analytics/productAnalytics", () => ({
  trackProductEvent: (...args: unknown[]) => trackProductEvent(...args),
}));

import {
  trackOnboardingCompleted,
  trackOnboardingOffered,
  trackOnboardingRestarted,
  trackOnboardingSkipped,
  trackOnboardingStarted,
  trackOnboardingStepCompleted,
  trackOnboardingStepViewed,
} from "./analytics";

beforeEach(() => {
  trackProductEvent.mockReset();
});

describe("onboarding analytics", () => {
  it("emits the typed product events without financial properties", () => {
    trackOnboardingOffered();
    trackOnboardingStarted();
    trackOnboardingStepViewed("tithe-balance");
    trackOnboardingStepCompleted("opening-balance");
    trackOnboardingSkipped("card-quick-add");
    trackOnboardingCompleted();
    trackOnboardingRestarted();

    expect(trackProductEvent).toHaveBeenCalledTimes(7);
    expect(trackProductEvent).toHaveBeenNthCalledWith(1, "onboarding_offered", {
      version: CURRENT_ONBOARDING_VERSION,
    });
    expect(trackProductEvent).toHaveBeenNthCalledWith(2, "onboarding_started", {
      version: CURRENT_ONBOARDING_VERSION,
      tour_id: ONBOARDING_TOUR_ID,
    });
    expect(trackProductEvent).toHaveBeenNthCalledWith(
      3,
      "onboarding_step_viewed",
      {
        version: CURRENT_ONBOARDING_VERSION,
        tour_id: ONBOARDING_TOUR_ID,
        step_id: "tithe-balance",
      },
    );
    expect(trackProductEvent).toHaveBeenNthCalledWith(7, "onboarding_restarted", {
      version: CURRENT_ONBOARDING_VERSION,
    });

    for (const [, props] of trackProductEvent.mock.calls) {
      expect(JSON.stringify(props)).not.toMatch(/amount|description|recipient|email/i);
    }
  });
});
