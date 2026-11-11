// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { getMaaserYearRange } from "@/lib/calendar";
import { buildMaaserYearSummary } from "@/lib/analytics/maaser-year-summary";
import { MaaserYearSummaryCard } from "./MaaserYearSummaryCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: "he",
      dir: () => "rtl",
    },
  }),
}));

vi.mock("@/lib/calendar/use-display-date", () => ({
  useDisplayDate: () => (isoDate: string) => ({
    primary: isoDate,
    secondary: null,
  }),
}));

vi.mock("@/lib/utils/local-date", () => ({
  getCurrentLocalDate: () => "2026-09-12",
}));

const range = getMaaserYearRange(5787);
const summary = buildMaaserYearSummary({
  range,
  reportEndDate: "2026-09-12",
  today: "2026-09-12",
  opening: { total_balance: 100, maaser_balance: 80, chomesh_balance: 20 },
  closing: { total_balance: 190, maaser_balance: 170, chomesh_balance: 20 },
  incomeInRange: 3000,
  donationsInRange: 200,
});

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

describe("MaaserYearSummaryCard", () => {
  it("renders the year report and close-year banner without changing all-time copy", () => {
    const markup = renderToStaticMarkup(
      <MaaserYearSummaryCard
        summary={summary}
        isLoading={false}
        error={null}
        canGoNext={false}
        onPreviousYear={vi.fn()}
        onNextYear={vi.fn()}
        currency="ILS"
      />,
    );

    expect(markup).toContain("analytics.maaserYear.title");
    expect(markup).toContain("תשפ״ז");
    expect(markup).toContain("analytics.maaserYear.closeBanner");
    expect(markup).toContain("analytics.maaserYear.balanceUnchangedNote");
    expect(markup).toContain("2026-09-12");
    expect(markup).toContain("2026-09-12");
  });

  it("masks stat amounts and leaves the title, year control, and period label visible", () => {
    render(
      <MaaserYearSummaryCard
        summary={summary}
        isLoading={false}
        error={null}
        canGoNext={false}
        onPreviousYear={vi.fn()}
        onNextYear={vi.fn()}
        currency="ILS"
      />,
    );

    expect(screen.getByText("analytics.maaserYear.title").closest("[data-ph-mask]")).toBeNull();
    expect(screen.getByText("תשפ״ז").closest("[data-ph-mask]")).toBeNull();
    expect(screen.getByRole("button", { name: "analytics.maaserYear.previousYear" }).closest("[data-ph-mask]")).toBeNull();
    expect(screen.getByText("analytics.maaserYear.income").closest("[data-ph-mask]")).toBeNull();
    expect(screen.getByText(/2026-09-12/).closest("[data-ph-mask]")).toBeNull();
    expect(screen.getByText("analytics.maaserYear.closeBanner").closest("[data-ph-mask]")).toBeNull();

    const income = screen.getByText((_, element) =>
      element?.tagName === "P"
      && (element.textContent?.includes("3,000") ?? false)
      && (element.textContent?.includes("₪") ?? false),
    );
    expect(income.getAttribute("data-ph-mask")).toBe("");
    expect(income.classList.contains("ph-mask")).toBe(true);
    expect(income.classList.contains("ph-sensitive")).toBe(true);
  });
});
