import { beforeEach, describe, expect, it, vi } from "vitest";

const { capture } = vi.hoisted(() => ({
  capture: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: { capture },
}));

vi.mock("@/lib/analytics/posthogClient", () => ({
  isPostHogSupported: () => true,
}));

vi.mock("@/lib/attribution/capture", () => ({
  attributionEventProperties: () => ({
    ref: "MACHON",
    utm_source: "institute",
    utm_medium: "email",
    utm_campaign: "update_2026",
  }),
}));

import { trackProductEvent } from "./productAnalytics";

describe("trackProductEvent", () => {
  beforeEach(() => {
    capture.mockReset();
  });

  it("attaches first-touch attribution to signup_completed", () => {
    trackProductEvent("signup_completed", {
      method: "email",
      requires_email_confirm: false,
    });
    expect(capture).toHaveBeenCalledWith("signup_completed", {
      platform: "web",
      ref: "MACHON",
      utm_source: "institute",
      utm_medium: "email",
      utm_campaign: "update_2026",
      method: "email",
      requires_email_confirm: false,
    });
  });

  it("does not attach attribution to other product events", () => {
    trackProductEvent("login_completed", { method: "email" });
    expect(capture).toHaveBeenCalledWith("login_completed", {
      platform: "web",
      method: "email",
    });
  });
});
