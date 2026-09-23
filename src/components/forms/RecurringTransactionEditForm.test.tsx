// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RecurringTransactionEditForm } from "./RecurringTransactionEditForm";
import type { RecurringTransaction } from "@/types/transaction";

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {},
}));

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => undefined },
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { dir: () => "ltr" },
  }),
}));

afterEach(cleanup);

const initialData: RecurringTransaction = {
  id: "recurring-id",
  user_id: null,
  status: "active",
  start_date: "2026-09-12",
  next_due_date: "2026-10-12",
  frequency: "monthly",
  calendar_type: "hebrew",
  anchor_month_code: null,
  day_of_month: 30,
  execution_count: 0,
  amount: 100,
  currency: "ILS",
  type: "expense",
};

describe("RecurringTransactionEditForm calendar preservation", () => {
  it("keeps the stored calendar and Hebrew day range", () => {
    render(
      <RecurringTransactionEditForm
        initialData={initialData}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const calendar = screen.getByRole("combobox", {
      name: "transactionForm.recurringTransaction.calendar.label",
    });
    expect(
      within(calendar).getByText(
        "transactionForm.recurringTransaction.calendar.hebrew",
      ),
    ).toBeTruthy();

    const dayInput = screen.getByRole("spinbutton", {
      name: "transactionForm.recurringTransaction.dayOfMonth",
    });
    expect(dayInput.getAttribute("max")).toBe("30");
    expect((dayInput as HTMLInputElement).value).toBe("30");
  });
});
