// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MobileSortPicker } from "@/components/MobileSortPicker";
import { MOBILE_CARD_QUERY, MOBILE_SELECTION_CLEARANCE_CLASS } from "@/lib/responsive";
import type { RecurringTransaction } from "@/types/transaction";
import { RecurringCardList } from "./RecurringCardList";

const i18nDir = vi.hoisted(() => ({ current: "ltr" as "ltr" | "rtl" }));
const trackChomesh = vi.hoisted(() => ({ current: false }));

vi.mock("framer-motion", () => ({
  useReducedMotion: () => false,
}));

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (key: string, params?: { count?: number }) =>
      params && typeof params.count === "number" ? `${key}:${params.count}` : key,
    i18n: {
      dir: () => i18nDir.current,
      language: "en",
    },
  }),
}));

vi.mock("@/lib/store", () => ({
  useDonationStore: (
    selector: (state: { settings: { trackChomeshSeparately: boolean } }) => unknown,
  ) => selector({ settings: { trackChomeshSeparately: trackChomesh.current } }),
}));

vi.mock("@/lib/calendar/use-display-date", () => ({
  useDisplayDate: () => (date: string) => ({ primary: date, secondary: null }),
}));

vi.mock("@/components/Currency/CurrencyConversionInfo", () => ({
  CurrencyConversionInfo: ({ amount, currency }: { amount: number; currency: string }) => (
    <span>{`${amount} ${currency}`}</span>
  ),
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
    payment_method: "family-card",
    category: "School fees",
    ...overrides,
  };
}

function phoneMatchMedia(matches: boolean) {
  return (query: string) => ({
    matches: matches && query === MOBILE_CARD_QUERY,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  });
}

function cardTitled(title: string): HTMLElement {
  const card = screen.getAllByRole("button").find((element) => element.textContent?.includes(title));
  if (!card) throw new Error(`missing card ${title}`);
  return card;
}

function readTranslateX(card: HTMLElement): number {
  const parent = card.parentElement;
  const layer = parent && !parent.hasAttribute("data-swipe-row") ? parent : card;
  const transform = layer.style.transform;
  const match = /translate(?:3d|X)\(\s*([-\d.]+)px/.exec(transform);
  return match ? Number(match[1]) : 0;
}

function swipe(card: HTMLElement, direction: "open" | "close") {
  const openMovesLeft = i18nDir.current !== "rtl";
  const moveLeft = direction === "open" ? openMovesLeft : !openMovesLeft;
  const startX = 160;
  const endX = moveLeft ? 20 : 300;
  act(() => {
    fireEvent.pointerDown(card, { clientX: startX, clientY: 40, pointerType: "touch" });
    fireEvent.pointerMove(card, { clientX: endX, clientY: 40, pointerType: "touch" });
    fireEvent.pointerUp(card, { clientX: endX, clientY: 40, pointerType: "touch" });
  });
}

function settleSwipe() {
  act(() => {
    vi.advanceTimersByTime(220);
  });
}

function expectMasked(element: Element | null) {
  expect(element).toHaveAttribute("data-ph-mask", "");
  expect(element?.classList.contains("ph-mask")).toBe(true);
  expect(element?.classList.contains("ph-sensitive")).toBe(true);
}

function SelectionHarness({
  rows,
  onEdit = vi.fn(),
  onDelete = vi.fn(),
}: {
  rows: RecurringTransaction[];
  onEdit?: (row: RecurringTransaction) => void;
  onDelete?: (row: RecurringTransaction) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  return (
    <RecurringCardList
      recurring={rows}
      selectedIds={selectedIds}
      onToggleSelected={(id) => {
        setSelectedIds((current) => {
          const next = new Set(current);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      }}
      onClearSelection={() => setSelectedIds(new Set())}
      selectedCountLabel={`count:${selectedIds.size}`}
      editLabel="edit-bulk"
      deleteLabel="delete-bulk"
      clearLabel="clear-bulk"
      bulkToolbarAriaLabel="bulk-region"
      onSelectionEdit={vi.fn()}
      onSelectionDelete={vi.fn()}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => undefined;
  HTMLElement.prototype.releasePointerCapture = () => undefined;
  HTMLElement.prototype.scrollIntoView = () => undefined;
});

beforeEach(() => {
  i18nDir.current = "ltr";
  trackChomesh.current = false;
  vi.stubGlobal("matchMedia", phoneMatchMedia(false));
});

afterEach(() => {
  cleanup();
  document.body.style.pointerEvents = "";
  document.body.style.overflow = "";
  document.body.removeAttribute("data-scroll-locked");
  vi.useRealTimers();
});

describe("RecurringCardList", () => {
  it("masks description, amount, frequency, calendar, and next due date on the card", () => {
    render(
      <RecurringCardList
        recurring={[recurringRow({ id: "rent", description: "Rent" })]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expectMasked(screen.getByText("Rent").closest("[data-ph-mask]"));
    expectMasked(screen.getByText("100 ILS").closest("[data-ph-mask]"));
    expectMasked(screen.getByText("recurring.frequencies.monthly").closest("[data-ph-mask]"));
    expectMasked(screen.getByText("recurring.calendars.gregorian").closest("[data-ph-mask]"));
    expectMasked(screen.getByText("2026-02-01").closest("[data-ph-mask]"));

    const statuses = screen.getAllByText("recurring.statuses.active");
    expect(statuses.length).toBeGreaterThan(0);
    for (const status of statuses) {
      expect(status.closest("[data-ph-mask]")).toBeNull();
    }
    const progress = screen.getByText("3/12");
    expect(progress.closest("[data-ph-mask]")).toBeNull();
    expect(screen.queryByText("School fees")).not.toBeInTheDocument();
    expect(screen.queryByText("family-card")).not.toBeInTheDocument();
    expect(screen.queryByText("cards.chomesh")).not.toBeInTheDocument();
    expect(document.querySelector(".ph-no-capture")).toBeNull();
  });

  it("keeps chomesh and category in the drawer only, and masks every sensitive drawer value", async () => {
    trackChomesh.current = true;
    const user = userEvent.setup();
    render(
      <RecurringCardList
        recurring={[
          recurringRow({
            id: "rent",
            description: "Rent",
            is_chomesh: true,
            recipient: "Ada",
            type: "donation",
          }),
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryByText("cards.chomesh")).not.toBeInTheDocument();
    expect(screen.queryByText("Ada")).not.toBeInTheDocument();
    expect(document.querySelector(".lucide-badge-check")).toBeNull();

    await user.click(cardTitled("Rent"));
    const drawer = await screen.findByRole("dialog");

    expectMasked(within(drawer).getByText("School fees").closest("[data-ph-mask]"));
    expectMasked(within(drawer).getByText("Ada").closest("[data-ph-mask]"));
    expectMasked(within(drawer).getByText("family-card").closest("[data-ph-mask]"));
    expectMasked(within(drawer).getByText("2026-01-01").closest("[data-ph-mask]"));
    expectMasked(within(drawer).getByText("cards.chomesh").closest("[data-ph-mask]"));
    const chomeshIcon = drawer.querySelector(".lucide-badge-check");
    expect(chomeshIcon).not.toBeNull();
    expectMasked(chomeshIcon?.closest("[data-ph-mask]") ?? null);
    expect(within(drawer).queryByText("Yes")).not.toBeInTheDocument();
    expect(within(drawer).queryByText("No")).not.toBeInTheDocument();
    expect(drawer.querySelector(".ph-no-capture")).toBeNull();
    expect(within(drawer).getByText("3/12").closest("[data-ph-mask]")).toBeNull();
  });

  it("omits the chomesh row when the flag is off", async () => {
    const user = userEvent.setup();
    render(
      <RecurringCardList
        recurring={[recurringRow({ id: "rent", is_chomesh: false })]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(cardTitled("Rent"));
    const drawer = await screen.findByRole("dialog");
    expect(within(drawer).queryByText("cards.chomesh")).not.toBeInTheDocument();
    expect(drawer.querySelector(".lucide-badge-check")).toBeNull();
  });

  it("groups by status in a fixed order and keeps each group's existing order", () => {
    render(
      <RecurringCardList
        recurring={[
          recurringRow({ id: "paused", status: "paused", description: "Paused", next_due_date: "2026-02-01" }),
          recurringRow({ id: "active-late", description: "Later", next_due_date: "2026-05-01" }),
          recurringRow({ id: "cancelled", status: "cancelled", description: "Cancelled", next_due_date: "2026-04-01" }),
          recurringRow({ id: "active-early", description: "Earlier", next_due_date: "2026-01-01" }),
          recurringRow({ id: "done", status: "completed", description: "Done", next_due_date: "2026-03-01" }),
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const headers = Array.from(document.querySelectorAll(".sticky")).map((node) => node.textContent);
    expect(headers).toEqual([
      "recurring.statuses.active",
      "recurring.statuses.paused",
      "recurring.statuses.completed",
      "recurring.statuses.cancelled",
    ]);
    const cards = screen.getAllByRole("button").map((node) => node.textContent ?? "");
    const later = cards.findIndex((text) => text.includes("Later"));
    const earlier = cards.findIndex((text) => text.includes("Earlier"));
    const paused = cards.findIndex((text) => text.includes("Paused"));
    const done = cards.findIndex((text) => text.includes("Done"));
    const cancelled = cards.findIndex((text) => text.includes("Cancelled"));
    expect(later).toBeLessThan(earlier);
    expect(earlier).toBeLessThan(paused);
    expect(paused).toBeLessThan(done);
    expect(done).toBeLessThan(cancelled);
  });

  it("places the sort picker on the first group and defaults to next due date", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RecurringCardList
        recurring={[recurringRow({ id: "rent" })]}
        sortControl={
          <MobileSortPicker
            fields={[
              { field: "description", label: "recurring-description", directionKind: "text" },
              { field: "amount", label: "recurring-amount", directionKind: "amount" },
              { field: "next_due_date", label: "recurring-next-due", directionKind: "date" },
            ]}
            field="next_due_date"
            direction="asc"
            onChange={onChange}
          />
        }
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("button", { name: "sort.sortBy: recurring-next-due" });
    expect(trigger.closest("[data-sort-chip-slot]")).toHaveAttribute("data-sort-chip-slot", "separator");
    await user.click(trigger);
    await user.click(screen.getByRole("menuitemradio", { name: "recurring-amount" }));
    expect(onChange).toHaveBeenCalledWith("amount");
  });

  it("shows the sort control for loading, empty, and error states", () => {
    const sort = <div data-testid="sort-chip">sort</div>;
    const { rerender } = render(
      <RecurringCardList recurring={[]} loading sortControl={sort} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.getByTestId("sort-chip")).toBeInTheDocument();
    expect(document.querySelectorAll(".animate-pulse")).toHaveLength(10);

    rerender(
      <RecurringCardList recurring={[]} sortControl={sort} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.getByText("recurringTable.noData")).toBeInTheDocument();
    expect(screen.getByTestId("sort-chip")).toBeInTheDocument();

    rerender(
      <RecurringCardList
        recurring={[]}
        error="offline"
        sortControl={sort}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("messages.loadingError")).toBeInTheDocument();
    expect(screen.queryByText("recurringTable.noData")).not.toBeInTheDocument();

    rerender(
      <RecurringCardList
        recurring={[recurringRow({ id: "rent" })]}
        error="stale"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("messages.loadingError")).toBeInTheDocument();
    expect(screen.getByText("Rent")).toBeInTheDocument();
  });

  it("selects on long press and toggles with a tap, and pads the list while the bar is shown", () => {
    vi.useFakeTimers();
    render(
      <SelectionHarness
        rows={[
          recurringRow({ id: "rent", description: "Rent" }),
          recurringRow({ id: "net", description: "Internet" }),
        ]}
      />,
    );

    const rent = cardTitled("Rent");
    act(() => {
      fireEvent.pointerDown(rent, { clientX: 20, clientY: 20, pointerType: "touch" });
      vi.advanceTimersByTime(450);
      fireEvent.pointerUp(rent);
    });
    fireEvent.click(rent);

    const region = screen.getByRole("region", { name: "bulk-region" });
    expect(region).toHaveTextContent("count:1");
    expect(cardTitled("Rent")).toHaveAttribute("aria-pressed", "true");
    const list = cardTitled("Rent").parentElement?.parentElement;
    expect(list?.className).toContain(MOBILE_SELECTION_CLEARANCE_CLASS);

    fireEvent.click(cardTitled("Internet"));
    expect(screen.getByRole("region", { name: "bulk-region" })).toHaveTextContent("count:2");

    fireEvent.click(cardTitled("Rent"));
    expect(screen.getByRole("region", { name: "bulk-region" })).toHaveTextContent("count:1");
  });

  it("disables edit for a completed row on the swipe action and in the drawer", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", phoneMatchMedia(true));
    const onEdit = vi.fn();
    render(
      <RecurringCardList
        recurring={[recurringRow({ id: "done", status: "completed", description: "Finished" })]}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    );

    const card = cardTitled("Finished");
    swipe(card, "open");
    settleSwipe();
    const editAction = screen.getByRole("button", { name: "actions.edit" });
    expect(editAction).toBeDisabled();
    fireEvent.click(editAction);
    expect(onEdit).not.toHaveBeenCalled();
    swipe(card, "close");
    settleSwipe();

    vi.useRealTimers();
    const user = userEvent.setup();
    await user.click(cardTitled("Finished"));
    const drawer = await screen.findByRole("dialog");
    expect(within(drawer).getByRole("button", { name: "actions.edit" })).toBeDisabled();
  });

  it("calls onDelete from an open swipe and from the drawer without deleting by itself", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", phoneMatchMedia(true));
    const onDelete = vi.fn();
    render(
      <RecurringCardList
        recurring={[recurringRow({ id: "rent", description: "Rent" })]}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />,
    );

    const card = cardTitled("Rent");
    swipe(card, "open");
    settleSwipe();
    expect(readTranslateX(card)).toBe(-128);

    fireEvent.click(screen.getAllByRole("button", { name: "actions.delete" })[0]);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete.mock.calls[0][0].id).toBe("rent");

    swipe(card, "close");
    settleSwipe();
    vi.useRealTimers();
    const user = userEvent.setup();
    await user.click(cardTitled("Rent"));
    const drawer = await screen.findByRole("dialog");
    await user.click(within(drawer).getByRole("button", { name: "actions.delete" }));
    expect(onDelete).toHaveBeenCalledTimes(2);
  });

  it("reveals swipe actions on the inline end for English and Hebrew", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", phoneMatchMedia(true));
    const { rerender } = render(
      <RecurringCardList
        recurring={[recurringRow({ id: "rent", description: "Rent" })]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const english = cardTitled("Rent");
    swipe(english, "open");
    settleSwipe();
    expect(readTranslateX(english)).toBe(-128);
    const deleteAction = screen.getAllByRole("button", { name: "actions.delete" })[0];
    expect(deleteAction.parentElement?.className).toContain("end-0");

    i18nDir.current = "rtl";
    rerender(
      <RecurringCardList
        recurring={[recurringRow({ id: "rent", description: "Rent" })]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const hebrew = cardTitled("Rent");
    swipe(hebrew, "open");
    settleSwipe();
    expect(readTranslateX(hebrew)).toBe(128);
  });

  it("restores body pointer events and overflow when the drawer unmounts while open", async () => {
    const user = userEvent.setup();
    const view = render(
      <RecurringCardList
        recurring={[recurringRow({ id: "rent", description: "Rent" })]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    await user.click(cardTitled("Rent"));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    document.body.style.pointerEvents = "none";
    document.body.style.overflow = "hidden";
    document.body.setAttribute("data-scroll-locked", "1");

    view.unmount();

    expect(document.body.style.pointerEvents).not.toBe("none");
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(document.body.hasAttribute("data-scroll-locked")).toBe(false);
    expect(document.querySelector("[aria-modal='true']")).toBeNull();
  });
});
