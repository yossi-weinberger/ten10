// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { COARSE_POINTER_QUERY, MOBILE_CARD_QUERY } from "@/lib/responsive";
import type { RecurringTransaction } from "@/types/transaction";
import { deleteRecurringTransaction } from "@/lib/tableTransactions/recurringTable.service";
import { RECURRING_HOW_IT_WORKS_OPEN_KEY, RecurringTransactionsTableDisplay } from "./RecurringTransactionsTableDisplay";

const api = vi.hoisted(() => ({
  fetchRecurring: vi.fn(),
  setSorting: vi.fn(),
  deleteRecurringBulk: vi.fn(),
  updateRecurringBulk: vi.fn(),
  recurring: [] as RecurringTransaction[],
  loading: false,
  error: null as string | null,
  bulkLoading: false,
  sorting: { field: "next_due_date", direction: "asc" as "asc" | "desc" },
  filters: {
    search: "",
    statuses: [] as string[],
    types: [] as string[],
    frequencies: [] as string[],
  },
}));

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (key: string, params?: { count?: number; field?: string; direction?: string }) => {
      if (key === "sort.chip" && params?.field) {
        return `Sort: ${params.field} · ${params.direction ?? ""}`;
      }
      return params && typeof params.count === "number" ? `${key}:${params.count}` : key;
    },
    i18n: {
      dir: () => "ltr",
      language: "en",
    },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));

vi.mock("@/lib/tableTransactions/recurringTable.service", () => ({
  deleteRecurringTransaction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/tableTransactions/recurringTable.store", () => ({
  useRecurringTableStore: () => api,
}));

vi.mock("@/contexts/PlatformContext", () => ({
  usePlatform: () => ({ platform: "web" }),
}));

vi.mock("@/lib/store", () => ({
  useDonationStore: (
    selector: (state: { settings: { trackChomeshSeparately: boolean } }) => unknown,
  ) => selector({ settings: { trackChomeshSeparately: false } }),
}));

vi.mock("@/lib/calendar/use-display-date", () => ({
  useDisplayDate: () => (date: string) => ({ primary: date, secondary: null }),
}));

vi.mock("@/components/Currency/CurrencyConversionInfo", () => ({
  CurrencyConversionInfo: ({ amount, currency }: { amount: number; currency: string }) => (
    <span>{`${amount} ${currency}`}</span>
  ),
}));

vi.mock("./RecurringTransactionsFilters", () => ({
  RecurringTransactionsFilters: () => null,
}));

vi.mock("./RecurringTransactionEditModal", () => ({
  RecurringTransactionEditModal: ({
    isOpen,
    transaction,
  }: {
    isOpen: boolean;
    transaction: RecurringTransaction | null;
  }) => (isOpen && transaction ? <div data-testid="edit-modal">{transaction.id}</div> : null),
}));

function recurringRow(
  overrides: Partial<RecurringTransaction> & Pick<RecurringTransaction, "id">,
): RecurringTransaction {
  return {
    status: "active",
    start_date: "2026-01-01",
    next_due_date: "2026-02-01",
    frequency: "monthly",
    calendar_type: "gregorian",
    anchor_month_code: null,
    day_of_month: 1,
    total_occurrences: 12,
    execution_count: 3,
    description: "Rent",
    amount: 100,
    currency: "ILS",
    type: "expense",
    ...overrides,
  };
}

const mediaListeners = new Map<string, Set<(event: { matches: boolean }) => void>>();
let cardMatches = false;

function installMatchMedia() {
  mediaListeners.clear();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => {
      let bucket = mediaListeners.get(query);
      if (!bucket) {
        bucket = new Set();
        mediaListeners.set(query, bucket);
      }
      const queryListeners = bucket;
      return {
        get matches() {
          if (query === MOBILE_CARD_QUERY || query === COARSE_POINTER_QUERY) return cardMatches;
          return false;
        },
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: (_type: string, listener: (event: { matches: boolean }) => void) => {
          queryListeners.add(listener);
        },
        removeEventListener: (_type: string, listener: (event: { matches: boolean }) => void) => {
          queryListeners.delete(listener);
        },
        dispatchEvent: () => false,
      };
    },
  });
}

