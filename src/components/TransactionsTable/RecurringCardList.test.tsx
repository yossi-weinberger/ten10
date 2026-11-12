// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MobileSortPicker } from "@/components/MobileSortPicker";
import { formatDisplayDate } from "@/lib/calendar/display-date";
import { useCalendarPreview } from "@/lib/calendar/calendar-preview";
import {
  COARSE_POINTER_QUERY,
  MOBILE_CARD_QUERY,
  MOBILE_SELECTION_CLEARANCE_CLASS,
} from "@/lib/responsive";
import type { RecurringTransaction } from "@/types/transaction";
import { RecurringCardList } from "./RecurringCardList";

const i18nDir = vi.hoisted(() => ({ current: "ltr" as "ltr" | "rtl" }));
const i18nLanguage = vi.hoisted(() => ({ current: "en" }));
const trackChomesh = vi.hoisted(() => ({ current: false }));
const displayCalendar = vi.hoisted(() => ({
  calendarType: "gregorian" as "gregorian" | "hebrew",
  showSecondaryDate: false,
}));

vi.mock("framer-motion", () => ({
  useReducedMotion: () => false,
}));

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (key: string, params?: { count?: number; date?: string; field?: string; direction?: string }) => {
      if (key === "sort.chip" && params?.field) {
        return `Sort: ${params.field} · ${params.direction ?? ""}`;
      }
      if (params && typeof params.count === "number") return `${key}:${params.count}`;
      if (params && typeof params.date === "string") return `${key}:${params.date}`;
      return key;
    },
    i18n: {
      dir: () => i18nDir.current,
      language: i18nLanguage.current,
    },
  }),
}));

vi.mock("@/lib/store", () => ({
  useDonationStore: (
    selector: (state: {
      settings: {
        trackChomeshSeparately: boolean;
        calendarType: "gregorian" | "hebrew";
        showSecondaryDate: boolean;
      };
    }) => unknown,
  ) =>
    selector({
      settings: {
        trackChomeshSeparately: trackChomesh.current,
        calendarType: displayCalendar.calendarType,
        showSecondaryDate: displayCalendar.showSecondaryDate,
      },
    }),
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
    matches: matches && (query === MOBILE_CARD_QUERY || query === COARSE_POINTER_QUERY),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  });
}

type SwipeViewport = { width: number; height: number; pointer: "fine" | "coarse" };

function viewportFeatureMatches(feature: string, viewport: SwipeViewport): boolean {
  const body = feature.replace(/[()]/g, "").trim();
  if (body.startsWith("pointer:")) {
    return body.slice("pointer:".length).trim() === viewport.pointer;
  }
  const maxWidth = /^max-width:\s*(\d+)px$/.exec(body);
  if (maxWidth) return viewport.width <= Number(maxWidth[1]);
  const maxHeight = /^max-height:\s*(\d+)px$/.exec(body);
  if (maxHeight) return viewport.height <= Number(maxHeight[1]);
  return false;
}

