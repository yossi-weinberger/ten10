import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {},
}));

import type { Settings } from "@/lib/store";
import { PreferencesSyncService } from "./preferences-sync.service";

describe("PreferencesSyncService.extractClientPreferences", () => {
  it("omits every setting backed by a dedicated profile column", () => {
    const settings: Settings = {
      theme: "dark",
      language: "en",
      defaultCurrency: "USD",
      notifications: true,
      autoCalcChomesh: true,
      trackChomeshSeparately: true,
      recurringDonations: false,
      minMaaserPercentage: 12,
      maaserYearStart: "01-01",
      reminderEnabled: true,
      reminderDayOfMonth: 25,
      termsAcceptedVersion: "2026-09",
      mailingListConsent: true,
      lastSeenVersion: "0.7.5",
      autoLockTimeoutMinutes: 30,
      onboarding: {
        version: 2,
        status: "completed",
        checklistDismissed: true,
        analyticsOpened: true,
      },
    };

    const preferences =
      PreferencesSyncService.extractClientPreferences(settings);

    expect(preferences).not.toHaveProperty("defaultCurrency");
    expect(preferences).not.toHaveProperty("reminderEnabled");
    expect(preferences).not.toHaveProperty("reminderDayOfMonth");
    expect(preferences).not.toHaveProperty("mailingListConsent");
    expect(preferences).not.toHaveProperty("lastSeenVersion");
    expect(preferences).not.toHaveProperty("termsAcceptedVersion");
  });

  it("preserves every current client preference including legacy fields", () => {
    const settings: Settings = {
      theme: "dark",
      language: "en",
      defaultCurrency: "USD",
      notifications: true,
      autoCalcChomesh: true,
      trackChomeshSeparately: true,
      recurringDonations: false,
      minMaaserPercentage: 12,
      maaserYearStart: "01-01",
      reminderEnabled: true,
      reminderDayOfMonth: 25,
      termsAcceptedVersion: "2026-09",
      mailingListConsent: true,
      lastSeenVersion: "0.7.5",
      autoLockTimeoutMinutes: 30,
      onboarding: {
        version: 2,
        status: "completed",
        checklistDismissed: true,
        analyticsOpened: true,
      },
    };

    expect(
      PreferencesSyncService.extractClientPreferences(settings),
    ).toEqual({
      theme: "dark",
      language: "en",
      notifications: true,
      autoCalcChomesh: true,
      trackChomeshSeparately: true,
      recurringDonations: false,
      minMaaserPercentage: 12,
      maaserYearStart: "01-01",
      autoLockTimeoutMinutes: 30,
      onboarding: {
        version: 2,
        status: "completed",
        checklistDismissed: true,
        analyticsOpened: true,
      },
    });
  });
});
