import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Settings } from "@/lib/store";
import { useDonationStore } from "@/lib/store";
import {
  buildReminderProfileUpdate,
  PreferencesSyncService,
} from "./preferences-sync.service";

const mocks = vi.hoisted(() => ({
  single: vi.fn(),
  updateEq: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mocks.single,
        }),
      }),
      update: () => ({
        eq: mocks.updateEq,
      }),
    }),
  },
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
      reminderCalendarType: "hebrew",
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
    expect(preferences).not.toHaveProperty("reminderCalendarType");
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
      reminderCalendarType: "hebrew",
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

describe("PreferencesSyncService reminder calendar profile sync", () => {
  beforeEach(() => {
    mocks.single.mockReset();
    mocks.updateEq.mockReset();
    mocks.updateEq.mockResolvedValue({ error: null });
    useDonationStore.setState((state) => ({
      settings: {
        ...state.settings,
        calendarType: "gregorian",
        reminderCalendarType: "gregorian",
      },
    }));
  });

  it("hydrates the dedicated reminder calendar without changing display calendar", async () => {
    mocks.single.mockResolvedValue({
      data: {
        client_preferences: {
          calendarType: "gregorian",
        },
        reminder_day_of_month: 10,
        reminder_enabled: true,
        reminder_calendar_type: "hebrew",
        mailing_list_consent: true,
      },
      error: null,
    });

    await PreferencesSyncService.syncPreferences("user-1");

    expect(useDonationStore.getState().settings).toMatchObject({
      calendarType: "gregorian",
      reminderCalendarType: "hebrew",
    });
  });

  it("uses the database Gregorian default over stale local Hebrew state", async () => {
    useDonationStore.getState().updateSettings({
      reminderCalendarType: "hebrew",
    });
    mocks.single.mockResolvedValue({
      data: {
        client_preferences: { theme: "dark" },
        reminder_day_of_month: 10,
        reminder_enabled: false,
        reminder_calendar_type: "gregorian",
        mailing_list_consent: false,
      },
      error: null,
    });

    await PreferencesSyncService.syncPreferences("user-1");

    expect(
      useDonationStore.getState().settings.reminderCalendarType,
    ).toBe("gregorian");
  });

  it("maps reminder settings to dedicated profile columns for round-trip writes", () => {
    expect(
      buildReminderProfileUpdate({
        reminderEnabled: true,
        reminderDayOfMonth: 15,
        reminderCalendarType: "hebrew",
        mailingListConsent: true,
      }),
    ).toEqual({
      reminder_enabled: true,
      reminder_day_of_month: 15,
      reminder_calendar_type: "hebrew",
      mailing_list_consent: true,
    });
  });
});
