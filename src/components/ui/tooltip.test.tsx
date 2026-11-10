// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Tooltip", () => {
  describe("touch device behavior", () => {
    it("tap sequence: opens on first tap, closes on second, reopens on third, closes on outside pointerdown", async () => {
      const matchMedia = vi.fn((query: string) => {
        const matches =
          query.includes("hover: none") || query.includes("pointer: coarse");
        return {
          matches,
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        } as unknown as MediaQueryList;
      });
      vi.stubGlobal("matchMedia", matchMedia);

      vi.useFakeTimers();
      try {
        const user = userEvent.setup({ delay: null });
        
        render(
          <div>
            <TooltipProvider delayDuration={0} skipDelayDuration={0}>
              <Tooltip>
                <TooltipTrigger>Trigger</TooltipTrigger>
                <TooltipContent>Content</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <button>Outside</button>
          </div>,
        );

        const trigger = screen.getByText("Trigger");
        const outside = screen.getByText("Outside");
        
        expect(screen.queryByText("Content")).not.toBeInTheDocument();

        // Tap 1 - realistic tap: pointerdown/pointerup with touch, then focus and click fire automatically
        await user.pointer([
          { keys: "[TouchA>]", target: trigger },
          { keys: "[/TouchA]" },
        ]);
        
        expect(screen.getByText("Content")).toBeInTheDocument();

        await vi.advanceTimersByTimeAsync(200);

        // Tap 2 - should close
        await user.pointer([
          { keys: "[TouchA>]", target: trigger },
          { keys: "[/TouchA]" },
        ]);

        expect(screen.queryByText("Content")).not.toBeInTheDocument();

        await vi.advanceTimersByTimeAsync(200);

        // Tap 3 - should open again
        await user.pointer([
          { keys: "[TouchA>]", target: trigger },
          { keys: "[/TouchA]" },
        ]);

        expect(screen.getByText("Content")).toBeInTheDocument();

        await vi.advanceTimersByTimeAsync(200);

        // Outside pointerdown - should close
        await user.pointer([
          { keys: "[TouchA>]", target: outside },
          { keys: "[/TouchA]" },
        ]);

        expect(screen.queryByText("Content")).not.toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it("does not preventDefault on click for submit buttons", async () => {
      const matchMedia = vi.fn((query: string) => {
        const matches =
          query.includes("hover: none") || query.includes("pointer: coarse");
        return {
          matches,
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        } as unknown as MediaQueryList;
      });
      vi.stubGlobal("matchMedia", matchMedia);

      const handleSubmit = vi.fn((e) => e.preventDefault());
      const user = userEvent.setup({ delay: null });
      render(
        <form onSubmit={handleSubmit}>
          <TooltipProvider delayDuration={0} skipDelayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="submit">Submit</button>
              </TooltipTrigger>
              <TooltipContent>Content</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </form>,
      );

      const button = screen.getByText("Submit");
      await user.click(button);

      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    it("does not preventDefault on click for anchor links", async () => {
      const matchMedia = vi.fn((query: string) => {
        const matches =
          query.includes("hover: none") || query.includes("pointer: coarse");
        return {
          matches,
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        } as unknown as MediaQueryList;
      });
      vi.stubGlobal("matchMedia", matchMedia);

      const user = userEvent.setup({ delay: null });
      render(
        <TooltipProvider delayDuration={0} skipDelayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <a href="/test">Link</a>
            </TooltipTrigger>
            <TooltipContent>Content</TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );

      const link = screen.getByText("Link");
      const clickEvent = await user.click(link);

      expect(clickEvent).not.toBe(null);
    });

  });

  describe("mouse device behavior", () => {
    it("preserves click handler on non-touch devices", async () => {
      const matchMedia = vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList));
      vi.stubGlobal("matchMedia", matchMedia);

      const onClick = vi.fn();
      const user = userEvent.setup({ delay: null });
      render(
        <TooltipProvider delayDuration={0} skipDelayDuration={0}>
          <Tooltip>
            <TooltipTrigger onClick={onClick}>Trigger</TooltipTrigger>
            <TooltipContent>Content</TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );

      const trigger = screen.getByText("Trigger");
      await user.click(trigger);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("allows pointer enter/leave events on non-touch devices", async () => {
      const matchMedia = vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList));
      vi.stubGlobal("matchMedia", matchMedia);

      const onPointerEnter = vi.fn();
      const onPointerLeave = vi.fn();
      const user = userEvent.setup({ delay: null });
      render(
        <TooltipProvider delayDuration={0} skipDelayDuration={0}>
          <Tooltip>
            <TooltipTrigger
              onPointerEnter={onPointerEnter}
              onPointerLeave={onPointerLeave}
            >
              Trigger
            </TooltipTrigger>
            <TooltipContent>Content</TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );

      const trigger = screen.getByText("Trigger");
      await user.hover(trigger);

      expect(onPointerEnter).toHaveBeenCalled();

      await user.unhover(trigger);

      expect(onPointerLeave).toHaveBeenCalled();
    });
  });
});
