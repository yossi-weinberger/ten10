import { describe, expect, it, vi } from "vitest";
import type { Settings } from "@/lib/store";
import { PreferencesSyncService } from "./preferences-sync.service";

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {},
}));

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
      reminderEnabled: true,
      reminderDayOfMonth: 25,
      termsAcceptedVersion: "2026-09",
      mailingListConsent: true,
      lastSeenVersion: "0.7.5",
      autoLockTimeoutMinutes: 30,
      calendarType: "hebrew",
      showSecondaryDate: true,
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

  it("preserves current client preferences and rejects legacy keys", () => {
    const settings: Settings = {
      theme: "dark",
      language: "en",
      defaultCurrency: "USD",
      notifications: true,
      autoCalcChomesh: true,
      trackChomeshSeparately: true,
      recurringDonations: false,
      minMaaserPercentage: 12,
      reminderEnabled: true,
      reminderDayOfMonth: 25,
      termsAcceptedVersion: "2026-09",
      mailingListConsent: true,
      lastSeenVersion: "0.7.5",
      autoLockTimeoutMinutes: 30,
      calendarType: "hebrew",
      showSecondaryDate: true,
      onboarding: {
        version: 2,
        status: "completed",
        checklistDismissed: true,
        analyticsOpened: true,
      },
    };

    expect(
      PreferencesSyncService.extractClientPreferences({
        ...settings,
        maaserYearStart: "01-01",
        unexpectedPreference: true,
      } as Settings),
    ).toEqual({
      theme: "dark",
      language: "en",
      notifications: true,
      autoCalcChomesh: true,
      trackChomeshSeparately: true,
      recurringDonations: false,
      minMaaserPercentage: 12,
      autoLockTimeoutMinutes: 30,
      calendarType: "hebrew",
      showSecondaryDate: true,
      onboarding: {
        version: 2,
        status: "completed",
        checklistDismissed: true,
        analyticsOpened: true,
      },
    });
  });

  it("rejects invalid calendar preferences from persisted web data", () => {
    expect(
      PreferencesSyncService.extractClientPreferences({
        calendarType: "julian",
        showSecondaryDate: "yes",
      } as unknown as Settings),
    ).toEqual({});
  });
});
