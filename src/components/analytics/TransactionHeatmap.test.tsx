// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { DailyHeatmapResponse } from "@/lib/data-layer/insights.service";
import { TransactionHeatmap } from "./TransactionHeatmap";

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => undefined },
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && "count" in opts && "amount" in opts) {
        return `${String(opts.date)}: ${String(opts.count)} transactions, ${String(opts.amount)}`;
      }
      return key;
    },
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

const populatedDay: DailyHeatmapResponse = [
  {
    tx_date: "2026-06-15",
    tx_count: 7,
    total_amount: 1234,
  },
];

afterEach(() => {
  cleanup();
});

describe("TransactionHeatmap PostHog masking", () => {
  it("masks the portaled day tooltip, not the page root", async () => {
    const { container } = render(
      <TooltipProvider>
        <TransactionHeatmap
          data={populatedDay}
          isLoading={false}
          error={null}
          typeGroup="all"
          onTypeGroupChange={vi.fn()}
        />
      </TooltipProvider>,
    );

    const populatedCell = container.querySelector(".cursor-default");
    expect(populatedCell).toBeTruthy();
    expect(populatedCell?.classList.contains("ph-mask")).toBe(true);
    expect(populatedCell?.classList.contains("ph-sensitive")).toBe(true);
    expect(populatedCell?.hasAttribute("data-ph-mask")).toBe(true);

    for (const spacer of container.querySelectorAll(".opacity-0")) {
      expect(spacer.hasAttribute("data-ph-mask")).toBe(false);
    }

    expect(screen.getByText("analytics.heatmap.title").closest("[data-ph-mask]")).toBeNull();
    expect(screen.getByText("analytics.heatmap.typeAll").closest("[data-ph-mask]")).toBeNull();
    expect(screen.getByText("Su").closest("[data-ph-mask]")).toBeNull();

    fireEvent.pointerMove(populatedCell as Element, { pointerType: "mouse" });

    await waitFor(() => {
      const tooltip = document.body.querySelector('[role="tooltip"]');
      expect(tooltip).toBeTruthy();
      expect(container.contains(tooltip)).toBe(false);
      expect(tooltip?.classList.contains("ph-mask")).toBe(true);
      expect(tooltip?.classList.contains("ph-sensitive")).toBe(true);
      expect(tooltip?.hasAttribute("data-ph-mask")).toBe(true);
      expect(tooltip?.textContent).toContain("7");
    });
  });

  it("leaves the empty state unmasked", () => {
    render(
      <TooltipProvider>
        <TransactionHeatmap
          data={[]}
          isLoading={false}
          error={null}
          typeGroup="all"
          onTypeGroupChange={vi.fn()}
        />
      </TooltipProvider>,
    );

    expect(screen.getByText("analytics.heatmap.noData").closest("[data-ph-mask]")).toBeNull();
    expect(screen.getByText("analytics.heatmap.title").closest("[data-ph-mask]")).toBeNull();
  });
});
