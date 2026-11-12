// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOBILE_CARD_QUERY } from "@/lib/responsive";
import { useMobileCardLayout } from "./useMobileCardLayout";

const listeners = new Map<string, Set<(event: { matches: boolean }) => void>>();
let cardMatches = false;

function installMatchMedia() {
  listeners.clear();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => {
      let bucket = listeners.get(query);
      if (!bucket) {
        bucket = new Set();
        listeners.set(query, bucket);
      }
      const queryListeners = bucket;
      return {
        get matches() {
          return query === MOBILE_CARD_QUERY ? cardMatches : false;
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
    listeners.get(MOBILE_CARD_QUERY)?.forEach((listener) => {
      listener({ matches: next });
    });
  });
}

function Probe({ defer }: { defer: boolean }) {
  const cards = useMobileCardLayout(defer);
  return <div data-testid="layout" data-cards={String(cards)} />;
}

describe("useMobileCardLayout", () => {
  beforeEach(() => {
    cardMatches = false;
    installMatchMedia();
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("follows the shared card query and scrolls the page and the app shell", () => {
    const scroller = document.createElement("div");
    const main = document.createElement("main");
    scroller.appendChild(main);
    document.body.appendChild(scroller);
    scroller.scrollTop = 80;

    render(<Probe defer={false} />);
    expect(screen.getByTestId("layout")).toHaveAttribute("data-cards", "false");
    expect(window.scrollTo).not.toHaveBeenCalled();

    setCardMatches(true);

    expect(screen.getByTestId("layout")).toHaveAttribute("data-cards", "true");
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    expect(scroller.scrollTop).toBe(0);
  });

  it("keeps the mounted view while deferred and applies the live query when it clears", () => {
    cardMatches = true;
    const view = render(<Probe defer={false} />);
    expect(screen.getByTestId("layout")).toHaveAttribute("data-cards", "true");
    vi.mocked(window.scrollTo).mockClear();

    view.rerender(<Probe defer />);
    setCardMatches(false);
    expect(screen.getByTestId("layout")).toHaveAttribute("data-cards", "true");
    setCardMatches(true);
    expect(screen.getByTestId("layout")).toHaveAttribute("data-cards", "true");
    setCardMatches(false);
    expect(screen.getByTestId("layout")).toHaveAttribute("data-cards", "true");
    expect(window.scrollTo).not.toHaveBeenCalled();

    view.rerender(<Probe defer={false} />);

    expect(screen.getByTestId("layout")).toHaveAttribute("data-cards", "false");
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("does not switch or scroll when a deferred crossing ends on the committed value", () => {
    cardMatches = true;
    const view = render(<Probe defer={false} />);
    expect(screen.getByTestId("layout")).toHaveAttribute("data-cards", "true");
    vi.mocked(window.scrollTo).mockClear();

    view.rerender(<Probe defer />);
    setCardMatches(false);
    setCardMatches(true);
    expect(screen.getByTestId("layout")).toHaveAttribute("data-cards", "true");

    view.rerender(<Probe defer={false} />);
    expect(screen.getByTestId("layout")).toHaveAttribute("data-cards", "true");
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