function viewportMatchMedia(viewport: SwipeViewport) {
  return (query: string) => ({
    matches: query.split(",").some((clause) =>
      clause.split(/\band\b/).every((feature) => viewportFeatureMatches(feature, viewport)),
    ),
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
  i18nLanguage.current = "en";
  trackChomesh.current = false;
  displayCalendar.calendarType = "gregorian";
  displayCalendar.showSecondaryDate = false;
  useCalendarPreview.getState().clearPreview();
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
  it("masks description, amount, frequency, and the short next date on a neutral card", () => {
    render(
      <RecurringCardList
        recurring={[recurringRow({ id: "rent", description: "Rent" })]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const card = cardTitled("Rent");
    expect(card.className).toContain("overflow-hidden");
    expect(card.className).toContain("bg-white");
    expect(card.className).not.toContain("bg-red-50");
    expect(card.querySelector(".bg-red-100")).toBeTruthy();
    expect(card.querySelector(".size-10.rounded-full")).toBeTruthy();
    const meta = Array.from(card.querySelectorAll("div")).find((el) =>
      el.className.includes("flex-nowrap"),
    );
    expect(meta?.className).toContain("flex-nowrap");
    expect(meta?.className).toContain("max-[389px]:flex-wrap");
    expectMasked(screen.getByText("Rent").closest("[data-ph-mask]"));
    expectMasked(screen.getByText("100 ILS").closest("[data-ph-mask]"));
    expectMasked(screen.getByText("recurring.frequencies.monthly").closest("[data-ph-mask]"));
    expect(screen.queryByText("recurring.calendars.gregorian")).not.toBeInTheDocument();
    expectMasked(screen.getByText("cards.nextShort:01/02/2026").closest("[data-ph-mask]"));
    const cardStatus = within(card).getByText("recurring.statuses.active");
    expect(cardStatus).toHaveClass("sr-only");
    expect(cardStatus.closest("[data-ph-mask]")).toBeNull();
    expect(card).toHaveAccessibleName(expect.stringContaining("recurring.statuses.active"));

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

  it("shows a masked Hebrew calendar badge and the full next date", () => {
    i18nLanguage.current = "he";
    render(
      <RecurringCardList
        recurring={[
          recurringRow({
            id: "rent",
            description: "Rent",
            calendar_type: "hebrew",
            next_due_date: "2027-03-05",
            type: "income",
          }),
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const card = cardTitled("Rent");
    expect(card.className).toContain("bg-white");
    expect(card.className).not.toContain("bg-green-50");
    expect(card.querySelector(".bg-green-100")).toBeTruthy();
    expectMasked(screen.getByText("recurring.calendars.hebrew").closest("[data-ph-mask]"));
    expectMasked(screen.getByText("cards.nextShort:05/03/2027").closest("[data-ph-mask]"));
  });

  it("follows the Gregorian display calendar and a masked Hebrew secondary date", () => {
    displayCalendar.showSecondaryDate = true;
    render(
      <RecurringCardList
        recurring={[recurringRow({ id: "rent", next_due_date: "2026-02-01" })]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const secondary = formatDisplayDate("2026-02-01", {
      calendarType: "gregorian",
      showSecondaryDate: true,
      language: "en",
      style: "numeric",
    }).secondary;
    expectMasked(screen.getByText("cards.nextShort:01/02/2026").closest("[data-ph-mask]"));
    expect(secondary).toBeTruthy();
    expectMasked(screen.getByText(secondary ?? "").closest("[data-ph-mask]"));
  });

  it("follows the Hebrew display calendar and keeps the full Gregorian secondary date", () => {
    displayCalendar.calendarType = "hebrew";
    displayCalendar.showSecondaryDate = true;
    i18nLanguage.current = "en";
    render(
      <RecurringCardList
        recurring={[
          recurringRow({ id: "rent", next_due_date: "2026-02-01" }),
          recurringRow({ id: "later", description: "Later", next_due_date: "2027-03-05" }),
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const current = formatDisplayDate("2026-02-01", {
      calendarType: "hebrew",
      showSecondaryDate: true,
      language: "en",
      style: "numeric",
    });
    const later = formatDisplayDate("2027-03-05", {
      calendarType: "hebrew",
      showSecondaryDate: true,
      language: "en",
      style: "numeric",
    });
    expectMasked(screen.getByText(`cards.nextShort:${current.primary}`).closest("[data-ph-mask]"));
    expectMasked(screen.getByText("01/02/2026").closest("[data-ph-mask]"));
    expectMasked(screen.getByText(`cards.nextShort:${later.primary}`).closest("[data-ph-mask]"));
    expectMasked(screen.getByText("05/03/2027").closest("[data-ph-mask]"));
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
    expectMasked(within(drawer).getByText("01/01/2026").closest("[data-ph-mask]"));
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
    expect(within(drawer).queryByText("recurring.statuses.active")).not.toBeInTheDocument();
    expect(within(drawer).getByText("Rent").parentElement?.textContent).toContain("types.expense");
    expect(within(drawer).getByText("100 ILS").parentElement?.textContent).not.toContain("types.expense");
    expect(drawer.querySelector(".lucide-refresh-cw")).toBeNull();
  });

  it("shows a non-active status row and a conversion pill, and hides an empty payment method", async () => {
    const user = userEvent.setup();
    render(
      <RecurringCardList
        recurring={[
          recurringRow({
            id: "paused",
            description: "Paused",
            status: "paused",
            payment_method: "   ",
            original_amount: 50,
            original_currency: "USD",
            conversion_rate: 3.7,
          }),
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(cardTitled("Paused"));
    const drawer = await screen.findByRole("dialog");
    const status = within(drawer).getByText("recurring.statuses.paused");
    expect(status.closest("[data-ph-mask]")).toBeNull();
    expect(within(drawer).queryByText("columns.paymentMethod")).not.toBeInTheDocument();
    expect(within(drawer).queryByText("-")).not.toBeInTheDocument();
    expect(within(drawer).getByText(/drawer\.convertedPrefix/)).toBeInTheDocument();
    const detail = drawer.querySelector("bdi");
    expect(detail?.textContent).toContain("50");
    expect(detail?.textContent).toContain("3.70");
    expectMasked(detail);
    expect(drawer.querySelector(".lucide-refresh-cw")).not.toBeNull();
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

    const trigger = screen.getByRole("button", { name: /^Sort: recurring-next-due/ });
    expect(trigger).toHaveClass("h-9", "rounded-full", "px-2.5", "text-[13px]");
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

  it("gives a fine pointer at 390px no swipe strip, and a click opens the drawer", async () => {
    vi.stubGlobal(
      "matchMedia",
      viewportMatchMedia({ width: 390, height: 844, pointer: "fine" }),
    );
    render(
      <RecurringCardList
        recurring={[recurringRow({ id: "rent", description: "Rent" })]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const card = cardTitled("Rent");
    expect(screen.queryByRole("button", { name: "actions.edit", hidden: true })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "actions.delete", hidden: true })).not.toBeInTheDocument();
    expect(card.closest("[data-swipe-row]")?.querySelector("[class*='end-0']")).toBeNull();
    expect(card.parentElement).toHaveAttribute("data-swipe-row");
    swipe(card, "open");
    expect(readTranslateX(card)).toBe(0);
    expect(document.body.dataset.mobileSwipeOpen).toBeUndefined();

    fireEvent.click(card);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("swipes on a coarse pointer at 390px", () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "matchMedia",
      viewportMatchMedia({ width: 390, height: 844, pointer: "coarse" }),
    );
    render(
      <RecurringCardList
        recurring={[recurringRow({ id: "rent", description: "Rent" })]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const card = cardTitled("Rent");
    swipe(card, "open");
    settleSwipe();
    expect(readTranslateX(card)).toBe(-128);
    expect(card.closest("[data-swipe-row]")?.querySelector("[class*='end-0']")).toBeTruthy();
  });

  it("swipes on a coarse landscape viewport at 844x390", () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "matchMedia",
      viewportMatchMedia({ width: 844, height: 390, pointer: "coarse" }),
    );
    render(
      <RecurringCardList
        recurring={[recurringRow({ id: "rent", description: "Rent" })]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const card = cardTitled("Rent");
    swipe(card, "open");
    settleSwipe();
    expect(readTranslateX(card)).toBe(-128);
    expect(card.closest("[data-swipe-row]")?.querySelector("[class*='end-0']")).toBeTruthy();
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
