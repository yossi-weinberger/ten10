// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MOBILE_SELECTION_CLEARANCE_CLASS } from "@/lib/responsive";
import { decideSortMenuPlacement } from "@/components/sortMenuPlacement";
import { TransactionsTableDisplay } from "./TransactionsTableDisplay";

const {
  i18nDir,
  api,
  filters,
  pagination,
  rows,
  flags,
  setLoadMorePagination,
  deleteTransaction,
  deleteTransactionsBulk,
  updateTransactionsBulk,
  cardListProps,
} = vi.hoisted(() => ({
  i18nDir: vi.fn(() => "ltr" as "ltr" | "rtl"),
  api: {
    setSorting: vi.fn(),
    fetchTransactions: vi.fn(),
    sorting: { field: "date", direction: "desc" as "asc" | "desc" },
  },
  filters: {
    dateRange: { from: null, to: null },
    types: [] as string[],
    search: "",
    paymentMethods: [] as string[],
    isRecurring: "all" as const,
    recurringStatuses: [] as string[],
    recurringFrequencies: [] as string[],
    origin: "all" as const,
  },
  pagination: {
    currentPage: 1,
    itemsPerPage: 20,
    totalCount: 0,
    hasMore: false,
  },
  rows: {
    current: [] as Array<{
      id: string;
      type: string;
      description: string;
      date: string;
      amount: number;
    }>,
  },
  flags: { bulkLoading: false },
  setLoadMorePagination: vi.fn(),
  deleteTransaction: vi.fn(),
  deleteTransactionsBulk: vi.fn(),
  updateTransactionsBulk: vi.fn(),
  cardListProps: {
    showMonthSeparators: undefined as boolean | undefined,
    hasSortControl: false,
  },
}));

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      dir: () => i18nDir(),
      language: "en",
    },
  }),
}));

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: vi.fn(() => false),
}));

vi.mock("@/contexts/PlatformContext", () => ({
  usePlatform: () => ({ platform: "web" }),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/lib/ai/flags", () => ({
  isAiIntakeEnabled: () => false,
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {},
}));

vi.mock("./TransactionRow", () => ({
  TransactionRow: (props: {
    transaction: { id: string };
    onToggleSelected?: (id: string) => void;
  }) => (
    <tr>
      <td>
        <button type="button" onClick={() => props.onToggleSelected?.(props.transaction.id)}>
          {`row-${props.transaction.id}`}
        </button>
      </td>
    </tr>
  ),
}));

vi.mock("@/lib/store", () => ({
  useDonationStore: (
    selector?: (state: {
      settings: {
        trackChomeshSeparately: boolean;
        calendarType: "gregorian";
        showSecondaryDate: boolean;
        language: "en";
      };
    }) => unknown,
  ) => {
    const state = {
      settings: {
        trackChomeshSeparately: false,
        calendarType: "gregorian" as const,
        showSecondaryDate: false,
        language: "en" as const,
      },
    };
    return typeof selector === "function" ? selector(state) : state;
  },
}));

vi.mock("@/lib/tableTransactions/tableTransactions.store", () => ({
  useTableTransactionsStore: (selector: unknown) => {
    const state = {
      transactions: rows.current,
      loading: false,
      error: null,
      fetchTransactions: api.fetchTransactions,
      setLoadMorePagination,
      pagination,
      filters,
      sorting: api.sorting,
      setSorting: api.setSorting,
      deleteTransaction,
      deleteTransactionsBulk,
      updateTransactionsBulk,
      bulkLoading: flags.bulkLoading,
    };
    return typeof selector === "function"
      ? (selector as (value: typeof state) => unknown)(state)
      : state;
  },
}));

vi.mock("./TransactionsFilters", () => ({
  TransactionsFilters: () => null,
}));

vi.mock("./ExportButton", () => ({
  ExportButton: () => null,
}));

vi.mock("./TransactionCardList", () => ({
  TransactionCardList: (props: {
    showMonthSeparators?: boolean;
    sortControl?: unknown;
    selectedIds?: Set<string>;
    transactions?: Array<{ id: string }>;
    onToggleSelected?: (id: string) => void;
  }) => {
    cardListProps.showMonthSeparators = props.showMonthSeparators;
    cardListProps.hasSortControl = props.sortControl != null;
    const firstId = props.transactions?.[0]?.id;
    return (
      <div
        data-testid="transaction-card-list"
        data-show-month-separators={String(props.showMonthSeparators)}
        data-selected-count={props.selectedIds?.size ?? 0}
      >
        {props.sortControl as ReactNode}
        {firstId ? (
          <button type="button" onClick={() => props.onToggleSelected?.(firstId)}>
            {`card-${firstId}`}
          </button>
        ) : null}
      </div>
    );
  },
}));

