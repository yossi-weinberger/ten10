// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it, vi, beforeAll } from "vitest";
import { TransactionRow } from "./TransactionRow";
import type { TransactionForTable } from "@/types/transaction";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
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

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {},
}));

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => undefined },
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

vi.mock("@/contexts/PlatformContext", () => ({
  usePlatform: () => ({ platform: "web" }),
}));

vi.mock("@/lib/calendar/use-display-date", () => ({
  useDisplayDate: () => (date: string) => ({
    primary: date,
    secondary: null,
  }),
}));

vi.mock("@/lib/ai/flags", () => ({
  isAiIntakeEnabled: () => false,
}));

vi.mock("@/lib/ai/receipt-action", () => ({
  receiptExpiryDate: () => new Date(),
  showReceiptAction: () => false,
}));

const sampleTransaction: TransactionForTable = {
  id: "txn-1",
  user_id: "user-1",
  date: "2026-11-10",
  description: "Sample Transaction",
  amount: 100,
  currency: "ILS",
  type: "expense",
  category: "groceries",
  recipient: "Store Name",
  payment_method: "cash",
  is_chomesh: false,
  original_amount: null,
  original_currency: null,
  conversion_rate: null,
  conversion_date: null,
  rate_source: null,
  source_recurring_id: null,
  occurrence_number: null,
  recurring_info: null,
  origin: null,
  receipt_expires_at: null,
  created_at: "2026-11-10T00:00:00Z",
  updated_at: "2026-11-10T00:00:00Z",
};

