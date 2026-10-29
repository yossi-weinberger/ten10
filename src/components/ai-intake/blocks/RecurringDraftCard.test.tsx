// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RecurringCard } from "@/lib/ai/recurring-card";
import { RecurringDraftCard } from "./RecurringDraftCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      "aiIntake.recurring.summaryLead": "הוראת קבע: ",
      "aiIntake.recurring.summaryPayee": " ל",
      "aiIntake.recurring.summaryMonthly": ", כל חודש ב-",
      "aiIntake.recurring.summaryFrom": ", החל מ-",
      "aiIntake.types.donation": "תרומה",
    }[key] ?? key),
    i18n: { language: "he" },
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
  afterEach(() => cleanup());

  it("shows the summary and hides the inputs when the order is complete", () => {
    renderCard(card());
    expect(screen.getByText(/הוראת קבע:/)).toBeInTheDocument();
    expect(screen.getByText("2026-11-10")).toBeInTheDocument();
    expect(screen.getByText("2026-12-10")).toBeInTheDocument();
    expect(screen.getByText("2027-01-10")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "aiIntake.recurring.save" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "aiIntake.recurring.changeDetail" })).toBeEnabled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("opens only the chosen field", async () => {
    const user = userEvent.setup();
    renderCard(card());
    await user.click(screen.getByRole("button", { name: "aiIntake.recurring.changeDetail" }));
    await user.click(screen.getByRole("button", { name: "aiIntake.editAmount" }));
    expect(screen.getByRole("textbox", { name: "aiIntake.editAmount" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "aiIntake.recurring.type" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "aiIntake.recurring.day" })).not.toBeInTheDocument();
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
