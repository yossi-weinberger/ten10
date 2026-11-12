// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { useRef, useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COARSE_POINTER_QUERY } from "@/lib/responsive";
import { SwipeableCardRow, type SwipeCardAction } from "./SwipeableCardRow";

const reducedMotion = vi.hoisted(() => ({ current: false }));

vi.mock("framer-motion", () => ({
  useReducedMotion: () => reducedMotion.current,
}));

function phoneMatchMedia(matches: boolean) {
  return (query: string) => ({
    matches:
      matches &&
      (query === COARSE_POINTER_QUERY ||
        (query.includes("max-width: 767px") && query.includes("pointer: coarse"))),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
    onchange: null,
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

function Harness({
  isRTL = false,
  inSelectionMode = false,
  selectionDisabled = false,
  onActivate = () => undefined,
  onToggleSelected,
  actions,
}: {
  isRTL?: boolean;
  inSelectionMode?: boolean;
  selectionDisabled?: boolean;
  onActivate?: () => void;
  onToggleSelected?: (id: string) => void;
  actions: readonly SwipeCardAction[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const longPressTriggeredRef = useRef(false);
  return (
    <SwipeableCardRow
      id="row-1"
      actions={actions}
      isSelected={false}
      inSelectionMode={inSelectionMode}
      selectionDisabled={selectionDisabled}
      onToggleSelected={onToggleSelected}
      onActivate={onActivate}
      onKeyDown={() => undefined}
      longPressTriggeredRef={longPressTriggeredRef}
      isRTL={isRTL}
      openId={openId}
      onSwipeOpen={setOpenId}
      onSwipeClose={() => setOpenId(null)}
    >
      Salary
    </SwipeableCardRow>
  );
}

const editAndDelete = (onEdit: () => void, onDelete: () => void): SwipeCardAction[] => [
  {
    icon: <span data-testid="edit-icon" />,
    label: "Edit",
    variant: "default",
    onClick: onEdit,
  },
  {
    icon: <span data-testid="delete-icon" />,
    label: "Delete",
    variant: "destructive",
    onClick: onDelete,
  },
];

function cardTitled(title: string): HTMLElement {
  const card = screen.getAllByRole("button").find((el) => el.textContent?.includes(title));
  if (!card) throw new Error(`missing card ${title}`);
  return card;
}

function swipe(card: HTMLElement, direction: "open" | "close", isRTL: boolean) {
  const openMovesLeft = !isRTL;
  const moveLeft = direction === "open" ? openMovesLeft : !openMovesLeft;
  const startX = 160;
  const endX = moveLeft ? 20 : 300;
  act(() => {
    fireEvent.pointerDown(card, { clientX: startX, clientY: 40, pointerType: "touch" });
    fireEvent.pointerMove(card, { clientX: endX, clientY: 40, pointerType: "touch" });
    fireEvent.pointerUp(card, { clientX: endX, clientY: 40, pointerType: "touch" });
  });
}

function readTranslateX(card: HTMLElement): number {
  const parent = card.parentElement;
  const layer = parent && !parent.hasAttribute("data-swipe-row") ? parent : card;
  const transform = layer.style.transform;
  const match = /translate(?:3d|X)\(\s*([-\d.]+)px/.exec(transform);
  return match ? Number(match[1]) : 0;
}

describe("SwipeableCardRow", () => {
  beforeEach(() => {
    reducedMotion.current = false;
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", phoneMatchMedia(true));
  });

  afterEach(() => {
    cleanup();
    delete document.body.dataset.mobileSwipeOpen;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("renders action labels, icons, and variants on an inline-end strip", () => {
    const markup = renderToStaticMarkup(
      <Harness actions={editAndDelete(() => undefined, () => undefined)} />,
    );

    expect(markup).toContain('aria-label="Edit"');
    expect(markup).toContain('aria-label="Delete"');
    expect(markup).toContain("end-0");
    expect(markup).toContain("ps-2");
    expect(markup).toContain('data-swipe-row="row-1"');
    expect(markup).not.toContain("disabled=");

    render(<Harness actions={editAndDelete(() => undefined, () => undefined)} />);
    const edit = screen.getByRole("button", { name: "Edit", hidden: true });
    const remove = screen.getByRole("button", { name: "Delete", hidden: true });
    expect(edit.querySelector("[data-testid='edit-icon']")).toBeTruthy();
    expect(remove.querySelector("[data-testid='delete-icon']")).toBeTruthy();
    expect(edit.className).toContain("bg-primary");
    expect(remove.className).toContain("bg-destructive");
    expect(edit.parentElement?.className).toContain("end-0");
  });

  it("opens on a finger-left swipe in LTR and ignores finger-right", () => {
    render(<Harness actions={editAndDelete(() => undefined, () => undefined)} />);
    const card = cardTitled("Salary");

    swipe(card, "close", false);
    expect(readTranslateX(card)).toBe(0);

    swipe(card, "open", false);
    act(() => {
      vi.advanceTimersByTime(220);
    });
    expect(readTranslateX(card)).toBe(-128);
    expect(card.closest("[data-swipe-row]")?.firstElementChild?.className).toContain("end-0");
  });

  it("opens on a finger-right swipe in RTL and ignores finger-left", () => {
    render(<Harness isRTL actions={editAndDelete(() => undefined, () => undefined)} />);
    const card = cardTitled("Salary");

    swipe(card, "close", true);
    expect(readTranslateX(card)).toBe(0);

    swipe(card, "open", true);
    act(() => {
      vi.advanceTimersByTime(220);
    });
    expect(readTranslateX(card)).toBe(128);
    expect(card.closest("[data-swipe-row]")?.firstElementChild?.className).toContain("end-0");
  });

  it("runs the action, closes the row, and returns focus to the card", () => {
    const onEdit = vi.fn();
    render(<Harness actions={editAndDelete(onEdit, () => undefined)} />);
    const card = cardTitled("Salary");
    swipe(card, "open", false);

    const edit = screen.getByRole("button", { name: "Edit" });
    edit.focus();
    fireEvent.click(edit);

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(card);
    act(() => {
      vi.advanceTimersByTime(220);
    });
    expect(readTranslateX(card)).toBe(0);
  });

  it("does not run a disabled action", () => {
    const onPause = vi.fn();
    const actions: SwipeCardAction[] = [
      ...editAndDelete(() => undefined, () => undefined),
      {
        icon: <span />,
        label: "Pause",
        variant: "default",
        disabled: true,
        onClick: onPause,
      },
    ];
    render(<Harness actions={actions} />);
    const card = cardTitled("Salary");
    swipe(card, "open", false);

    const pause = screen.getByRole("button", { name: "Pause" });
    expect(pause).toBeDisabled();
    fireEvent.click(pause);
    expect(onPause).not.toHaveBeenCalled();
  });

  it("does not swipe while selection mode is active", () => {
    const onToggleSelected = vi.fn();
    render(
      <Harness
        inSelectionMode
        onToggleSelected={onToggleSelected}
        actions={editAndDelete(() => undefined, () => undefined)}
      />,
    );
    const card = cardTitled("Salary");
    swipe(card, "open", false);
    expect(readTranslateX(card)).toBe(0);
    expect(onToggleSelected).not.toHaveBeenCalled();
  });

  it("selects on long press and skips selection when it is disabled", () => {
    const onToggleSelected = vi.fn();
    const { rerender } = render(
      <Harness
        onToggleSelected={onToggleSelected}
        actions={editAndDelete(() => undefined, () => undefined)}
      />,
    );
    const card = cardTitled("Salary");
    act(() => {
      fireEvent.pointerDown(card, { clientX: 40, clientY: 40, pointerType: "touch" });
      vi.advanceTimersByTime(450);
    });
    expect(onToggleSelected).toHaveBeenCalledWith("row-1");

    onToggleSelected.mockClear();
    rerender(
      <Harness
        selectionDisabled
        onToggleSelected={onToggleSelected}
        actions={editAndDelete(() => undefined, () => undefined)}
      />,
    );
    act(() => {
      fireEvent.pointerDown(cardTitled("Salary"), { clientX: 40, clientY: 40, pointerType: "touch" });
      vi.advanceTimersByTime(450);
    });
    expect(onToggleSelected).not.toHaveBeenCalled();
  });

  it("gives a fine pointer at 390px no swipe strip, and a click still activates the card", () => {
    vi.stubGlobal(
      "matchMedia",
      viewportMatchMedia({ width: 390, height: 844, pointer: "fine" }),
    );
    const onActivate = vi.fn();
    render(<Harness onActivate={onActivate} actions={editAndDelete(() => undefined, () => undefined)} />);
    const card = cardTitled("Salary");

    expect(screen.queryByRole("button", { name: "Edit", hidden: true })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete", hidden: true })).not.toBeInTheDocument();
    expect(card.parentElement).toHaveAttribute("data-swipe-row");
    swipe(card, "open", false);
    expect(readTranslateX(card)).toBe(0);
    fireEvent.click(card);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("swipes on a coarse pointer at 390px and on coarse landscape at 844x390", () => {
    for (const viewport of [
      { width: 390, height: 844, pointer: "coarse" as const },
      { width: 844, height: 390, pointer: "coarse" as const },
    ]) {
      cleanup();
      vi.stubGlobal("matchMedia", viewportMatchMedia(viewport));
      render(<Harness actions={editAndDelete(() => undefined, () => undefined)} />);
      const card = cardTitled("Salary");
      swipe(card, "open", false);
      act(() => {
        vi.advanceTimersByTime(220);
      });
      expect(readTranslateX(card)).toBe(-128);
      expect(card.closest("[data-swipe-row]")?.querySelector("[class*='end-0']")).toBeTruthy();
    }
  });
});
