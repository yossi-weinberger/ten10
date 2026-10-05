// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCalendarPreview } from "@/lib/calendar/calendar-preview";
import type { CalendarType } from "@/lib/calendar";
import type { MonthlyDataPoint } from "@/lib/data-layer/chart.service";
import { useDonationStore } from "@/lib/store";
import { MonthlyChart } from "./MonthlyChart";

const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/data-layer/chart.service", () => ({
  fetchServerMonthlyChartData: (...args: unknown[]) => fetchMock(...args),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/contexts/PlatformContext", () => ({
  usePlatform: () => ({ platform: "web" }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "he", dir: () => "rtl" },
  }),
}));

vi.mock("@/components/charts/area-chart-interactive", () => ({
  AreaChartInteractive: () => <div data-testid="monthly-chart" />,
}));

function periodFor(calendarType: CalendarType): MonthlyDataPoint {
  return calendarType === "hebrew"
    ? {
        period_index: 1,
        period_start: "2026-09-12",
        period_end: "2026-10-12",
        period_key: "5787-01",
        cache_key: "hebrew:5787-01",
        income: 100,
        donations: 10,
        expenses: 20,
      }
    : {
        period_index: 1,
        period_start: "2026-09-01",
        period_end: "2026-10-01",
        period_key: "2026-09",
        cache_key: "gregorian:2026-09",
        income: 100,
        donations: 10,
        expenses: 20,
      };
}

describe("MonthlyChart calendar reload", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(
      async (
        _userId: string | null,
        _boundaries: readonly string[],
        calendarType: CalendarType,
      ) => [periodFor(calendarType)],
    );
    useCalendarPreview.setState({ preview: null });
    useDonationStore.setState({
      settings: {
        ...useDonationStore.getState().settings,
        calendarType: "hebrew",
      },
      serverMonthlyChartData: [],
      currentChartEndDate: null,
      isLoadingServerMonthlyChartData: false,
      serverMonthlyChartDataError: null,
      canLoadMoreChartData: true,
    });
  });

  afterEach(cleanup);

  it("refetches bucketed chart data when the session calendar flips", async () => {
    render(<MonthlyChart />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(useDonationStore.getState().serverMonthlyChartData).toEqual([
        periodFor("hebrew"),
      ]);
    });
    expect(fetchMock.mock.calls[0]?.[2]).toBe("hebrew");

    useCalendarPreview.getState().setPreview("gregorian");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(useDonationStore.getState().serverMonthlyChartData).toEqual([
        periodFor("gregorian"),
      ]);
    });
    expect(fetchMock.mock.calls[1]?.[2]).toBe("gregorian");
  });
});
