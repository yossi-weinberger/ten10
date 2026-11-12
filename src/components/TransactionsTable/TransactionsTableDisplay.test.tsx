// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useMediaQuery } from "@/hooks/use-media-query";
import { TransactionsTableDisplay } from "./TransactionsTableDisplay";

const {
  i18nDir,
  api,
  filters,
  pagination,
  transactions,
  setLoadMorePagination,
  deleteTransaction,
  deleteTransactionsBulk,
  updateTransactionsBulk,
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
  transactions: [] as never[],
  setLoadMorePagination: vi.fn(),
  deleteTransaction: vi.fn(),
  deleteTransactionsBulk: vi.fn(),
  updateTransactionsBulk: vi.fn(),
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
  TransactionRow: () => null,
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
      transactions,
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
      bulkLoading: false,
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
  TransactionCardList: () => <div data-testid="transaction-card-list" />,
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

  it("renders the sort control only above the card list", () => {
    renderDisplay();

    const sortField = screen.getByRole("button", {
      name: "sort.sortBy: columns.date",
    });
    expect(sortField).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "sort.descending" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("transaction-card-list")).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "columns.date" }),
    ).not.toBeInTheDocument();

    const sortRow = sortField.parentElement;
    expect(sortRow).toHaveAttribute("dir", "ltr");
    expect(sortRow?.className).not.toContain("sticky");
    expect(sortRow?.className).not.toContain("mobile-topbar");
    expect(
      sortField.compareDocumentPosition(screen.getByTestId("transaction-card-list")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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

    await user.click(
      screen.getByRole("button", { name: "sort.sortBy: columns.date" }),
    );

    for (const label of SORTABLE_LABELS) {
      expect(await screen.findByRole("menuitem", { name: label })).toBeInTheDocument();
    }

    await user.click(screen.getByRole("menuitem", { name: "columns.paymentMethod" }));

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
    await user.click(screen.getByRole("menuitem", { name: "columns.amount" }));

    expect(api.setSorting).not.toHaveBeenCalled();
  });

  it("toggles direction through setSorting and reflects the active direction", async () => {
    const user = userEvent.setup();
    api.sorting = { field: "category", direction: "asc" };
    const view = renderDisplay();

    const ascending = screen.getByRole("button", { name: "sort.ascending" });
    expect(ascending.querySelector(".lucide-arrow-up")).toBeInTheDocument();
    expect(ascending.querySelector(".lucide-arrow-down")).not.toBeInTheDocument();

    await user.click(ascending);
    expect(api.setSorting).toHaveBeenCalledTimes(1);
    expect(api.setSorting).toHaveBeenCalledWith("category");

    view.unmount();
    api.setSorting.mockClear();
    api.sorting = { field: "category", direction: "desc" };
    renderDisplay();

    const descending = screen.getByRole("button", { name: "sort.descending" });
    expect(descending.querySelector(".lucide-arrow-down")).toBeInTheDocument();
    await user.click(descending);
    expect(api.setSorting).toHaveBeenCalledWith("category");
  });
});

describe("TransactionsTableDisplay table path", () => {
  it("keeps header sorting and does not render the mobile sort control", async () => {
    const user = userEvent.setup();
    renderDisplay();

    expect(
      screen.queryByRole("button", { name: /sort\.sortBy/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "sort.descending" }),
    ).not.toBeInTheDocument();
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
