// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import enDataTables from "../../../public/locales/en/data-tables.json";
import heDataTables from "../../../public/locales/he/data-tables.json";
import enTransactions from "../../../public/locales/en/transactions.json";
import heTransactions from "../../../public/locales/he/transactions.json";
import type { RecurringTransaction } from "@/types/transaction";

type Locale = "en" | "he";

let locale: Locale = "en";

const catalogs: Record<Locale, Record<string, Record<string, unknown>>> = {
  en: {
    transactions: enTransactions,
    "data-tables": enDataTables,
  },
  he: {
    transactions: heTransactions,
    "data-tables": heDataTables,
  },
};

function translate(namespace: string, key: string): string {
  let current: unknown = catalogs[locale][namespace];
  for (const part of key.split(".")) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof current === "string" ? current : key;
}

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {},
}));

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => undefined },
  useTranslation: (namespace: string = "common") => ({
    t: (key: string) => translate(namespace, key),
    i18n: {
      get language() {
        return locale;
      },
      dir: () => (locale === "he" ? "rtl" : "ltr"),
    },
  }),
}));

import { RecurringTransactionEditModal } from "./RecurringTransactionEditModal";

const recurringTransaction: RecurringTransaction = {
  id: "recurring-id",
  user_id: null,
  status: "active",
  start_date: "2026-09-12",
  next_due_date: "2026-10-12",
  frequency: "monthly",
  calendar_type: "gregorian",
  anchor_month_code: null,
  day_of_month: 12,
  execution_count: 1,
  amount: 100,
  currency: "ILS",
  type: "income",
  description: "Standing order",
};

const statusLabels = {
  en: enDataTables.recurring.statuses,
  he: heDataTables.recurring.statuses,
} as const;

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => undefined;
  HTMLElement.prototype.releasePointerCapture = () => undefined;
  HTMLElement.prototype.scrollIntoView = () => undefined;
});

beforeEach(() => {
  locale = "en";
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

afterEach(() => {
  cleanup();
  locale = "en";
});

function renderModal() {
  render(
    <RecurringTransactionEditModal
      isOpen
      onClose={vi.fn()}
      transaction={recurringTransaction}
    />,
  );
}

async function openStatusSelect(label: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox", { name: label }));
}

describe("RecurringTransactionEditModal status labels", () => {
  it("renders English status labels when the locale is en", async () => {
    locale = "en";
    renderModal();

    expect(
      screen.getByRole("heading", {
        name: enDataTables.modal.editRecurringTitle,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(enTransactions.transactionForm.category.incomePlaceholder),
    ).toBeInTheDocument();

    await openStatusSelect(
      enTransactions.transactionForm.recurringTransaction.status.label,
    );

    for (const label of Object.values(statusLabels.en)) {
      expect(screen.getByRole("option", { name: label })).toBeInTheDocument();
    }
    expect(screen.queryByRole("option", { name: statusLabels.he.active })).toBeNull();
  });

  it("renders Hebrew status labels when the locale is he", async () => {
    locale = "he";
    renderModal();

    expect(
      screen.getByRole("heading", {
        name: heDataTables.modal.editRecurringTitle,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(heTransactions.transactionForm.category.incomePlaceholder),
    ).toBeInTheDocument();

    await openStatusSelect(
      heTransactions.transactionForm.recurringTransaction.status.label,
    );

    for (const label of Object.values(statusLabels.he)) {
      expect(screen.getByRole("option", { name: label })).toBeInTheDocument();
    }
    expect(screen.queryByRole("option", { name: statusLabels.en.active })).toBeNull();
  });
});
