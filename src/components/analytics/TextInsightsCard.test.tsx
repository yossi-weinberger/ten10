// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TextInsightsCard } from "./TextInsightsCard";

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

afterEach(() => {
  cleanup();
});

describe("TextInsightsCard PostHog masking", () => {
  it("masks insight text that contains amounts and category names", () => {
    render(
      <TextInsightsCard
        serverTotalIncome={100}
        serverTotalExpenses={40}
        prevIncome={null}
        prevExpenses={null}
        activeRecurring={[]}
        categoryData={[{ category: "Groceries", total_amount: 40 }]}
        isLoading={false}
        expenseCategoryTop={{ category: "Groceries", total_amount: 40 }}
        incomeCategoryTop={null}
      />,
    );

    expect(screen.getByText("analytics.insights.title").closest("[data-ph-mask]")).toBeNull();

    const personal = screen.getByText(/Groceries/);
    expect(personal.getAttribute("data-ph-mask")).toBe("");
    expect(personal.classList.contains("ph-mask")).toBe(true);
    expect(personal.classList.contains("ph-sensitive")).toBe(true);
  });

  it("leaves the static category tip unmasked", () => {
    render(
      <TextInsightsCard
        serverTotalIncome={0}
        serverTotalExpenses={0}
        prevIncome={null}
        prevExpenses={null}
        activeRecurring={[]}
        categoryData={[{ category: "other", total_amount: 5 }]}
        isLoading={false}
      />,
    );

    const tip = screen.getByText("analytics.insights.noCategories");
    expect(tip.closest("[data-ph-mask]")).toBeNull();
    expect(tip.classList.contains("ph-mask")).toBe(false);
  });

  it("leaves the empty state unmasked", () => {
    render(
      <TextInsightsCard
        serverTotalIncome={0}
        serverTotalExpenses={0}
        prevIncome={null}
        prevExpenses={null}
        activeRecurring={[]}
        categoryData={[]}
        isLoading={false}
      />,
    );

    expect(screen.getByText("analytics.insights.noData").closest("[data-ph-mask]")).toBeNull();
    expect(screen.getByText("analytics.insights.title").closest("[data-ph-mask]")).toBeNull();
  });
});
