// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

describe("RecurringTransactionsTable", () => {
  it("keeps the narrow mobile padding through 375px", () => {
    render(<RecurringTransactionsTable />);

    const heading = screen.getByRole("heading", { name: "recurringTable.title" });
    const headerRow = heading.parentElement;
    const container = headerRow?.parentElement;

    expect(container).toHaveClass("container", "mx-auto", "py-4", "max-[376px]:px-0");
    expect(container).not.toHaveClass("max-[320px]:px-0");
    expect(headerRow).toHaveClass("max-[376px]:px-4");
    expect(headerRow).not.toHaveClass("max-[320px]:px-4");
  });
});
