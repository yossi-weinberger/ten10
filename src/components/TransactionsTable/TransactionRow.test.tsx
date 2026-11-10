// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransactionRow } from "./TransactionRow";
import type { TransactionForTable } from "@/types/transaction";

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
});
