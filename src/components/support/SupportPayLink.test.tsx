// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SUPPORT_PAYMENT_URL } from "@/lib/support-payment";
import { SupportPayLink } from "./SupportPayLink";

function stubMatchMedia(touch: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => {
      const matches =
        touch && (query.includes("hover: none") || query.includes("pointer: coarse"));
      return {
        matches,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList;
    }),
  );
}

function renderLink() {
  return render(
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SupportPayLink>Pay</SupportPayLink>
        </TooltipTrigger>
        <TooltipContent>Charge note</TooltipContent>
      </Tooltip>
    </TooltipProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SupportPayLink", () => {
  it("points at the Takbull page", () => {
    stubMatchMedia(false);
    renderLink();
    expect(screen.getByRole("link", { name: "Pay" })).toHaveAttribute("href", SUPPORT_PAYMENT_URL);
  });

  it("holds the first touch tap so the tooltip can be read", async () => {
    stubMatchMedia(true);
    renderLink();
    const link = screen.getByRole("link", { name: "Pay" });

    const first = new MouseEvent("click", { bubbles: true, cancelable: true });
    await act(async () => {
      link.dispatchEvent(first);
    });

    expect(first.defaultPrevented).toBe(true);
    expect(screen.getByText("Charge note")).toBeInTheDocument();

    const second = new MouseEvent("click", { bubbles: true, cancelable: true });
    await act(async () => {
      link.dispatchEvent(second);
    });

    expect(second.defaultPrevented).toBe(false);
  });

  it("follows the link on the first click from a mouse", () => {
    stubMatchMedia(false);
    renderLink();
    const link = screen.getByRole("link", { name: "Pay" });
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(false);
  });
});