vi.mock("./TransactionEditModal", () => ({
  TransactionEditModal: () => null,
}));

vi.mock("./RecurringTransactionEditModal", () => ({
  RecurringTransactionEditModal: () => null,
}));

vi.mock("./BulkEditDialog", () => ({
  BulkEditDialog: () => null,
}));

vi.mock("../ui/DeleteConfirmationDialog", () => ({
  DeleteConfirmationDialog: () => null,
}));

vi.mock("@/components/settings/OpeningBalanceModal", () => ({
  OpeningBalanceModal: () => null,
}));

const SORTABLE_LABELS = [
  "columns.date",
  "columns.description",
  "columns.amount",
  "columns.type",
  "columns.category",
  "columns.recipient",
  "columns.paymentMethod",
] as const;

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => undefined;
  HTMLElement.prototype.releasePointerCapture = () => undefined;
  HTMLElement.prototype.scrollIntoView = () => undefined;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
});

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  api.sorting = { field: "date", direction: "desc" };
  api.setSorting.mockClear();
  api.fetchTransactions.mockClear();
  rows.current = [];
  pagination.hasMore = false;
  pagination.totalCount = 0;
  flags.bulkLoading = false;
  i18nDir.mockReset();
  i18nDir.mockReturnValue("ltr");
  vi.mocked(useMediaQuery).mockReturnValue(false);
});

function renderDisplay() {
  return render(<TransactionsTableDisplay />);
}

