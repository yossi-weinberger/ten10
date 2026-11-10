// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecurringTransactionsFilters } from "./RecurringTransactionsFilters";
import { useRecurringTableStore } from "@/lib/tableTransactions/recurringTable.store";

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

    expect(screen.getByText("recurringFilters.title")).toBeInTheDocument();
    expect(screen.getByText("filters.freeSearch")).toBeInTheDocument();
  });
});
