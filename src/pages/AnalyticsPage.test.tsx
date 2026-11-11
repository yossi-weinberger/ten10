// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";
import { AnalyticsPage } from "./AnalyticsPage";

beforeAll(() => {
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(() => null),
    },
    writable: true,
  });
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

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
    categoryData: [],
    paymentMethodData: [],
    recipientsData: [],
    heatmapData: [],
    activeRecurring: [],
    recurringVsOnetimeData: [],
    categoryType: "expense",
    setCategoryType: vi.fn(),
    heatmapTypeGroup: "all",
    setHeatmapTypeGroup: vi.fn(),
    isLoadingCategory: false,
    categoryError: null,
    isLoadingPaymentMethod: false,
    paymentMethodError: null,
    isLoadingRecipients: false,
    recipientsError: null,
    isLoadingHeatmap: false,
    heatmapError: null,
    isLoadingRecurring: false,
    recurringError: null,
    isLoadingRecurringRatio: false,
    recurringRatioError: null,
    expenseCategoryTop: null,
    incomeCategoryTop: null,
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
  useMaaserYearSummary: vi.fn(() => ({
    summary: null,
    isLoading: false,
    error: null,
    canGoNext: false,
    goToPreviousYear: vi.fn(),
    goToNextYear: vi.fn(),
  })),
}));

vi.mock("@/components/analytics/MaaserYearSummaryCard", () => ({
  MaaserYearSummaryCard: () => null,
}));

vi.mock("@/components/analytics/CategoryBreakdownChart", () => ({
  CategoryBreakdownChart: () => null,
}));

vi.mock("@/components/analytics/RecurringForecastInsight", () => ({
  RecurringForecastInsight: () => null,
}));

vi.mock("@/components/analytics/PaymentMethodInsight", () => ({
  PaymentMethodInsight: () => null,
}));

vi.mock("@/components/analytics/RecurringRatioInsight", () => ({
  RecurringRatioInsight: () => null,
}));

vi.mock("@/components/analytics/DonationRecipientsInsight", () => ({
  DonationRecipientsInsight: () => null,
}));

vi.mock("@/components/analytics/InsightsSummaryRow", () => ({
  InsightsSummaryRow: () => null,
}));

vi.mock("@/components/analytics/TextInsightsCard", () => ({
  TextInsightsCard: () => null,
}));

vi.mock("@/components/analytics/TransactionHeatmap", () => ({
  TransactionHeatmap: () => null,
}));

vi.mock("@/lib/store", () => ({
  useDonationStore: <T,>(selector: (state: { settings: { defaultCurrency: string; showSecondaryDate: boolean } }) => T): T =>
    selector({
      settings: {
        defaultCurrency: "ILS",
        showSecondaryDate: false,
      },
    }),
}));

vi.mock("@/lib/calendar/calendar-preview", () => ({
  useEffectiveCalendarType: () => "gregorian",
  useCalendarPreview: (selector: (state: { preview: string | null; setPreview: (preview: string | null) => void; clearPreview: () => void }) => unknown) =>
    selector({
      preview: null,
      setPreview: vi.fn(),
      clearPreview: vi.fn(),
    }),
}));

vi.mock("@/lib/analytics/productAnalytics", () => ({
  trackProductEvent: vi.fn(),
}));

vi.mock("@/lib/analytics/export-pdf", () => ({
  generateAnalyticsPdf: vi.fn(),
  computeRecurringTotals: vi.fn(() => ({ expenses: 0, income: 0, donations: 0 })),
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => children,
  PieChart: () => null,
  Pie: () => null,
  Cell: () => null,
  BarChart: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  LineChart: () => null,
  Line: () => null,
}));

describe("AnalyticsPage PostHog masking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies ph-mask and data-ph-mask to page content root", () => {
    const { container } = render(<AnalyticsPage />);

    const maskedRoot = container.querySelector('div[data-ph-mask].ph-mask.ph-sensitive');
    expect(maskedRoot).toBeTruthy();
    expect(maskedRoot?.classList.contains("ph-mask")).toBe(true);
    expect(maskedRoot?.classList.contains("ph-sensitive")).toBe(true);
    expect(maskedRoot?.hasAttribute("data-ph-mask")).toBe(true);
  });
});
