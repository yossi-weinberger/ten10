// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionsFilters } from "./TransactionsFilters";
import { useTableTransactionsStore } from "@/lib/tableTransactions/tableTransactions.store";
import { usePlatform } from "@/contexts/PlatformContext";

vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("@/lib/utils/export-pdf", () => ({ exportTransactionsToPDF: vi.fn() }));

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { dir: () => "ltr", language: "en" },
  }),
}));

vi.mock("@/components/ui/date-range-picker", () => ({
  DatePickerWithRange: () => <div data-testid="date-range-picker">Date Range Picker</div>,
}));

vi.mock("@/lib/ai/flags", () => ({
  isAiIntakeEnabled: () => false,
}));

vi.mock("@/lib/data-layer", () => ({
  getPaymentMethodCacheVersion: () => 1,
  getUserPaymentMethods: () => Promise.resolve([]),
}));

vi.mock("@/lib/payment-methods", () => ({
  getPaymentMethodAliases: () => [],
  mergePaymentMethodOptions: (predefined: unknown[]) => predefined,
  normalizePaymentMethodValue: (value: string) => value,
  PAYMENT_METHOD_PRIORITY: ["cash", "card"],
  formatPaymentMethod: (method: string) => method,
  isPredefinedPaymentMethod: () => true,
}));

vi.mock("@/lib/tableTransactions/tableTransactions.store");
vi.mock("@/contexts/PlatformContext");
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: vi.fn(),
}));

