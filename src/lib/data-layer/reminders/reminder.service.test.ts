import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDonationStore } from "@/lib/store";
import { checkAndSendDesktopReminder } from "./reminder.service";

const mocks = vi.hoisted(() => ({
  fetchServerTitheBalance: vi.fn(),
  showDesktopNotification: vi.fn(),
}));

vi.mock("../analytics.service", () => ({
  fetchServerTitheBalance: mocks.fetchServerTitheBalance,
}));

vi.mock("./notification.service", () => ({
  showDesktopNotification: mocks.showDesktopNotification,
}));

describe("desktop reminder calendar", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2027, 1, 8, 12));
    storage.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
    mocks.fetchServerTitheBalance.mockReset();
    mocks.fetchServerTitheBalance.mockResolvedValue({ total_balance: 100 });
    mocks.showDesktopNotification.mockReset();
    mocks.showDesktopNotification.mockResolvedValue(undefined);
    useDonationStore.setState((state) => ({
      settings: {
        ...state.settings,
        calendarType: "gregorian",
        reminderCalendarType: "hebrew",
        reminderDayOfMonth: 1,
        reminderEnabled: true,
      },
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("sends on the selected Hebrew day when the Gregorian day differs", async () => {
    await checkAndSendDesktopReminder(vi.fn((key) => key));

    expect(mocks.showDesktopNotification).toHaveBeenCalledOnce();
    expect(storage.get("lastReminderDate")).toBe("2027-02-08");
  });

  it("does not send the Hebrew cohort on a Gregorian-only due date", async () => {
    vi.setSystemTime(new Date(2027, 1, 1, 12));

    await checkAndSendDesktopReminder(vi.fn((key) => key));

    expect(mocks.showDesktopNotification).not.toHaveBeenCalled();
  });

  it("sends the maaser-year close reminder on 29 Elul even when the monthly day differs", async () => {
    vi.setSystemTime(new Date(2026, 8, 11, 12));
    useDonationStore.setState((state) => ({
      settings: {
        ...state.settings,
        reminderDayOfMonth: 1,
        reminderCalendarType: "gregorian",
      },
    }));

    await checkAndSendDesktopReminder(vi.fn((key) => key));

    expect(mocks.showDesktopNotification).toHaveBeenCalledOnce();
    expect(mocks.showDesktopNotification.mock.calls[0]?.[0]).toMatchObject({
      title: "reminders.maaserYear.title",
    });
    expect(storage.get("lastReminderDate")).toBe("2026-09-11");
  });

  it("keeps the deduplication key as the Gregorian local civil ISO date", async () => {
    storage.set("lastReminderDate", "2027-02-08");

    await checkAndSendDesktopReminder(vi.fn((key) => key));

    expect(mocks.fetchServerTitheBalance).not.toHaveBeenCalled();
    expect(mocks.showDesktopNotification).not.toHaveBeenCalled();
  });
});
