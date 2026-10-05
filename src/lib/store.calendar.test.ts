import { beforeEach, describe, expect, it } from "vitest";
import {
  normalizeReminderCalendarType,
  useDonationStore,
} from "./store";

describe("calendar settings store behavior", () => {
  beforeEach(() => {
    useDonationStore.setState({
      settings: {
        ...useDonationStore.getState().settings,
        calendarType: "gregorian",
        showSecondaryDate: false,
      },
      serverMonthlyChartData: [
        {
          period_index: 1,
          period_start: "2026-09-01",
          period_end: "2026-10-01",
          period_key: "2026-09",
          cache_key: "gregorian:2026-09",
          income: 100,
          expenses: 20,
          donations: 10,
        },
      ],
      currentChartEndDate: "2026-09-01",
      serverMonthlyChartDataError: "failure",
      canLoadMoreChartData: false,
    });
  });

  it("clears only calendar-derived monthly chart state on calendar change", () => {
    const originalLastFetch = useDonationStore.getState().lastDbFetchTimestamp;

    useDonationStore.getState().updateSettings({ calendarType: "hebrew" });

    expect(useDonationStore.getState()).toMatchObject({
      serverMonthlyChartData: [],
      currentChartEndDate: null,
      serverMonthlyChartDataError: null,
      canLoadMoreChartData: true,
      lastDbFetchTimestamp: originalLastFetch,
    });
  });

  it("keeps monthly chart state when only secondary display changes", () => {
    useDonationStore.getState().updateSettings({ showSecondaryDate: true });

    expect(useDonationStore.getState()).toMatchObject({
      currentChartEndDate: "2026-09-01",
      canLoadMoreChartData: false,
    });
    expect(useDonationStore.getState().serverMonthlyChartData).toHaveLength(1);
  });

  it("deduplicates prepended chart periods by calendar-scoped cache key", () => {
    useDonationStore.getState().setServerMonthlyChartData(
      [
        {
          period_index: 1,
          period_start: "2026-09-01",
          period_end: "2026-10-01",
          period_key: "2026-09",
          cache_key: "gregorian:2026-09",
          income: 999,
          expenses: 999,
          donations: 999,
        },
        {
          period_index: 1,
          period_start: "2026-08-01",
          period_end: "2026-09-01",
          period_key: "2026-08",
          cache_key: "gregorian:2026-08",
          income: 50,
          expenses: 5,
          donations: 5,
        },
      ],
      true,
    );

    expect(
      useDonationStore
        .getState()
        .serverMonthlyChartData.map((item) => item.cache_key),
    ).toEqual([
      "gregorian:2026-08",
      "gregorian:2026-09",
    ]);
  });

  it("keeps reminder calendar independent from display calendar", () => {
    useDonationStore.getState().updateSettings({
      calendarType: "hebrew",
    });

    expect(useDonationStore.getState().settings).toMatchObject({
      calendarType: "hebrew",
      reminderCalendarType: "gregorian",
    });
  });

  it.each([
    [undefined, "gregorian"],
    [null, "gregorian"],
    ["julian", "gregorian"],
    ["gregorian", "gregorian"],
    ["hebrew", "hebrew"],
  ])(
    "normalizes persisted reminder calendar %s to %s",
    (value, expected) => {
      expect(normalizeReminderCalendarType(value)).toBe(expected);
    },
  );
});
