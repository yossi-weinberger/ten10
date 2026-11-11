// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AnalyticsPage } from "./AnalyticsPage";

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => undefined },
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user", email: "test@example.com" },
  }),
}));

vi.mock("@/contexts/PlatformContext", () => ({
  usePlatform: () => ({ platform: "web" }),
}));

vi.mock("@/hooks/useDateControls", () => ({
  useDateControls: () => ({
    dateRangeSelection: "month",
    setDateRangeSelection: vi.fn(),
    activeDateRangeObject: { from: "2026-11-01", to: "2026-11-30" },
    dateRangeLabels: {},
    customDateRange: null,
    setCustomDateRange: vi.fn(),
  }),
  isAllTimeRange: () => false,
}));

vi.mock("@/hooks/useInsights", () => ({
  useInsights: () => ({
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
    donationSum: 0,
    largestExpense: null,
    largestIncome: null,
    expenseCategories: [],
    incomeCategories: [],
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/hooks/useServerStats", () => ({
  useServerStats: () => ({
    serverTotalIncome: 0,
    isLoadingServerIncome: false,
    serverTotalExpenses: 0,
    isLoadingServerExpenses: false,
    serverCalculatedDonationsData: null,
  }),
}));

vi.mock("@/hooks/usePeriodComparison", () => ({
  usePeriodComparison: () => ({
    prevIncome: null,
    prevExpenses: null,
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useMaaserYearSummary", () => ({
  useMaaserYearSummary: () => ({
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/lib/store", () => ({
  useDonationStore: (selector: (state: any) => any) =>
    selector({
      settings: {
        defaultCurrency: "ILS",
        showSecondaryDate: false,
      },
    }),
}));

vi.mock("@/lib/calendar/calendar-preview", () => ({
  useEffectiveCalendarType: () => "gregorian",
}));

vi.mock("@/lib/analytics/productAnalytics", () => ({
  trackProductEvent: vi.fn(),
}));

vi.mock("@/fonts/Rubik-Regular.ttf?url", () => ({ default: "" }));
vi.mock("@/fonts/Rubik-Bold.ttf?url", () => ({ default: "" }));

describe("AnalyticsPage PostHog masking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies ph-mask and data-ph-mask to page content root", () => {
    const { container } = render(<AnalyticsPage />);

    const maskedRoot = container.querySelector('[data-ph-mask]');
    expect(maskedRoot).toBeTruthy();
    expect(maskedRoot?.classList.contains("ph-mask")).toBe(true);
    expect(maskedRoot?.classList.contains("ph-sensitive")).toBe(true);
  });
});
