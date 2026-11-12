// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AssistantFab } from "./AssistantFab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

function renderFab() {
  return render(
    <TooltipProvider>
      <AssistantFab />
    </TooltipProvider>
  );
}

describe("AssistantFab", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
      onchange: null,
    }));
    delete document.body.dataset.mobileSelectionActive;
    delete document.body.dataset.mobileSwipeOpen;
  });

  afterEach(() => {
    cleanup();
    delete document.body.dataset.mobileSelectionActive;
    delete document.body.dataset.mobileSwipeOpen;
    vi.unstubAllGlobals();
  });

  it("hides while a card swipe strip is open and returns when it closes", async () => {
    renderFab();

    expect(screen.getByRole("button", { name: "menu.assistant" })).toBeInTheDocument();

    document.body.dataset.mobileSwipeOpen = "true";
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "menu.assistant" })).not.toBeInTheDocument();
    });

    delete document.body.dataset.mobileSwipeOpen;
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "menu.assistant" })).toBeInTheDocument();
    });
  });

  it("stays hidden for selection mode when a swipe strip closes", async () => {
    renderFab();

    document.body.dataset.mobileSelectionActive = "true";
    document.body.dataset.mobileSwipeOpen = "true";
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "menu.assistant" })).not.toBeInTheDocument();
    });

    delete document.body.dataset.mobileSwipeOpen;
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "menu.assistant" })).not.toBeInTheDocument();
    });

    delete document.body.dataset.mobileSelectionActive;
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "menu.assistant" })).toBeInTheDocument();
    });
  });
});
