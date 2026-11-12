// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
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
  DatePickerWithRange: ({ triggerButton }: { triggerButton?: ReactNode }) => (
    <div data-testid="date-range-picker">{triggerButton ?? "Date Range Picker"}</div>
  ),
}));

const { aiIntakeState } = vi.hoisted(() => ({
  aiIntakeState: { enabled: false },
}));

vi.mock("@/lib/ai/flags", () => ({
  isAiIntakeEnabled: () => aiIntakeState.enabled,
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

      const hideButton = screen.getByRole("button", { name: "filters.hideFilters" });
      expect(hideButton).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByText("filters.compactDate:")).toBeInTheDocument();
      expect(screen.queryByText("filters.dateRange")).not.toBeInTheDocument();
    });

    it("collapses filters when Hide button is clicked", async () => {
      const user = userEvent.setup();
      render(<TransactionsFilters />);

      await user.click(screen.getByText("filters.showFilters"));
      expect(
        screen.getByRole("button", { name: "filters.hideFilters" }),
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "filters.hideFilters" }));

      expect(
        screen.queryByRole("button", { name: "filters.hideFilters" }),
      ).not.toBeInTheDocument();
      expect(screen.getByText("filters.showFilters")).toBeInTheDocument();
    });

    it("preserves search text when expanding and collapsing filters", async () => {
      const user = userEvent.setup();
      render(<TransactionsFilters />);

      const searchInput = screen.getByPlaceholderText("filters.searchPlaceholder");
      await user.type(searchInput, "test search");

      await user.click(screen.getByText("filters.showFilters"));
      expect(screen.getByDisplayValue("test search")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "filters.hideFilters" }));
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

    it("keeps the desktop markup unchanged", () => {
      render(<TransactionsFilters />);

      expect(screen.queryByTestId("mobile-filters-panel")).not.toBeInTheDocument();
      expect(screen.queryByText("filters.compactTitle")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "filters.compactReset" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "filters.resetFilters" })).toBeInTheDocument();
      expect(screen.getByTestId("date-range-picker")).toHaveTextContent("Date Range Picker");

      const searchInput = screen.getByPlaceholderText("filters.searchPlaceholder");
      expect(searchInput).toHaveClass("w-full");
      expect(searchInput).not.toHaveAttribute("data-ph-mask");
      expect(searchInput).not.toHaveClass("h-11");
      expect(searchInput).not.toHaveClass("border-0");
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
      expect(searchInput).toHaveClass("[@media(pointer:coarse)_and_(max-height:500px)]:h-11");
    });

    it("show filters toggle has minimum 44px height on mobile", () => {
      render(<TransactionsFilters />);

      const showButton = screen.getByText("filters.showFilters");
      expect(showButton).toHaveClass("h-9");
      expect(showButton).toHaveClass("max-md:h-11");
      expect(showButton).toHaveClass("[@media(pointer:coarse)_and_(max-height:500px)]:h-11");
    });

    it("collapse button has minimum 44px height on mobile when expanded", async () => {
      const user = userEvent.setup();
      render(<TransactionsFilters />);

      await user.click(screen.getByText("filters.showFilters"));

      const hideButton = screen.getByRole("button", { name: "filters.hideFilters" });
      expect(hideButton).toHaveClass("h-11");
      expect(hideButton).toHaveClass("w-11");
    });
  });

  describe("Compact panel", () => {
    const resetFiltersState = vi.fn();

    beforeEach(async () => {
      vi.clearAllMocks();
      aiIntakeState.enabled = false;
      const { useMediaQuery } = await import("@/hooks/use-media-query");
      vi.mocked(useMediaQuery).mockReturnValue(true);
      vi.mocked(usePlatform).mockReturnValue({ platform: "web" as const });
      vi.mocked(useTableTransactionsStore).mockImplementation(
        (selector: unknown) => {
          const state = {
            filters: defaultFilters,
            setFilters: vi.fn(),
            resetFiltersState,
            fetchTransactions: vi.fn(),
          };
          return typeof selector === "function" ? selector(state) : state;
        },
      );
    });

    async function openPanel() {
      const user = userEvent.setup();
      render(<TransactionsFilters />);
      await user.click(screen.getByText("filters.showFilters"));
      return user;
    }

    it("hides the reset link and badge when nothing is active", async () => {
      await openPanel();
      const panel = screen.getByTestId("mobile-filters-panel");
      expect(within(panel).queryByRole("button", { name: "filters.compactReset" })).not.toBeInTheDocument();
      expect(within(panel).queryByText(/^\d+$/)).not.toBeInTheDocument();
      expect(within(panel).queryByText("filters.compactActiveCount")).not.toBeInTheDocument();
    });

    it("counts search text in the badge and shows the reset link", async () => {
      const user = await openPanel();
      const search = screen.getByPlaceholderText("filters.compactSearchPlaceholder");
      await user.type(search, "rent");

      const panel = screen.getByTestId("mobile-filters-panel");
      expect(within(panel).getByText("1")).toHaveAttribute("aria-hidden", "true");
      expect(within(panel).getByText("filters.compactActiveCount")).toHaveClass("sr-only");
      expect(
        within(panel).getByRole("button", { name: "filters.compactReset" }),
      ).toBeInTheDocument();
      expect(search).toHaveAttribute("data-ph-mask", "");
      expect(search.parentElement).toHaveClass("border-primary/40");
      expect(search.parentElement).toHaveClass("bg-primary/10");
      expect(
        screen.getByRole("button", { name: "filters.compactClearSearch" }),
      ).toBeInTheDocument();
    });

    it("clears search, date, and type when reset is clicked", async () => {
      vi.mocked(useTableTransactionsStore).mockImplementation(
        (selector: unknown) => {
          const state = {
            filters: {
              ...defaultFilters,
              search: "rent",
              dateRange: { from: "2026-11-01", to: "2026-11-15" },
              types: ["donation"],
            },
            setFilters: vi.fn(),
            resetFiltersState,
            fetchTransactions: vi.fn(),
          };
          return typeof selector === "function" ? selector(state) : state;
        },
      );
      const user = await openPanel();
      const panel = screen.getByTestId("mobile-filters-panel");
      expect(within(panel).getByText("3")).toBeInTheDocument();

      await user.click(within(panel).getByRole("button", { name: "filters.compactReset" }));

      expect(screen.getByPlaceholderText("filters.compactSearchPlaceholder")).toHaveValue("");
      expect(within(panel).queryByRole("button", { name: "filters.compactReset" })).not.toBeInTheDocument();
      expect(within(panel).queryByText("3")).not.toBeInTheDocument();
      expect(resetFiltersState).toHaveBeenCalled();
    });

    it("shows idle, whole-month, and custom date labels", async () => {
      await openPanel();
      const idleDate = screen.getByText("filters.compactDate:").closest("button");
      expect(idleDate).toHaveTextContent("filters.all");
      cleanup();

      vi.mocked(useTableTransactionsStore).mockImplementation(
        (selector: unknown) => {
          const state = {
            filters: {
              ...defaultFilters,
              dateRange: { from: "2026-11-01", to: "2026-11-30" },
            },
            setFilters: vi.fn(),
            resetFiltersState: vi.fn(),
            fetchTransactions: vi.fn(),
          };
          return typeof selector === "function" ? selector(state) : state;
        },
      );
      render(<TransactionsFilters />);
      await userEvent.click(screen.getByText("filters.showFilters"));
      expect(screen.getByText("November")).toBeInTheDocument();
      cleanup();

      vi.mocked(useTableTransactionsStore).mockImplementation(
        (selector: unknown) => {
          const state = {
            filters: {
              ...defaultFilters,
              dateRange: { from: "2026-11-01", to: "2026-11-15" },
            },
            setFilters: vi.fn(),
            resetFiltersState: vi.fn(),
            fetchTransactions: vi.fn(),
          };
          return typeof selector === "function" ? selector(state) : state;
        },
      );
      render(<TransactionsFilters />);
      await userEvent.click(screen.getByText("filters.showFilters"));
      const value = screen.getByText(`1${"\u2013"}15.11`);
      expect(value).toHaveAttribute("dir", "ltr");
    });

    function expectHalfWidthGrid(panel: HTMLElement) {
      const grid = panel.querySelector(".grid");
      expect(grid).not.toBeNull();
      expect(grid).toHaveClass("grid-cols-2");
      const cells = Array.from(grid?.children ?? []);
      expect(cells.length).toBeGreaterThan(0);
      for (const cell of cells) {
        expect(cell.className).not.toMatch(/col-span/);
      }
      return cells;
    }

    it("hides source when AI intake is off and keeps the last cell half width", async () => {
      aiIntakeState.enabled = false;
      await openPanel();
      const panel = screen.getByTestId("mobile-filters-panel");
      const cells = expectHalfWidthGrid(panel);
      expect(cells).toHaveLength(4);
      expect(cells[3]?.textContent).toContain("filters.compactRecurring:");
      expect(panel).not.toHaveTextContent("filters.compactSource:");
    });

    it("shows source as the last half-width cell when AI intake is on", async () => {
      aiIntakeState.enabled = true;
      await openPanel();
      const panel = screen.getByTestId("mobile-filters-panel");
      const cells = expectHalfWidthGrid(panel);
      expect(cells).toHaveLength(5);
      expect(cells[3]?.textContent).toContain("filters.compactRecurring:");
      expect(cells[4]?.textContent).toContain("filters.compactSource:");
    });
  });
});
