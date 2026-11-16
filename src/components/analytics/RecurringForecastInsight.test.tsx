// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatCurrency } from "@/lib/utils/currency";
import type { RecurringTransaction } from "@/types/transaction";
import { RecurringForecastInsight } from "./RecurringForecastInsight";

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => undefined },
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key} ${Object.values(opts).join(" ")}` : key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

vi.mock("@/lib/store", () => ({
  useDonationStore: <T,>(selector: (state: { settings: { defaultCurrency: string } }) => T): T =>
    selector({ settings: { defaultCurrency: "ILS" } }),
}));

const standingOrder: RecurringTransaction = {
  id: "standing-1",
  status: "active",
  start_date: "2026-01-01",
  next_due_date: "2026-12-01",
  frequency: "monthly",
  calendar_type: "gregorian",
  anchor_month_code: null,
  day_of_month: 17,
  execution_count: 1,
  description: "Kindergarten tuition",
  amount: 4321,
  currency: "ILS",
  type: "expense",
  category: "After school",
};

afterEach(() => {
  cleanup();
});

describe("RecurringForecastInsight PostHog masking", () => {
  it("masks descriptions, categories, counts, and totals", () => {
    const { container } = render(
      <RecurringForecastInsight
        activeRecurring={[standingOrder]}
        isLoading={false}
        error={null}
      />,
    );

    expect(screen.getByText("analytics.forecast.title").closest("[data-ph-mask]")).toBeNull();
    const subtitle = screen.getByText((_, element) =>
      element?.tagName === "P"
      && element.childNodes[0]?.textContent?.includes("analytics.forecast.subtitle") === true,
    );
    expect(subtitle.hasAttribute("data-ph-mask")).toBe(false);
    expect(subtitle.closest("[data-ph-mask]")).toBeNull();
    expect(screen.getByText("analytics.forecast.monthlyTotal").closest("[data-ph-mask]")).toBeNull();
    expect(screen.getByRole("tab", { name: /analytics.categories.tabExpenses/ }).closest("[data-ph-mask]")).toBeNull();

    const description = screen.getByText("Kindergarten tuition");
    const row = description.closest("[data-ph-mask]");
    expect(row?.classList.contains("ph-mask")).toBe(true);
    expect(row?.classList.contains("ph-sensitive")).toBe(true);
    expect(row?.textContent).toContain("After school");
    expect(row?.textContent).toContain(formatCurrency(4321, "ILS", "en"));

    const count = screen.getByText(/analytics.forecast.activeRecurring/);
    expect(count.getAttribute("data-ph-mask")).toBe("");
    expect(count.classList.contains("ph-sensitive")).toBe(true);

    const badge = container.querySelector("span.rounded-full");
    expect(badge?.textContent).toBe("1");
    expect(badge?.getAttribute("data-ph-mask")).toBe("");
    expect(badge?.classList.contains("ph-mask")).toBe(true);

    const amounts = screen.getAllByText(formatCurrency(4321, "ILS", "en"));
    expect(amounts.length).toBeGreaterThan(0);
    for (const amount of amounts) {
      const mask = amount.closest("[data-ph-mask]");
      expect(mask?.classList.contains("ph-mask")).toBe(true);
      expect(mask?.classList.contains("ph-sensitive")).toBe(true);
    }
  });

  it("leaves the empty state unmasked", () => {
    render(
      <RecurringForecastInsight activeRecurring={[]} isLoading={false} error={null} />,
    );

    expect(screen.getByText("analytics.forecast.noData").closest("[data-ph-mask]")).toBeNull();
    expect(screen.getByText("analytics.forecast.title").closest("[data-ph-mask]")).toBeNull();
  });
});