describe("TransactionsTableDisplay mobile sort", () => {
  beforeEach(() => {
    vi.mocked(useMediaQuery).mockReturnValue(true);
  });

  it("renders one sort chip inside the card list", () => {
    renderDisplay();

    const sortField = screen.getByRole("button", {
      name: "sort.sortBy: columns.date",
    });
    expect(sortField).toHaveTextContent("sort.chip");
    expect(sortField.className).toContain("h-9");
    expect(sortField.className).toContain("min-h-11");
    expect(sortField.className).toContain("rounded-full");
    expect(sortField.className).toContain("text-sm");
    expect(sortField.className).toContain("w-fit");
    expect(screen.getAllByRole("button", { name: /sort\.sortBy/ })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "sort.ascending" })).not.toBeInTheDocument();
    expect(screen.getByTestId("transaction-card-list")).toContainElement(sortField);
    expect(cardListProps.hasSortControl).toBe(true);
    expect(
      screen.queryByRole("columnheader", { name: "columns.date" }),
    ).not.toBeInTheDocument();

    const sortRow = sortField.parentElement;
    expect(sortRow).toHaveAttribute("dir", "ltr");
    expect(sortRow?.className).not.toContain("overflow-x-hidden");
  });

  it("uses rtl on the sort row and menu when the language is rtl", async () => {
    i18nDir.mockReturnValue("rtl");
    const user = userEvent.setup();
    renderDisplay();

    const sortField = screen.getByRole("button", {
      name: "sort.sortBy: columns.date",
    });
    expect(sortField.parentElement).toHaveAttribute("dir", "rtl");

    await user.click(sortField);
    expect(await screen.findByRole("menu")).toHaveAttribute("dir", "rtl");
  });

  it("lists the sortable columns and calls setSorting for a new field", async () => {
    const user = userEvent.setup();
    renderDisplay();

    Object.defineProperty(window, "innerHeight", { configurable: true, value: 568 });
    const trigger = screen.getByRole("button", { name: "sort.sortBy: columns.date" });
    const triggerRect = trigger.getBoundingClientRect();
    const expectedPlacement = decideSortMenuPlacement({
      triggerTop: triggerRect.top,
      triggerBottom: triggerRect.bottom,
      viewportHeight: 568,
      safeAreaBottom: 0,
      headerClearance: 52,
    });
    await user.click(trigger);

    const menu = await screen.findByRole("menu");
    expect(menu).toHaveAttribute("data-side", expectedPlacement.side);
    const popper = menu.closest("[data-radix-popper-content-wrapper]");
    expect(popper).toBeInstanceOf(HTMLElement);
    expect((popper as HTMLElement).style.zIndex).toBe("60");
    expect(menu.className).toContain("overflow-y-auto");
    expect(menu.className).toContain("w-[min(16rem,calc(100vw-32px))]");
    expect(menu.className).not.toContain("trigger-width");
    expect(menu.style.maxHeight).toBe(`${expectedPlacement.maxHeight}px`);
    expect(menu.style.maxHeight).not.toContain("select");
    expect(
      menu.style.getPropertyValue("--radix-dropdown-menu-content-available-height"),
    ).toContain("--radix-popper-available-height");
    expect(menu).toHaveAttribute("data-avoid-collisions", "false");

    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: "sort.directions.dateDesc" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("menuitemradio", { name: "sort.directions.dateAsc" }),
    ).toHaveAttribute("aria-checked", "false");

    for (const label of SORTABLE_LABELS) {
      const item = screen.getByRole("menuitemradio", { name: label });
      expect(item).toHaveAttribute(
        "aria-checked",
        label === "columns.date" ? "true" : "false",
      );
    }

    const activeField = screen.getByRole("menuitemradio", { name: "columns.date" });
    const activeClasses = activeField.className.split(" ");
    expect(activeClasses).toContain("pl-8");
    expect(activeClasses).toContain("pr-2");
    expect(activeClasses).toContain("rtl:pl-2");
    expect(activeClasses).toContain("rtl:pr-8");
    expect(activeClasses).toContain("[&>span]:rtl:left-auto");
    expect(activeClasses).toContain("[&>span]:rtl:right-2");
    expect(activeClasses).not.toContain("pl-0");
    expect(activeClasses).not.toContain("pr-0");
    expect(activeClasses).not.toContain("ps-8");

    await user.click(screen.getByRole("menuitemradio", { name: "columns.paymentMethod" }));

    expect(api.setSorting).toHaveBeenCalledTimes(1);
    expect(api.setSorting).toHaveBeenCalledWith("payment_method");
  });

  it("does not call setSorting when the current field is selected again", async () => {
    const user = userEvent.setup();
    api.sorting = { field: "amount", direction: "asc" };
    renderDisplay();

    await user.click(
      screen.getByRole("button", { name: "sort.sortBy: columns.amount" }),
    );
    await user.click(screen.getByRole("menuitemradio", { name: "columns.amount" }));

    expect(api.setSorting).not.toHaveBeenCalled();
  });

  it("toggles direction through the menu radios and leaves the active direction alone", async () => {
    const user = userEvent.setup();
    api.sorting = { field: "category", direction: "asc" };
    const view = renderDisplay();

    await user.click(
      screen.getByRole("button", { name: "sort.sortBy: columns.category" }),
    );
    const textAscending = screen.getByRole("menuitemradio", {
      name: "sort.directions.textAsc",
    });
    const textDescending = screen.getByRole("menuitemradio", {
      name: "sort.directions.textDesc",
    });
    expect(textAscending).toHaveAttribute("aria-checked", "true");
    expect(textDescending).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByRole("button", { name: "sort.descending" })).not.toBeInTheDocument();

    await user.click(textDescending);
    expect(api.setSorting).toHaveBeenCalledTimes(1);
    expect(api.setSorting).toHaveBeenCalledWith("category");

    view.unmount();
    api.setSorting.mockClear();
    api.sorting = { field: "category", direction: "asc" };
    renderDisplay();
    await user.click(
      screen.getByRole("button", { name: "sort.sortBy: columns.category" }),
    );
    await user.click(
      screen.getByRole("menuitemradio", { name: "sort.directions.textAsc" }),
    );
    expect(api.setSorting).not.toHaveBeenCalled();

    view.unmount();
    api.setSorting.mockClear();
    api.sorting = { field: "amount", direction: "desc" };
    renderDisplay();

    await user.click(
      screen.getByRole("button", { name: "sort.sortBy: columns.amount" }),
    );
    expect(
      screen.getByRole("menuitemradio", { name: "sort.directions.amountDesc" }),
    ).toHaveAttribute("aria-checked", "true");
    await user.click(
      screen.getByRole("menuitemradio", { name: "sort.directions.amountAsc" }),
    );
    expect(api.setSorting).toHaveBeenCalledWith("amount");
  });

  it("passes showMonthSeparators only while sorting by date", () => {
    api.sorting = { field: "date", direction: "desc" };
    const view = renderDisplay();
    expect(cardListProps.showMonthSeparators).toBe(true);
    expect(screen.getByTestId("transaction-card-list")).toHaveAttribute(
      "data-show-month-separators",
      "true",
    );

    view.unmount();
    api.sorting = { field: "amount", direction: "desc" };
    renderDisplay();
    expect(cardListProps.showMonthSeparators).toBe(false);
    expect(screen.getByTestId("transaction-card-list")).toHaveAttribute(
      "data-show-month-separators",
      "false",
    );
  });
});

