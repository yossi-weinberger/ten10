import { describe, expect, it } from "vitest";
import { CURRENT_ONBOARDING_VERSION } from "./constants";
import {
  isOnboardingEligible,
  resolveTransactionOnboardingOutcome,
} from "./eligibility";
import type { OnboardingEligibilityInput } from "./types";

function webInput(
  overrides: Partial<OnboardingEligibilityInput> = {},
): OnboardingEligibilityInput {
  return {
    platform: "web",
    userCreatedAt: "2026-08-24T00:00:00.000Z",
    termsAccepted: true,
    transactionCount: 0,
    flagEnabled: true,
    onboarding: { version: null, status: "idle" },
    currentVersion: CURRENT_ONBOARDING_VERSION,
    ...overrides,
  };
}

describe("isOnboardingEligible", () => {
  it("offers onboarding to a new eligible Web user", () => {
    expect(isOnboardingEligible(webInput())).toBe(true);
  });

  it("rejects an old empty Web user created before launch", () => {
    expect(
      isOnboardingEligible(
        webInput({ userCreatedAt: "2026-08-23T23:59:59.999Z" }),
      ),
    ).toBe(false);
  });

  it("rejects a user with transactions", () => {
    expect(isOnboardingEligible(webInput({ transactionCount: 1 }))).toBe(false);
  });

  it.each(["skipped", "completed"] as const)(
    "rejects a user who %s the current version",
    (status) => {
      expect(
        isOnboardingEligible(
          webInput({
            onboarding: {
              version: CURRENT_ONBOARDING_VERSION,
              status,
            },
          }),
        ),
      ).toBe(false);
    },
  );

  it.each(["skipped", "completed"] as const)(
    "offers the current version after a prior version was %s",
    (status) => {
      expect(
        isOnboardingEligible(
          webInput({ onboarding: { version: 0, status } }),
        ),
      ).toBe(true);
    },
  );

  it("rejects a user who has not accepted the terms", () => {
    expect(isOnboardingEligible(webInput({ termsAccepted: false }))).toBe(false);
  });

  it("fails closed when the Web feature flag is off", () => {
    expect(isOnboardingEligible(webInput({ flagEnabled: false }))).toBe(false);
  });

  it("offers onboarding on Desktop without a user creation timestamp", () => {
    expect(
      isOnboardingEligible(
        webInput({
          platform: "desktop",
          userCreatedAt: null,
          flagEnabled: false,
        }),
      ),
    ).toBe(true);
  });

  it("does not re-offer Welcome after the current version was started", () => {
    expect(
      isOnboardingEligible(
        webInput({
          onboarding: {
            version: CURRENT_ONBOARDING_VERSION,
            status: "started",
          },
        }),
      ),
    ).toBe(false);
  });
});

describe("resolveTransactionOnboardingOutcome", () => {
  it("shows a success dialog only while the tour is active", () => {
    expect(
      resolveTransactionOnboardingOutcome({
        status: "started",
        tourActive: true,
      }),
    ).toBe("success_dialog");
  });

  it("completes silently when started without an active tour", () => {
    expect(
      resolveTransactionOnboardingOutcome({
        status: "started",
        tourActive: false,
      }),
    ).toBe("silent_complete");
  });

  it("leaves a skipped user unchanged after a later transaction", () => {
    expect(
      resolveTransactionOnboardingOutcome({
        status: "skipped",
        tourActive: true,
      }),
    ).toBe("ignore");
  });
});
