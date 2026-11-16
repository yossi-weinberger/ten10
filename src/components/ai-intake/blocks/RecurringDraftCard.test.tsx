// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RecurringCard } from "@/lib/ai/recurring-card";
import { RecurringDraftCard } from "./RecurringDraftCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      "aiIntake.types.donation": "תרומה",
    }[key] ?? key),
    i18n: { language: "he", dir: () => "rtl" },
  }),
}));

vi.mock("@/lib/calendar/use-display-date", () => ({
  useDisplayDate: () => (isoDate: string) => ({ primary: isoDate, secondary: null }),
}));

function card(overrides: Partial<RecurringCard> = {}): RecurringCard {
  return {
    amount: 100,
    currency: "ILS",
    type: "donation",
    description: "כולל",
    category: null,
    paymentMethod: null,
    recipient: "",
    frequency: "monthly",
    calendarType: "gregorian",
    startDate: "2026-11-10",
    dayOfMonth: 10,
    anchorMonthCode: null,
    totalOccurrences: null,
    alreadyCharged: false,
    includeThisMonth: null,
    monthDuplicate: false,
    saved: false,
    savedId: null,
    savedCreatedAt: null,
    executionCount: 0,
    cancelled: false,
    ...overrides,
  };
}

function renderCard(value: RecurringCard, onChange = vi.fn(), onSave = vi.fn()) {
  const onDismiss = vi.fn();
  render(
    <RecurringDraftCard
      card={value}
      saving={false}
      interactive
      onChange={onChange}
      onSave={onSave}
      onDismiss={onDismiss}
      onCancel={vi.fn()}
    />,
  );
  return { onChange, onSave, onDismiss };
}

describe("recurring draft card", () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
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

  afterEach(() => cleanup());

  it("shows collapsed summary when complete, expandable to full form", async () => {
    const user = userEvent.setup();
    renderCard(card());
    expect(screen.getByText("aiIntake.recurring.monthlyTag")).toBeInTheDocument();
    // Collapsed summary shows formatted amount and description
    expect(screen.getByText(/100/)).toBeInTheDocument();
    expect(screen.getByText(/כולל/)).toBeInTheDocument();
    expect(screen.getByText("2026-11-10")).toBeInTheDocument();
    expect(screen.getByText("2026-12-10")).toBeInTheDocument();
    expect(screen.queryByText("2027-01-10")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "aiIntake.recurring.save" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "aiIntake.edit" })).toBeEnabled();
    // Expand to show full form
    await user.click(screen.getByRole("button", { name: "aiIntake.edit" }));
    expect(screen.getByRole("textbox", { name: "aiIntake.editAmount" })).toHaveValue("100");
    expect(screen.getByRole("textbox", { name: "aiIntake.editDescription" })).toHaveValue("כולל");
    expect(screen.getByRole("button", { name: "aiIntake.recurring.changeDetail" })).toBeEnabled();
  });

  it("sends a typed amount as a number", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function Harness() {
      const [value, setValue] = useState(card());
      return (
        <RecurringDraftCard
          card={value}
          saving={false}
          interactive
          onChange={(next) => {
            setValue(next);
            onChange(next);
          }}
          onSave={vi.fn()}
          onDismiss={vi.fn()}
          onCancel={vi.fn()}
        />
      );
    }
    render(<Harness />);
    // Expand to show input fields
    await user.click(screen.getByRole("button", { name: "aiIntake.edit" }));
    const amount = screen.getByRole("textbox", { name: "aiIntake.editAmount" });
    await user.clear(amount);
    await user.type(amount, "1,500");
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ amount: 1500 }));
  });

  it("opens only the chosen field", async () => {
    const user = userEvent.setup();
    renderCard(card());
    // Expand first
    await user.click(screen.getByRole("button", { name: "aiIntake.edit" }));
    await user.click(screen.getByRole("button", { name: "aiIntake.recurring.changeDetail" }));
    expect(screen.queryByRole("button", { name: "aiIntake.editAmount" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "aiIntake.recurring.day" }));
    expect(screen.getByRole("textbox", { name: "aiIntake.recurring.day" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "aiIntake.editAmount" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "aiIntake.recurring.type" })).not.toBeInTheDocument();
  });

  it("asks for a missing amount before anything else", () => {
    renderCard(card({ amount: null, type: null }));
    expect(screen.getByRole("textbox", { name: "aiIntake.editAmount" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "aiIntake.recurring.save" })).not.toBeInTheDocument();
    expect(screen.queryByText("aiIntake.askType")).not.toBeInTheDocument();
  });

  it("refuses a weekly order without saving", async () => {
    const user = userEvent.setup();
    const { onChange, onSave } = renderCard(card({ frequency: "weekly" }));
    expect(screen.getByText("aiIntake.recurring.monthlyOnly")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "aiIntake.recurring.save" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "aiIntake.recurring.makeMonthly" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ frequency: "monthly" }));
  });
});
