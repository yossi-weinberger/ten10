import { beforeEach, describe, expect, it, vi } from "vitest";
import { CURRENT_ONBOARDING_VERSION, ONBOARDING_TOUR_ACTIVE_KEY } from "./constants";
import {
  completeOnboarding,
  isOnboardingTourActive,
  restartOnboarding,
  setOnboardingTourActive,
  skipOnboarding,
  startOnboarding,
  updateOnboardingChecklist,
} from "./persistence";
import type { OnboardingState } from "./types";

const mocks = vi.hoisted(() => ({
  settings: {
    theme: "dark",
    language: "he",
    onboarding: { version: null, status: "idle" } as OnboardingState,
  },
  updateSettings: vi.fn(),
}));

vi.mock("@/lib/store", () => ({
  useDonationStore: {
    getState: () => ({
      settings: mocks.settings,
      updateSettings: mocks.updateSettings,
    }),
  },
}));

function createSessionStorage() {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  };
}

beforeEach(() => {
  mocks.settings.onboarding = { version: null, status: "idle" };
  mocks.updateSettings.mockReset();
  mocks.updateSettings.mockImplementation((update) => {
    Object.assign(mocks.settings, update);
  });
  vi.stubGlobal("sessionStorage", createSessionStorage());
});

describe("onboarding persistence", () => {
  it("starts onboarding through the local settings store only", () => {
    startOnboarding();

    expect(mocks.updateSettings).toHaveBeenCalledWith({
      onboarding: {
        version: CURRENT_ONBOARDING_VERSION,
        status: "started",
      },
    });
    expect(mocks.settings.theme).toBe("dark");
    expect(mocks.settings.language).toBe("he");
  });

  it("supports skip, complete, and restart transitions", () => {
    skipOnboarding();
    expect(mocks.settings.onboarding.status).toBe("skipped");

    completeOnboarding();
    expect(mocks.settings.onboarding.status).toBe("completed");

    restartOnboarding();
    expect(mocks.settings.onboarding).toMatchObject({
      version: CURRENT_ONBOARDING_VERSION,
      status: "started",
    });
    expect(mocks.updateSettings).toHaveBeenCalledTimes(3);
  });

  it("merges checklist updates without replacing onboarding state", () => {
    mocks.settings.onboarding = {
      version: CURRENT_ONBOARDING_VERSION,
      status: "started",
      analyticsOpened: true,
    };

    updateOnboardingChecklist({ checklistDismissed: true });

    expect(mocks.updateSettings).toHaveBeenCalledWith({
      onboarding: {
        version: CURRENT_ONBOARDING_VERSION,
        status: "started",
        analyticsOpened: true,
        checklistDismissed: true,
      },
    });
  });

  it("stores only a boolean tour-active session marker", () => {
    setOnboardingTourActive(true);
    expect(sessionStorage.getItem(ONBOARDING_TOUR_ACTIVE_KEY)).toBe("true");
    expect(isOnboardingTourActive()).toBe(true);

    setOnboardingTourActive(false);
    expect(sessionStorage.getItem(ONBOARDING_TOUR_ACTIVE_KEY)).toBeNull();
    expect(isOnboardingTourActive()).toBe(false);
  });
});
