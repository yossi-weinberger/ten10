import { beforeEach, describe, expect, it } from "vitest";
import { useDonationStore } from "./store";

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
          month_label: "2026-09",
          income: 100,
          expenses: 20,
          donations: 10,
        },
      ],
      currentChartEndDate: "2026-09-01",
      canLoadMoreChartData: false,
    });
  });

  it("clears only calendar-derived monthly chart state on calendar change", () => {
    const originalLastFetch = useDonationStore.getState().lastDbFetchTimestamp;

    useDonationStore.getState().updateSettings({ calendarType: "hebrew" });

    expect(useDonationStore.getState()).toMatchObject({
      serverMonthlyChartData: [],
      currentChartEndDate: null,
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
});
