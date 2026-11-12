// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MOBILE_CARD_QUERY } from "@/lib/responsive";
import { MOBILE_SCREEN_TITLE_KEYS } from "@/components/layout/mobileScreenTitles";
import { RecurringTransactionsTable } from "./RecurringTransactionsTable";

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { dir: () => "ltr", language: "en" },
  }),
}));

vi.mock("@/contexts/PlatformContext", () => ({
  usePlatform: () => ({ platform: "web" }),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/components/TransactionsTable/RecurringTransactionsTableDisplay", () => ({
  RecurringTransactionsTableDisplay: () => <div data-testid="recurring-display" />,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("RecurringTransactionsTable", () => {
  it("matches the transactions page padding below the md breakpoint", () => {
    render(<RecurringTransactionsTable />);

    const heading = screen.getByRole("heading", { name: "recurringTable.title" });
    const headerRow = heading.parentElement;
    const container = headerRow?.parentElement;

    expect(heading).not.toHaveClass("sr-only");
    expect(container).toHaveClass("container", "mx-auto", "py-4", "max-md:px-0");
    expect(container).not.toHaveClass("max-[376px]:px-0");
    expect(headerRow).toHaveClass("flex-col", "sm:justify-between", "max-md:px-4");
    expect(headerRow).not.toHaveClass("max-[376px]:px-4");
    const back = screen.getByRole("button", { name: "buttons.backToTransactions" });
    expect(back).toHaveClass("border");
    expect(back).not.toHaveClass("self-start");
  });

  it("uses a screen-reader heading and a full-width outline back button on mobile cards", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === MOBILE_CARD_QUERY,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }));

    render(<RecurringTransactionsTable />);

    const heading = screen.getByRole("heading", { name: "recurringTable.title" });
    expect(heading).toHaveClass("sr-only");
    const back = screen.getByRole("button", { name: "buttons.backToTransactions" });
    expect(back).toHaveClass("h-11", "w-full", "gap-2");
    expect(back).toHaveClass("border");
    expect(heading.parentElement).toHaveClass("items-stretch");
    expect(heading.parentElement).not.toHaveClass("sm:justify-between");
  });

  it("maps the recurring route to the short mobile top-bar title", async () => {
    expect(MOBILE_SCREEN_TITLE_KEYS["/transactions-table/recurring-transactions"]).toBe("recurring");
    const en = await import("../../public/locales/en/navigation.json");
    const he = await import("../../public/locales/he/navigation.json");
    expect(en.menu.recurring).toBe("Recurring");
    expect(he.menu.recurring).toBe("הוראות קבע");
  });
});
