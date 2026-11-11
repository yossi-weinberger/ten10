// @vitest-environment jsdom

import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InsightsSummaryRow } from "./InsightsSummaryRow";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key} ${Object.values(opts).join(" ")}` : key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

vi.mock("@/lib/calendar/use-display-date", () => ({
  useDisplayDate: () => (isoDate: string) => ({ primary: isoDate, secondary: null }),
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

function renderRow(
  props: Partial<ComponentProps<typeof InsightsSummaryRow>> = {},
) {
  return render(
    <TooltipProvider delayDuration={0}>
      <InsightsSummaryRow
        serverTotalIncome={200}
        serverTotalExpenses={50}
        prevIncome={100}
        activeRecurring={[]}
        isLoading={false}
        prevPeriodStart="2026-10-01"
        prevPeriodEnd="2026-10-31"
        {...props}
      />
    </TooltipProvider>,
  );
}

afterEach(() => {
  cleanup();
});

describe("InsightsSummaryRow PostHog masking", () => {
  it("masks stat values and deltas, not static labels or the empty placeholder", () => {
    renderRow();

    expect(screen.getByText("analytics.insightsSummary.savingsRate").closest("[data-ph-mask]")).toBeNull();
    expect(screen.getByText("analytics.insightsSummary.recurringPct").closest("[data-ph-mask]")).toBeNull();
    expect(screen.getByText("—").closest("[data-ph-mask]")).toBeNull();
    expect(
      screen.getByRole("button", { name: "analytics.insightsSummary.savingsRate" }).closest("[data-ph-mask]"),
    ).toBeNull();

    for (const value of screen.getAllByText(/75\.0%|100\.0%/)) {
      const mask = value.closest("[data-ph-mask]");
      expect(mask?.classList.contains("ph-mask")).toBe(true);
      expect(mask?.classList.contains("ph-sensitive")).toBe(true);
    }
  });

  it("masks only the portaled comparison tooltip that includes period dates", async () => {
    renderRow();

    fireEvent.pointerMove(
      screen.getByRole("button", { name: "analytics.insightsSummary.periodComparison" }),
      { pointerType: "mouse" },
    );

    await waitFor(() => {
      const tooltip = document.body.querySelector('[role="tooltip"]');
      expect(tooltip?.textContent).toContain("2026-10-01");
      expect(tooltip?.getAttribute("data-ph-mask")).toBe("");
      expect(tooltip?.classList.contains("ph-mask")).toBe(true);
      expect(tooltip?.classList.contains("ph-sensitive")).toBe(true);
    });
  });

  it("leaves the static savings explanation tooltip unmasked", async () => {
    renderRow();

    fireEvent.pointerMove(
      screen.getByRole("button", { name: "analytics.insightsSummary.savingsRate" }),
      { pointerType: "mouse" },
    );

    await waitFor(() => {
      const tooltip = document.body.querySelector('[role="tooltip"]');
      expect(tooltip?.textContent).toContain("analytics.insightsSummary.savingsRateTooltip");
      expect(tooltip?.hasAttribute("data-ph-mask")).toBe(false);
      expect(tooltip?.classList.contains("ph-mask")).toBe(false);
    });
  });
});