function setCardMatches(next: boolean) {
  cardMatches = next;
  act(() => {
    for (const query of [MOBILE_CARD_QUERY, COARSE_POINTER_QUERY]) {
      mediaListeners.get(query)?.forEach((listener) => {
        listener({ matches: next });
      });
    }
  });
}

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => undefined;
  HTMLElement.prototype.releasePointerCapture = () => undefined;
  HTMLElement.prototype.scrollIntoView = () => undefined;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  installMatchMedia();
});

beforeEach(() => {
  cardMatches = false;
  window.localStorage.removeItem(RECURRING_HOW_IT_WORKS_OPEN_KEY);
  api.recurring = [];
  api.loading = false;
  api.error = null;
  api.bulkLoading = false;
  api.sorting = { field: "next_due_date", direction: "asc" };
  api.fetchRecurring.mockClear();
  api.setSorting.mockClear();
  vi.mocked(deleteRecurringTransaction).mockClear();
});

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  document.body.style.pointerEvents = "";
  document.body.style.overflow = "";
  document.body.removeAttribute("data-scroll-locked");
  vi.useRealTimers();
});

function buttonNamed(text: string) {
  return screen.getByRole("button", { name: (name) => name.includes(text) });
}

async function openRowMenu(user: ReturnType<typeof userEvent.setup>, index = 0) {
  const triggers = screen.getAllByRole("button", { name: "accessibility.openMenu" });
  await user.click(triggers[index]);
}

describe("RecurringTransactionsTableDisplay desktop actions", () => {
  it("opens the edit modal from the row menu", async () => {
    api.recurring = [recurringRow({ id: "active-1", description: "Rent" })];
    const user = userEvent.setup();
    render(<RecurringTransactionsTableDisplay />);

    await openRowMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "actions.edit" }));

    expect(screen.getByTestId("edit-modal")).toHaveTextContent("active-1");
  });

  it("deletes only after the confirmation dialog", async () => {
    api.recurring = [recurringRow({ id: "active-1", description: "Rent" })];
    const user = userEvent.setup();
    render(<RecurringTransactionsTableDisplay />);

    await openRowMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "actions.delete" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("recurringTable.deleteTitle");
    expect(deleteRecurringTransaction).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "actions.delete" }));

    expect(deleteRecurringTransaction).toHaveBeenCalledTimes(1);
    expect(deleteRecurringTransaction).toHaveBeenCalledWith("active-1");
  });

  it("selects loaded rows and shows the bulk toolbar count", async () => {
    api.recurring = [
      recurringRow({ id: "active-1", description: "Rent" }),
      recurringRow({ id: "active-2", description: "Internet" }),
    ];
    const user = userEvent.setup();
    render(<RecurringTransactionsTableDisplay />);

    const boxes = screen.getAllByRole("checkbox");
    await user.click(boxes[1]);
    await user.click(boxes[2]);

    expect(screen.getByRole("region", { name: "bulkToolbar.recurringAriaLabel" })).toHaveTextContent(
      "bulkToolbar.selectedRecurringCount:2",
    );
    expect(boxes[1]).toHaveAttribute("data-state", "checked");
    expect(boxes[2]).toHaveAttribute("data-state", "checked");
  });

  it("disables edit for a completed row", async () => {
    api.recurring = [
      recurringRow({ id: "done-1", status: "completed", description: "Finished" }),
    ];
    const user = userEvent.setup();
    render(<RecurringTransactionsTableDisplay />);

    await openRowMenu(user);
    expect(screen.getByRole("menuitem", { name: "actions.edit" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.queryByTestId("edit-modal")).not.toBeInTheDocument();
  });
});

