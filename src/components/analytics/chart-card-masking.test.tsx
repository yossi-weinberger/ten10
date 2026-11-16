// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatCurrency } from "@/lib/utils/currency";
import { CategoryBreakdownChart } from "./CategoryBreakdownChart";
import { DonationRecipientsInsight } from "./DonationRecipientsInsight";
import { PaymentMethodInsight } from "./PaymentMethodInsight";

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => undefined },
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

vi.mock("@/lib/store", () => ({
  useDonationStore: <T,>(selector: (state: { settings: { defaultCurrency: string } }) => T): T =>
    selector({ settings: { defaultCurrency: "ILS" } }),
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => children,
  CartesianGrid: () => null,
  Bar: () => null,
  Cell: () => null,
  YAxis: () => null,
  PieChart: () => null,
  Pie: () => null,
  Legend: () => null,
  Tooltip: () => null,
  XAxis: ({ tickFormatter }: { tickFormatter?: (value: number) => string }) => (
    <span>{tickFormatter?.(80)}</span>
  ),
  BarChart: ({
    children,
    data,
  }: {
    children?: ReactNode;
    data?: Array<{ label?: string }>;
  }) => (
    <div>
      {data?.map((item) => (
        <span key={item.label}>{item.label}</span>
      ))}
      {children}
    </div>
  ),
}));

const chartAmount = formatCurrency(80, "ILS", "en");

afterEach(() => {
  cleanup();
});

describe("analytics chart card PostHog masking", () => {
  it("masks category names and axis amounts, not the card chrome", () => {
    render(
      <CategoryBreakdownChart
        data={[{ category: "Groceries", total_amount: 80 }]}
        isLoading={false}
        error={null}
        categoryType="expense"
        onCategoryTypeChange={vi.fn()}
      />,
    );

    expect(screen.getByText("analytics.categories.title").closest("[data-ph-mask]")).toBeNull();
    expect(screen.getByText("analytics.categories.tabExpenses").closest("[data-ph-mask]")).toBeNull();
    expect(screen.getByRole("button", { name: "analytics.chartTypeBar" }).closest("[data-ph-mask]")).toBeNull();

    const category = screen.getByText("Groceries");
    expect(category.closest("[data-ph-mask]")?.classList.contains("ph-mask")).toBe(true);
    expect(category.closest("[data-ph-mask]")?.classList.contains("ph-sensitive")).toBe(true);
    expect(screen.getByText(chartAmount).closest("[data-ph-mask]")?.contains(category)).toBe(true);
  });

  it("leaves the category empty state unmasked", () => {
    render(
      <CategoryBreakdownChart
        data={[]}
        isLoading={false}
        error={null}
        categoryType="expense"
        onCategoryTypeChange={vi.fn()}
      />,
    );

    expect(screen.getByText("analytics.categories.noData").closest("[data-ph-mask]")).toBeNull();
    expect(screen.getByText("analytics.categories.title").closest("[data-ph-mask]")).toBeNull();
  });

  it("masks payment method names inside the chart", () => {
    render(
      <PaymentMethodInsight
        data={[{ payment_method: "Family Visa", total_amount: 80 }]}
        isLoading={false}
        error={null}
      />,
    );

    expect(screen.getByText("analytics.paymentMethods.title").closest("[data-ph-mask]")).toBeNull();
    const method = screen.getByText("Family Visa");
    expect(method.closest("[data-ph-mask]")?.classList.contains("ph-sensitive")).toBe(true);
    expect(screen.getByText(chartAmount).closest("[data-ph-mask]")?.contains(method)).toBe(true);
  });

  it("leaves the payment method empty state unmasked", () => {
    render(<PaymentMethodInsight data={[]} isLoading={false} error={null} />);

    expect(screen.getByText("analytics.paymentMethods.noData").closest("[data-ph-mask]")).toBeNull();
  });

  it("masks recipient names inside the chart", () => {
    render(
      <DonationRecipientsInsight
        data={[{ recipient: "Beth Shalom", total_amount: 80, last_description: "Beth Shalom" }]}
        isLoading={false}
        error={null}
      />,
    );

    expect(screen.getByText("analytics.recipients.title").closest("[data-ph-mask]")).toBeNull();
    const recipient = screen.getByText("Beth Shalom");
    expect(recipient.closest("[data-ph-mask]")?.classList.contains("ph-mask")).toBe(true);
    expect(recipient.closest("[data-ph-mask]")?.classList.contains("ph-sensitive")).toBe(true);
  });

  it("leaves the recipient empty state unmasked", () => {
    render(<DonationRecipientsInsight data={[]} isLoading={false} error={null} />);

    expect(screen.getByText("analytics.recipients.noData").closest("[data-ph-mask]")).toBeNull();
  });
});