describe("TransactionsFilters", () => {
  const defaultFilters = {
    search: "",
    dateRange: { from: null, to: null },
    types: [],
    paymentMethods: [],
    isRecurring: "all" as const,
    origin: "all" as const,
    recurringStatuses: [],
    recurringFrequencies: [],
  };

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePlatform).mockReturnValue({
      platform: "web" as const,
    });

    vi.mocked(useTableTransactionsStore).mockImplementation(
      (selector: unknown) => {
        const state = {
          filters: defaultFilters,
          setFilters: vi.fn(),
          resetFiltersState: vi.fn(),
          fetchTransactions: vi.fn(),
        };
        return typeof selector === "function" ? selector(state) : state;
      }
    );
  });

  describe("Mobile behavior", () => {
    beforeEach(async () => {
      vi.clearAllMocks();
      const { useMediaQuery } = await import("@/hooks/use-media-query");
      vi.mocked(useMediaQuery).mockReturnValue(true);

      vi.mocked(usePlatform).mockReturnValue({
        platform: "web" as const,
      });

      vi.mocked(useTableTransactionsStore).mockImplementation(
        (selector: unknown) => {
          const state = {
            filters: defaultFilters,
            setFilters: vi.fn(),
            resetFiltersState: vi.fn(),
            fetchTransactions: vi.fn(),
          };
          return typeof selector === "function" ? selector(state) : state;
        }
      );
    });

    it("renders in collapsed state by default on mobile", () => {
      render(<TransactionsFilters />);

      expect(screen.getByPlaceholderText("filters.searchPlaceholder")).toBeInTheDocument();
      expect(screen.getByText("filters.showFilters")).toBeInTheDocument();
      expect(screen.queryByText("filters.hideFilters")).not.toBeInTheDocument();
      expect(screen.queryByText("filters.dateRange")).not.toBeInTheDocument();
    });

    it("shows active filter count badge with accessible name", () => {
      vi.mocked(useTableTransactionsStore).mockImplementationOnce(
        (selector: unknown) => {
          const state = {
            filters: {
              search: "",
              dateRange: { from: "2024-01-01", to: "2024-12-31" },
              types: ["income", "expense"],
              paymentMethods: ["cash"],
              isRecurring: "all" as const,
              origin: "all" as const,
              recurringStatuses: [],
              recurringFrequencies: [],
            },
            setFilters: vi.fn(),
            resetFiltersState: vi.fn(),
            fetchTransactions: vi.fn(),
          };
          return typeof selector === "function" ? selector(state) : state;
        }
      );

      render(<TransactionsFilters />);

      const badge = screen.getByText("3");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute("aria-hidden", "true");

      const showButton = screen.getByText("filters.showFilters");
      expect(showButton).toHaveAttribute("aria-label", "filters.showFilters (3)");
    });

    it("expands filters when Filter button is clicked and has aria-expanded", async () => {
      const user = userEvent.setup();
      render(<TransactionsFilters />);

      const showButton = screen.getByText("filters.showFilters");
      expect(showButton).toHaveAttribute("aria-expanded", "false");

      await user.click(showButton);

      expect(screen.getByText("filters.hideFilters")).toBeInTheDocument();
      const hideButton = screen.getByText("filters.hideFilters");
      expect(hideButton).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByText("filters.dateRange")).toBeInTheDocument();
    });

    it("collapses filters when Hide button is clicked", async () => {
      const user = userEvent.setup();
      render(<TransactionsFilters />);

      await user.click(screen.getByText("filters.showFilters"));
      expect(screen.getByText("filters.hideFilters")).toBeInTheDocument();

      await user.click(screen.getByText("filters.hideFilters"));

      expect(screen.queryByText("filters.hideFilters")).not.toBeInTheDocument();
      expect(screen.getByText("filters.showFilters")).toBeInTheDocument();
    });

    it("preserves search text when expanding and collapsing filters", async () => {
      const user = userEvent.setup();
      render(<TransactionsFilters />);

      const searchInput = screen.getByPlaceholderText("filters.searchPlaceholder");
      await user.type(searchInput, "test search");

      await user.click(screen.getByText("filters.showFilters"));
      expect(screen.getByDisplayValue("test search")).toBeInTheDocument();

      await user.click(screen.getByText("filters.hideFilters"));
      const collapsedSearch = screen.getByPlaceholderText("filters.searchPlaceholder");
      expect(collapsedSearch).toHaveValue("test search");
    });

    it("has aria-label on collapsed search input", () => {
      render(<TransactionsFilters />);

      const searchInput = screen.getByPlaceholderText("filters.searchPlaceholder");
      expect(searchInput).toHaveAttribute("aria-label", "filters.freeSearch");
    });
  });

  describe("Desktop behavior", () => {
    beforeEach(async () => {
      vi.clearAllMocks();
      const { useMediaQuery } = await import("@/hooks/use-media-query");
      vi.mocked(useMediaQuery).mockReturnValue(false);

      vi.mocked(usePlatform).mockReturnValue({
        platform: "web" as const,
      });

      vi.mocked(useTableTransactionsStore).mockImplementation(
        (selector: unknown) => {
          const state = {
            filters: defaultFilters,
            setFilters: vi.fn(),
            resetFiltersState: vi.fn(),
            fetchTransactions: vi.fn(),
          };
          return typeof selector === "function" ? selector(state) : state;
        }
      );
    });

    it("shows full filters layout on desktop with no collapse toggle", () => {
      render(<TransactionsFilters />);

      expect(screen.getByText("filters.freeSearch")).toBeInTheDocument();
      expect(screen.getByText("filters.dateRange")).toBeInTheDocument();
      expect(screen.getByText("filters.transactionTypes")).toBeInTheDocument();
      expect(screen.getByText("filters.paymentMethod")).toBeInTheDocument();
      expect(screen.getByText("filters.recurringTransactions")).toBeInTheDocument();

      expect(screen.queryByText("filters.showFilters")).not.toBeInTheDocument();
      expect(screen.queryByText("filters.hideFilters")).not.toBeInTheDocument();
    });

    it("does not show filter count badge on desktop", async () => {
      const { useMediaQuery } = await import("@/hooks/use-media-query");
      vi.mocked(useMediaQuery).mockReturnValue(false);

      vi.mocked(useTableTransactionsStore).mockImplementation(
        (selector: unknown) => {
          const state = {
            filters: {
              search: "",
              dateRange: { from: "2024-01-01", to: "2024-12-31" },
              types: ["income"],
              paymentMethods: [],
              isRecurring: "all" as const,
              origin: "all" as const,
              recurringStatuses: [],
              recurringFrequencies: [],
            },
            setFilters: vi.fn(),
            resetFiltersState: vi.fn(),
            fetchTransactions: vi.fn(),
          };
          return typeof selector === "function" ? selector(state) : state;
        }
      );

      render(<TransactionsFilters />);

      const badge = screen.queryByText(/^\d+$/);
      expect(badge).not.toBeInTheDocument();
    });
  });

  describe("Landscape mobile behavior", () => {
    beforeEach(async () => {
      vi.clearAllMocks();
      const { useMediaQuery } = await import("@/hooks/use-media-query");
      vi.mocked(useMediaQuery).mockReturnValue(true);

      vi.mocked(usePlatform).mockReturnValue({
        platform: "web" as const,
      });

      vi.mocked(useTableTransactionsStore).mockImplementation(
        (selector: unknown) => {
          const state = {
            filters: defaultFilters,
            setFilters: vi.fn(),
            resetFiltersState: vi.fn(),
            fetchTransactions: vi.fn(),
          };
          return typeof selector === "function" ? selector(state) : state;
        }
      );
    });

    it("renders compact bar on landscape mobile (matching PR #698 query)", () => {
      render(<TransactionsFilters />);

      expect(screen.getByPlaceholderText("filters.searchPlaceholder")).toBeInTheDocument();
      expect(screen.getByText("filters.showFilters")).toBeInTheDocument();
    });

    it("collapsed search input has minimum 44px height on mobile", () => {
      render(<TransactionsFilters />);

      const searchInput = screen.getByPlaceholderText("filters.searchPlaceholder");
      expect(searchInput).toHaveClass("h-9");
      expect(searchInput).toHaveClass("max-md:h-11");
    });

    it("show filters toggle has minimum 44px height on mobile", () => {
      render(<TransactionsFilters />);

      const showButton = screen.getByText("filters.showFilters");
      expect(showButton).toHaveClass("h-9");
      expect(showButton).toHaveClass("max-md:h-11");
    });

    it("collapse button has minimum 44px height on mobile when expanded", async () => {
      const user = userEvent.setup();
      render(<TransactionsFilters />);

      await user.click(screen.getByText("filters.showFilters"));

      const hideButton = screen.getByText("filters.hideFilters");
      expect(hideButton).toHaveClass("h-8");
      expect(hideButton).toHaveClass("max-md:h-11");
    });
  });
});