describe("RecurringTransactionsTableDisplay card layout", () => {
  function renderCards() {
    cardMatches = true;
    return render(<RecurringTransactionsTableDisplay />);
  }

  it("keeps loaded selection ids and opens the card bulk bar", async () => {
    api.recurring = [
      recurringRow({ id: "active-1", description: "Rent" }),
      recurringRow({ id: "active-2", description: "Internet" }),
      recurringRow({ id: "missing", description: "Gone" }),
    ];
    const user = userEvent.setup();
    const view = render(<RecurringTransactionsTableDisplay />);
    const boxes = screen.getAllByRole("checkbox");
    await user.click(boxes[1]);
    await user.click(boxes[2]);
    await user.click(boxes[3]);

    api.recurring = api.recurring.filter((row) => row.id !== "missing");
    view.rerender(<RecurringTransactionsTableDisplay />);
    expect(screen.getByRole("region", { name: "bulkToolbar.recurringAriaLabel" })).toHaveTextContent(
      "bulkToolbar.selectedRecurringCount:2",
    );

    setCardMatches(true);

    const region = screen.getByRole("region", { name: "bulkToolbar.recurringAriaLabel" });
    expect(region).toHaveTextContent("bulkToolbar.selectedRecurringCount:2");
    expect(screen.queryByRole("columnheader")).not.toBeInTheDocument();
    expect(buttonNamed("Rent")).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: (name) => name.includes("Gone") })).not.toBeInTheDocument();
    expect(region.parentElement?.className ?? "").not.toContain("ph-no-capture");
  });

  it("cancels a pending long press and an open row menu when the view changes", async () => {
    api.recurring = [recurringRow({ id: "active-1", description: "Rent" })];
    vi.useFakeTimers();
    renderCards();
    fireEvent.pointerDown(buttonNamed("Rent"), { clientX: 8, clientY: 8, pointerType: "touch" });
    setCardMatches(false);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    vi.useRealTimers();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "accessibility.openMenu" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    setCardMatches(true);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "bulkToolbar.recurringAriaLabel" })).not.toBeInTheDocument();
  });

  it("closes an open swipe and the details drawer, and restores body scroll lock", async () => {
    api.recurring = [recurringRow({ id: "active-1", description: "Rent" })];
    const user = userEvent.setup();
    renderCards();

    await user.click(buttonNamed("Rent"));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    document.body.style.pointerEvents = "none";
    document.body.style.overflow = "hidden";
    document.body.setAttribute("data-scroll-locked", "1");

    setCardMatches(false);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(document.body.style.pointerEvents).not.toBe("none");
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(document.body.hasAttribute("data-scroll-locked")).toBe(false);
    expect(document.querySelector("[aria-modal='true']")).toBeNull();
  });

  it("defers the view switch while a bulk action is pending and then uses the live query", () => {
    api.recurring = [recurringRow({ id: "active-1", description: "Rent" })];
    const view = render(<RecurringTransactionsTableDisplay />);
    expect(screen.getByRole("columnheader", { name: "recurringColumns.status" })).toBeInTheDocument();

    api.bulkLoading = true;
    view.rerender(<RecurringTransactionsTableDisplay />);
    setCardMatches(true);
    expect(screen.getByRole("columnheader", { name: "recurringColumns.status" })).toBeInTheDocument();
    setCardMatches(false);
    expect(screen.getByRole("columnheader", { name: "recurringColumns.status" })).toBeInTheDocument();
    setCardMatches(true);
    expect(screen.getByRole("columnheader", { name: "recurringColumns.status" })).toBeInTheDocument();

    api.bulkLoading = false;
    view.rerender(<RecurringTransactionsTableDisplay />);
    expect(screen.queryByRole("columnheader")).not.toBeInTheDocument();
    expect(buttonNamed("Rent")).toBeInTheDocument();
  });

  it("does not refetch and scrolls to the top when the layout changes", () => {
    api.recurring = [recurringRow({ id: "active-1", description: "Rent" })];
    const scroller = document.createElement("div");
    const main = document.createElement("main");
    scroller.appendChild(main);
    document.body.appendChild(scroller);
    scroller.scrollTop = 90;
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);

    render(<RecurringTransactionsTableDisplay />);
    expect(api.fetchRecurring).toHaveBeenCalledTimes(1);
    api.fetchRecurring.mockClear();
    scrollTo.mockClear();

    setCardMatches(true);

    expect(api.fetchRecurring).not.toHaveBeenCalled();
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    expect(scroller.scrollTop).toBe(0);
    expect(buttonNamed("Rent")).toBeInTheDocument();
  });

  it("deletes a swiped card only after the existing confirmation dialog", async () => {
    api.recurring = [recurringRow({ id: "active-1", description: "Rent" })];
    vi.useFakeTimers();
    renderCards();

    const card = buttonNamed("Rent");
    act(() => {
      fireEvent.pointerDown(card, { clientX: 160, clientY: 40, pointerType: "touch" });
      fireEvent.pointerMove(card, { clientX: 20, clientY: 40, pointerType: "touch" });
      fireEvent.pointerUp(card, { clientX: 20, clientY: 40, pointerType: "touch" });
      vi.advanceTimersByTime(220);
    });
    fireEvent.click(screen.getAllByRole("button", { name: "actions.delete" })[0]);
    vi.useRealTimers();

    const dialog = await screen.findByRole("alertdialog");
    expect(deleteRecurringTransaction).not.toHaveBeenCalled();
    const user = userEvent.setup();
    await user.click(within(dialog).getByRole("button", { name: "actions.delete" }));
    expect(deleteRecurringTransaction).toHaveBeenCalledWith("active-1");
  });

  it("hides status in the mobile sort picker and keeps a status sort on the desktop table", async () => {
    api.sorting = { field: "status", direction: "desc" };
    api.recurring = [
      recurringRow({ id: "late", description: "Later", next_due_date: "2026-05-01" }),
      recurringRow({ id: "early", description: "Earlier", next_due_date: "2026-01-01" }),
    ];
    const user = userEvent.setup();
    render(<RecurringTransactionsTableDisplay />);

    expect(screen.getByRole("columnheader", { name: "recurringColumns.status" })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
    await user.click(screen.getByRole("button", { name: "recurringColumns.status" }));
    expect(api.setSorting).toHaveBeenCalledWith("status");
    api.setSorting.mockClear();

    setCardMatches(true);

    const cardTitles = () =>
      screen
        .getAllByRole("button")
        .map((button) => button.textContent ?? "")
        .filter((text) => text.includes("Earlier") || text.includes("Later"));
    expect(cardTitles()[0]).toContain("Earlier");
    expect(cardTitles()[1]).toContain("Later");

    const trigger = screen.getByRole("button", { name: /^Sort: recurringColumns\.nextDueDate/ });
    await user.click(trigger);
    const menu = await screen.findByRole("menu");
    expect(within(menu).queryByRole("menuitemradio", { name: "recurringColumns.status" })).not.toBeInTheDocument();
    expect(within(menu).getByRole("menuitemradio", { name: "recurringColumns.nextDueDate" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(within(menu).getByRole("menuitemradio", { name: "sort.directions.dateAsc" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await user.click(within(menu).getByRole("menuitemradio", { name: "sort.directions.dateDesc" }));
    expect(cardTitles()[0]).toContain("Later");
    expect(cardTitles()[1]).toContain("Earlier");
    expect(api.setSorting).not.toHaveBeenCalled();
    expect(api.sorting).toEqual({ field: "status", direction: "desc" });

    setCardMatches(false);
    expect(screen.getByRole("columnheader", { name: "recurringColumns.status" })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
    expect(api.setSorting).not.toHaveBeenCalled();
  });

  it("keeps the how-it-works note open on the desktop table", () => {
    render(<RecurringTransactionsTableDisplay />);
    expect(screen.getByRole("heading", { name: "recurringTable.howItWorks.title" })).toBeInTheDocument();
    expect(screen.getByText("recurringTable.howItWorks.descriptionWeb")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "recurringTable.howItWorks.title" }),
    ).not.toBeInTheDocument();
  });

  it("collapses how-it-works to one row on cards and remembers the choice", async () => {
    const user = userEvent.setup();
    const view = renderCards();
    const toggle = screen.getByRole("button", { name: "recurringTable.howItWorks.title" });
    expect(toggle).toHaveClass("h-11");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("recurringTable.howItWorks.descriptionWeb")).not.toBeInTheDocument();

    await user.click(toggle);
    expect(screen.getByText("recurringTable.howItWorks.descriptionWeb")).toBeVisible();
    expect(window.localStorage.getItem(RECURRING_HOW_IT_WORKS_OPEN_KEY)).toBe("1");

    view.unmount();
    renderCards();
    expect(screen.getByRole("button", { name: "recurringTable.howItWorks.title" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("recurringTable.howItWorks.descriptionWeb")).toBeVisible();
  });
});
