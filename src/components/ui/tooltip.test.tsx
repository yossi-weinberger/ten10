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
    it("calls click handler with preventDefault on touch devices", async () => {
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

      const onClick = vi.fn();
      const user = userEvent.setup();
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

    it("calls consumer pointer handlers then prevents default on touch devices", async () => {
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

      const onPointerEnter = vi.fn();
      const onPointerLeave = vi.fn();
      const user = userEvent.setup();
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
      await user.unhover(trigger);

      expect(onPointerEnter).toHaveBeenCalledTimes(1);
      expect(onPointerEnter.mock.calls[0][0].defaultPrevented).toBe(true);
      expect(onPointerLeave).toHaveBeenCalledTimes(1);
      expect(onPointerLeave.mock.calls[0][0].defaultPrevented).toBe(true);
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
      const user = userEvent.setup();
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
      const user = userEvent.setup();
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
