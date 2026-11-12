// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecurringTransactionsFilters } from "./RecurringTransactionsFilters";
import { useRecurringTableStore } from "@/lib/tableTransactions/recurringTable.store";
import { MOBILE_COMPACT_QUERY } from "@/lib/responsive";

vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { dir: () => "ltr", language: "en" },
  }),
}));

vi.mock("@/lib/tableTransactions/recurringTable.store");
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: vi.fn(),
}));

describe("RecurringTransactionsFilters", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useRecurringTableStore).mockReturnValue({
      filters: {
        search: "",
        types: [],
        statuses: [],
        frequencies: [],
      },
      setFilters: vi.fn(),
      resetFilters: vi.fn(),
    });
  });

  it("shows active filters count badge on mobile when filters are active", async () => {
    const { useMediaQuery } = await import("@/hooks/use-media-query");
    vi.mocked(useMediaQuery).mockReturnValue(true);

    vi.mocked(useRecurringTableStore).mockReturnValueOnce({
      filters: {
        search: "",
        types: ["income"],
        statuses: ["active", "paused"],
        frequencies: ["monthly"],
      },
      setFilters: vi.fn(),
      resetFilters: vi.fn(),
    });

    render(<RecurringTransactionsFilters />);

    const badge = screen.getByText("3");
    expect(badge).toBeInTheDocument();
  });

  it("shows full filters layout on desktop", async () => {
    const { useMediaQuery } = await import("@/hooks/use-media-query");
    vi.mocked(useMediaQuery).mockReturnValue(false);

    render(<RecurringTransactionsFilters />);

    expect(useMediaQuery).toHaveBeenCalledWith(MOBILE_COMPACT_QUERY);
    expect(screen.getByText("recurringFilters.title")).toBeInTheDocument();
    expect(screen.getByText("filters.freeSearch")).toBeInTheDocument();
    expect(screen.queryByText("filters.showFilters")).not.toBeInTheDocument();
    expect(screen.queryByText("filters.hideFilters")).not.toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText("recurringFilters.searchPlaceholder");
    expect(searchInput).toHaveClass("w-full");
    expect(searchInput).not.toHaveClass("h-9");
    expect(searchInput).not.toHaveClass("max-md:h-11");
    expect(searchInput).not.toHaveClass("[@media(pointer:coarse)_and_(max-height:500px)]:h-11");
  });

  describe("landscape compact bar", () => {
    it("uses the shared compact query and 44px targets", async () => {
      const { useMediaQuery } = await import("@/hooks/use-media-query");
      vi.mocked(useMediaQuery).mockReturnValue(true);

      const user = userEvent.setup();
      render(<RecurringTransactionsFilters />);

      expect(useMediaQuery).toHaveBeenCalledWith(MOBILE_COMPACT_QUERY);
      expect(screen.getByPlaceholderText("recurringFilters.searchPlaceholder")).toBeInTheDocument();
      expect(screen.getByText("filters.showFilters")).toBeInTheDocument();
      expect(screen.queryByText("recurringFilters.title")).not.toBeInTheDocument();

      const searchInput = screen.getByPlaceholderText("recurringFilters.searchPlaceholder");
      expect(searchInput).toHaveClass("h-9");
      expect(searchInput).toHaveClass("max-md:h-11");
      expect(searchInput).toHaveClass("[@media(pointer:coarse)_and_(max-height:500px)]:h-11");

      const showButton = screen.getByText("filters.showFilters");
      expect(showButton).toHaveClass("h-9");
      expect(showButton).toHaveClass("max-md:h-11");
      expect(showButton).toHaveClass("[@media(pointer:coarse)_and_(max-height:500px)]:h-11");

      await user.click(showButton);

      const hideButton = screen.getByRole("button", { name: "filters.hideFilters" });
      expect(hideButton).toHaveClass("h-11");
      expect(hideButton).toHaveClass("w-11");
      expect(screen.getByText("filters.compactTitle")).toBeInTheDocument();
      expect(screen.queryByText("recurringFilters.title")).not.toBeInTheDocument();

      const grid = screen.getByTestId("mobile-filters-panel").querySelector(".grid");
      expect(grid).toHaveClass("grid-cols-1", "min-[377px]:grid-cols-2");
      expect(grid).not.toHaveClass("grid-cols-2");
    });

    it("counts search text and shows the reset link only when active", async () => {
      const { useMediaQuery } = await import("@/hooks/use-media-query");
      vi.mocked(useMediaQuery).mockReturnValue(true);
      const user = userEvent.setup();
      render(<RecurringTransactionsFilters />);

      await user.click(screen.getByText("filters.showFilters"));
      const panel = screen.getByTestId("mobile-filters-panel");
      expect(
        within(panel).queryByRole("button", { name: "filters.compactReset" }),
      ).not.toBeInTheDocument();

      const search = screen.getByPlaceholderText(
        "recurringFilters.compactSearchPlaceholder",
      );
      await user.type(search, "rent");
      expect(within(panel).getByText("1")).toHaveAttribute("aria-hidden", "true");
      expect(within(panel).getByText("filters.compactActiveCount")).toHaveClass("sr-only");
      expect(
        screen.getByPlaceholderText("recurringFilters.compactSearchPlaceholder"),
      ).toHaveClass("truncate", "placeholder:truncate");
      expect(search).toHaveAttribute("data-ph-mask", "");
      await user.click(
        within(panel).getByRole("button", { name: "filters.compactReset" }),
      );
      expect(search).toHaveValue("");
      expect(
        within(panel).queryByRole("button", { name: "filters.compactReset" }),
      ).not.toBeInTheDocument();
    });
  });
});
