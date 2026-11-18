// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AI_BETA_TERMS_VERSION } from "@/lib/ai/beta-terms-version";
import { assistantIntroStorageKey } from "./assistant-intro";
import { AssistantFab } from "./AssistantFab";

const rpc = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

function renderFab(userId?: string) {
  return render(
    <TooltipProvider>
      <AssistantFab userId={userId} />
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
    localStorage.clear();
    rpc.mockReset();
    rpc.mockResolvedValue({ data: { accepted: false, version: AI_BETA_TERMS_VERSION }, error: null });
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    cleanup();
    delete document.body.dataset.mobileSelectionActive;
    delete document.body.dataset.mobileSwipeOpen;
    vi.unstubAllGlobals();
    vi.useRealTimers();
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

  it("plays the intro once, then stays quiet", async () => {
    vi.useFakeTimers();
    renderFab("user-1");

    expect(screen.queryByText("assistantIntro.title")).not.toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(document.querySelector(".assistant-intro-ring")).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByText("assistantIntro.title")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "assistantIntro.close" }));
    expect(localStorage.getItem(assistantIntroStorageKey("user-1"))).toBe("1");
    expect(screen.queryByText("assistantIntro.title")).not.toBeInTheDocument();

    cleanup();
    renderFab("user-1");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(screen.queryByText("assistantIntro.title")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("opens the assistant from the button during the intro and does not show it again", async () => {
    vi.useFakeTimers();
    const opened = vi.fn();
    window.addEventListener("ten10:open-assistant", opened);
    renderFab("user-1");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    fireEvent.click(screen.getByRole("button", { name: "menu.assistant" }));

    expect(opened).toHaveBeenCalledOnce();
    expect(localStorage.getItem(assistantIntroStorageKey("user-1"))).toBe("1");
    window.removeEventListener("ten10:open-assistant", opened);
    vi.useRealTimers();
  });

  it("skips the motion and shows the note when reduced motion is on", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
      onchange: null,
    }));
    renderFab("user-1");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(document.querySelector(".assistant-intro-ring")).toBeNull();
    expect(screen.getByText("assistantIntro.title")).toBeInTheDocument();
    expect(localStorage.getItem(assistantIntroStorageKey("user-1"))).toBeNull();
    vi.useRealTimers();
  });

  it("does not show the intro to someone who already accepted the beta terms", async () => {
    vi.useFakeTimers();
    rpc.mockResolvedValue({ data: { accepted: true, version: AI_BETA_TERMS_VERSION }, error: null });
    renderFab("user-1");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(screen.queryByText("assistantIntro.title")).not.toBeInTheDocument();
    expect(localStorage.getItem(assistantIntroStorageKey("user-1"))).toBe("1");
    vi.useRealTimers();
  });
});