describe("TransactionRow PostHog masking", () => {
  it("applies ph-mask and data-ph-mask to description cell", () => {
    const { container } = render(
      <table>
        <tbody>
          <TransactionRow
            transaction={sampleTransaction}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onEditRecurring={vi.fn()}
            isFetchingRec={false}
            selected={false}
            onToggleSelected={vi.fn()}
            selectLabel="Select"
          />
        </tbody>
      </table>
    );

    const descriptionCell = container.querySelector(
      'td.text-start span[data-ph-mask]'
    );
    expect(descriptionCell).toBeTruthy();
    expect(descriptionCell?.classList.contains("ph-mask")).toBe(true);
    expect(descriptionCell?.classList.contains("ph-sensitive")).toBe(true);
    expect(descriptionCell?.getAttribute("data-ph-mask")).toBe("");
  });

  it("applies ph-mask and data-ph-mask to amount cell", () => {
    const { container } = render(
      <table>
        <tbody>
          <TransactionRow
            transaction={sampleTransaction}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onEditRecurring={vi.fn()}
            isFetchingRec={false}
            selected={false}
            onToggleSelected={vi.fn()}
            selectLabel="Select"
          />
        </tbody>
      </table>
    );

    const amountCells = container.querySelectorAll(
      'td.font-medium[data-ph-mask]'
    );
    expect(amountCells.length).toBeGreaterThan(0);
    const amountCell = amountCells[0];
    expect(amountCell?.classList.contains("ph-mask")).toBe(true);
    expect(amountCell?.classList.contains("ph-sensitive")).toBe(true);
    expect(amountCell?.getAttribute("data-ph-mask")).toBe("");
  });

  it("applies ph-mask and data-ph-mask to category and recipient cells", () => {
    const { container } = render(
      <table>
        <tbody>
          <TransactionRow
            transaction={sampleTransaction}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onEditRecurring={vi.fn()}
            isFetchingRec={false}
            selected={false}
            onToggleSelected={vi.fn()}
            selectLabel="Select"
          />
        </tbody>
      </table>
    );

    const maskedElements = container.querySelectorAll('[data-ph-mask]');
    expect(maskedElements.length).toBeGreaterThanOrEqual(4);
  });

  it("applies ph-mask and data-ph-mask to recipient cell", () => {
    const { container } = render(
      <table>
        <tbody>
          <TransactionRow
            transaction={sampleTransaction}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onEditRecurring={vi.fn()}
            isFetchingRec={false}
            selected={false}
            onToggleSelected={vi.fn()}
            selectLabel="Select"
          />
        </tbody>
      </table>
    );

    const allMaskedCells = Array.from(
      container.querySelectorAll('td[data-ph-mask]')
    );
    const recipientCell = allMaskedCells.find((cell) =>
      cell.textContent?.includes("Store Name")
    );
    expect(recipientCell).toBeTruthy();
    expect(recipientCell?.classList.contains("ph-mask")).toBe(true);
    expect(recipientCell?.classList.contains("ph-sensitive")).toBe(true);
  });

  it("applies ph-mask and data-ph-mask to date cell", () => {
    const { container } = render(
      <table>
        <tbody>
          <TransactionRow
            transaction={sampleTransaction}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onEditRecurring={vi.fn()}
            isFetchingRec={false}
            selected={false}
            onToggleSelected={vi.fn()}
            selectLabel="Select"
          />
        </tbody>
      </table>
    );

    const dateCell = container.querySelector('td[data-ph-mask]:first-child');
    expect(dateCell).toBeTruthy();
    expect(dateCell?.classList.contains("ph-mask")).toBe(true);
    expect(dateCell?.classList.contains("ph-sensitive")).toBe(true);
    expect(dateCell?.textContent).toContain("2026-11-10");
  });

  it("applies ph-mask and data-ph-mask to payment method cell", () => {
    const { container } = render(
      <table>
        <tbody>
          <TransactionRow
            transaction={sampleTransaction}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onEditRecurring={vi.fn()}
            isFetchingRec={false}
            selected={false}
            onToggleSelected={vi.fn()}
            selectLabel="Select"
          />
        </tbody>
      </table>
    );

    const allCells = Array.from(container.querySelectorAll('td'));
    const paymentMethodCell = allCells.find((cell) =>
      cell.textContent?.includes("cash")
    );
    expect(paymentMethodCell).toBeTruthy();
    expect(paymentMethodCell?.hasAttribute("data-ph-mask")).toBe(true);
    expect(paymentMethodCell?.classList.contains("ph-mask")).toBe(true);
    expect(paymentMethodCell?.classList.contains("ph-sensitive")).toBe(true);
  });

  it("applies ph-mask and data-ph-mask to chomesh cell", () => {
    const { container } = render(
      <table>
        <tbody>
          <TransactionRow
            transaction={{ ...sampleTransaction, is_chomesh: true }}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onEditRecurring={vi.fn()}
            isFetchingRec={false}
            selected={false}
            onToggleSelected={vi.fn()}
            selectLabel="Select"
          />
        </tbody>
      </table>
    );

    const allMaskedCells = Array.from(container.querySelectorAll('td[data-ph-mask]'));
    expect(allMaskedCells.length).toBeGreaterThanOrEqual(6);
  });

  it("applies ph-mask and data-ph-mask to recurring info cell", () => {
    const transactionWithRecurring: TransactionForTable = {
      ...sampleTransaction,
      source_recurring_id: "rec-1",
      occurrence_number: 1,
      recurring_info: {
        status: "active",
        execution_count: 1,
        total_occurrences: 12,
        frequency: "monthly",
        day_of_month: 10,
      },
    };

    const { container } = render(
      <table>
        <tbody>
          <TransactionRow
            transaction={transactionWithRecurring}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onEditRecurring={vi.fn()}
            isFetchingRec={false}
            selected={false}
            onToggleSelected={vi.fn()}
            selectLabel="Select"
          />
        </tbody>
      </table>
    );

    const allCells = Array.from(container.querySelectorAll('td'));
    const recurringCell = allCells.find((cell) =>
      cell.querySelector('[data-ph-mask]')
    );
    expect(recurringCell).toBeTruthy();
    const maskedElement = recurringCell?.querySelector('[data-ph-mask]');
    expect(maskedElement).toBeTruthy();
    expect(maskedElement?.classList.contains("ph-mask")).toBe(true);
    expect(maskedElement?.classList.contains("ph-sensitive")).toBe(true);
  });
});