describe("TransactionsTableDisplay table path", () => {
  it("keeps header sorting and does not render the mobile sort control", async () => {
    const user = userEvent.setup();
    renderDisplay();

    expect(
      screen.queryByRole("button", { name: /sort\.sortBy/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("sort.chip")).not.toBeInTheDocument();
    expect(screen.queryByTestId("transaction-card-list")).not.toBeInTheDocument();

    for (const label of SORTABLE_LABELS) {
      expect(screen.getByRole("columnheader", { name: label })).toBeInTheDocument();
    }

    await user.click(
      screen.getByRole("button", { name: "columns.amount" }),
    );
    expect(api.setSorting).toHaveBeenCalledTimes(1);
    expect(api.setSorting).toHaveBeenCalledWith("amount");
  });
});

describe("TransactionsTableDisplay reactive card layout", () => {
  const sample = {
    id: "tx-1",
    type: "expense",
    description: "Groceries",
    date: "2026-01-02",
    amount: 10,
  };

  it("keeps the selected id and shows it on the card list", async () => {
    rows.current = [sample, { ...sample, id: "tx-missing", description: "Gone" }];
    const user = userEvent.setup();
    const view = renderDisplay();
    await user.click(screen.getByRole("button", { name: "row-tx-1" }));
    await user.click(screen.getByRole("button", { name: "row-tx-missing" }));
    rows.current = [sample];
    view.rerender(<TransactionsTableDisplay />);

    vi.mocked(useMediaQuery).mockReturnValue(true);
    view.rerender(<TransactionsTableDisplay />);

    expect(screen.getByTestId("transaction-card-list")).toHaveAttribute("data-selected-count", "1");
    expect(api.fetchTransactions).toHaveBeenCalledTimes(1);
  });

  it("defers the switch while bulk work is pending and reapplies the live query", () => {
    rows.current = [sample];
    vi.mocked(useMediaQuery).mockReturnValue(false);
    const view = renderDisplay();
    expect(screen.queryByTestId("transaction-card-list")).not.toBeInTheDocument();

    flags.bulkLoading = true;
    view.rerender(<TransactionsTableDisplay />);
    vi.mocked(useMediaQuery).mockReturnValue(true);
    view.rerender(<TransactionsTableDisplay />);
    expect(screen.queryByTestId("transaction-card-list")).not.toBeInTheDocument();
    vi.mocked(useMediaQuery).mockReturnValue(false);
    view.rerender(<TransactionsTableDisplay />);
    expect(screen.queryByTestId("transaction-card-list")).not.toBeInTheDocument();
    vi.mocked(useMediaQuery).mockReturnValue(true);
    view.rerender(<TransactionsTableDisplay />);
    expect(screen.queryByTestId("transaction-card-list")).not.toBeInTheDocument();

    flags.bulkLoading = false;
    view.rerender(<TransactionsTableDisplay />);
    expect(screen.getByTestId("transaction-card-list")).toBeInTheDocument();
    expect(api.fetchTransactions).toHaveBeenCalledTimes(1);
  });

  it("pads the list and Load More while the mobile selection bar is showing", async () => {
    rows.current = [sample];
    pagination.hasMore = true;
    pagination.totalCount = 2;
    vi.mocked(useMediaQuery).mockReturnValue(true);
    const user = userEvent.setup();
    const view = renderDisplay();

    expect(screen.getByRole("button", { name: "pagination.loadMore" }).closest("div.space-y-4")?.className).not.toContain(
      "max-md:pb-",
    );

    await user.click(screen.getByRole("button", { name: "card-tx-1" }));
    const loadMore = screen.getByRole("button", { name: "pagination.loadMore" });
    expect(loadMore.closest("div.space-y-4")?.className).toContain(MOBILE_SELECTION_CLEARANCE_CLASS);

    vi.mocked(useMediaQuery).mockReturnValue(false);
    view.rerender(<TransactionsTableDisplay />);
    expect(screen.getByRole("button", { name: "pagination.loadMore" }).closest("div.space-y-4")?.className).not.toContain(
      MOBILE_SELECTION_CLEARANCE_CLASS,
    );
  });
});
