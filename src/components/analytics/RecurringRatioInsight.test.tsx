// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatCurrency } from "@/lib/utils/currency";
import { RecurringRatioInsight } from "./RecurringRatioInsight";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
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

describe("RecurringRatioInsight PostHog masking", () => {
  it("masks ring percentages and amounts, not type labels or the title", () => {
    render(
      <RecurringRatioInsight
        data={[]}
        recurringExpenses={400}
        totalExpenses={1000}
        isLoading={false}
        error={null}
      />,
    );

    expect(screen.getByText("analytics.recurringRatioByType.title").closest("[data-ph-mask]")).toBeNull();
    expect(screen.getByText("analytics.recurringRatioByType.expenses").closest("[data-ph-mask]")).toBeNull();

    const percent = screen.getByText("40%");
    expect(percent.getAttribute("data-ph-mask")).toBe("");
    expect(percent.classList.contains("ph-mask")).toBe(true);
    expect(percent.classList.contains("ph-sensitive")).toBe(true);

    const amount = screen.getByText(formatCurrency(400, "ILS", "en"));
    expect(amount.closest("[data-ph-mask]")?.classList.contains("ph-sensitive")).toBe(true);
  });

  it("masks fallback split amounts and leaves their labels visible", () => {
    render(
      <RecurringRatioInsight
        data={[
          { is_recurring: true, total_amount: 30, tx_count: 1 },
          { is_recurring: false, total_amount: 70, tx_count: 2 },
        ]}
        isLoading={false}
        error={null}
      />,
    );

    expect(screen.getByText("analytics.recurringRatio.recurring").closest("[data-ph-mask]")).toBeNull();
    expect(screen.getByText("analytics.recurringRatio.onetime").closest("[data-ph-mask]")).toBeNull();

    const recurring = screen.getByText(formatCurrency(30, "ILS", "en"));
    const onetime = screen.getByText(formatCurrency(70, "ILS", "en"));
    expect(recurring.getAttribute("data-ph-mask")).toBe("");
    expect(recurring.classList.contains("ph-sensitive")).toBe(true);
    expect(onetime.getAttribute("data-ph-mask")).toBe("");
    expect(onetime.classList.contains("ph-mask")).toBe(true);
  });

  it("leaves the empty state unmasked", () => {
    render(<RecurringRatioInsight data={[]} isLoading={false} error={null} />);

    expect(screen.getByText("analytics.recurringRatio.noData").closest("[data-ph-mask]")).toBeNull();
    expect(screen.getByText("analytics.recurringRatioByType.title").closest("[data-ph-mask]")).toBeNull();
  });
});
