// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/utils/currency";
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
    dateRangeLabels: {
      today: "Today",
      week: "This week",
      month: "This month",
      year: "This year",
      all: "All time",
      custom: "Custom range",
    },
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
    categoryData: [{ category: "Groceries", total_amount: 50 }],
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
    serverTotalIncome: 200,
    isLoadingServerIncome: false,
    serverTotalExpenses: 50,
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
  Bar: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  LineChart: () => null,
  Line: () => null,
  BarChart: ({
    children,
    data,
  }: {
    children?: React.ReactNode;
    data?: Array<{ label?: string }>;
  }) => (
    <div>
      {data?.map((item) => (
        <span key={item.label}>{item.label}</span>
      ))}
      {children}
    </div>
  ),
  XAxis: ({ tickFormatter }: { tickFormatter?: (value: number) => string }) => (
    <span>{tickFormatter?.(50)}</span>
  ),
}));

describe("AnalyticsPage PostHog masking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("masks personal values without masking the page chrome", () => {
    render(
      <TooltipProvider>
        <AnalyticsPage />
      </TooltipProvider>,
    );

    const title = screen.getByRole("heading", { level: 2, name: "analytics.title" });
    const root = title.parentElement?.parentElement;
    expect(root?.classList.contains("grid")).toBe(true);
    expect(root?.classList.contains("ph-mask")).toBe(false);
    expect(root?.classList.contains("ph-sensitive")).toBe(false);
    expect(root?.hasAttribute("data-ph-mask")).toBe(false);

    expect(title.closest("[data-ph-mask]")).toBeNull();
    expect(screen.getByRole("button", { name: "Custom range" }).closest("[data-ph-mask]")).toBeNull();
    expect(screen.getByRole("button", { name: "This month" }).closest("[data-ph-mask]")).toBeNull();
    expect(screen.getByRole("button", { name: "analytics.exportPdf" }).closest("[data-ph-mask]")).toBeNull();
    expect(screen.getByText("analytics.categories.title").closest("[data-ph-mask]")).toBeNull();
    expect(screen.getByText("analytics.categories.tabExpenses").closest("[data-ph-mask]")).toBeNull();

    const statValue = screen.getByText("75.0%");
    const statMask = statValue.closest("[data-ph-mask]");
    expect(statMask).toBeTruthy();
    expect(statMask?.classList.contains("ph-mask")).toBe(true);
    expect(statMask?.classList.contains("ph-sensitive")).toBe(true);

    const categoryName = screen.getByText("Groceries");
    const categoryMask = categoryName.closest("[data-ph-mask]");
    expect(categoryMask).toBeTruthy();
    expect(categoryMask?.classList.contains("ph-mask")).toBe(true);
    expect(categoryMask?.classList.contains("ph-sensitive")).toBe(true);

    const chartValue = screen.getByText(formatCurrency(50, "ILS", "en"));
    const chartMask = chartValue.closest("[data-ph-mask]");
    expect(chartMask).toBeTruthy();
    expect(chartMask?.classList.contains("ph-mask")).toBe(true);
    expect(chartMask?.classList.contains("ph-sensitive")).toBe(true);
    expect(chartMask?.contains(categoryName)).toBe(true);
  });
});
