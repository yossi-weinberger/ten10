// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import type { TransactionFormValues } from "@/lib/schemas";
import type { ImportPreviewRow } from "@/lib/import/import-session.types";
import { useAlignCategoryOnTypeChange } from "@/lib/import/use-align-category-on-type-change";
import { categoryForTypeOrNull } from "@/lib/category-registry";
import { formValuesToNormalized } from "@/lib/import/row-edit-adapter";
import { FILE_IMPORT } from "../../../supabase/functions/_shared/transaction-domain/transaction-types.ts";

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "he", dir: () => "rtl" },
  }),
}));

vi.mock("@/lib/data-layer/transactionForm.service", () => ({
  normalizeToBaseType: (type: string) => {
    if (type === "exempt-income") return "income";
    if (type === "recognized-expense") return "expense";
    if (type === "non_tithe_donation") return "donation";
    return type;
  },
  determineFinalType: (values: { type: string }) => values.type,
}));

vi.mock("@/components/ui/category-combobox", () => ({
  CategoryCombobox: ({
    value,
    placeholder,
  }: {
    value: string | null;
    placeholder?: string;
  }) => (
    <button type="button" role="combobox">
      {value ? value : (placeholder ?? "")}
    </button>
  ),
}));

vi.mock("@/components/ui/payment-method-combobox", () => ({
  PaymentMethodCombobox: () => null,
}));

vi.mock("@/components/forms/TransactionForm", () => ({
  TransactionForm: (props: Record<string, unknown>) => (
    <div
      data-testid="tx-form"
      data-align-category={props.alignCategoryWithType ? "yes" : "no"}
    />
  ),
}));

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => false,
}));

vi.mock("@/lib/store", () => ({
  useDonationStore: (
    select: (s: { settings: { defaultCurrency: string } }) => unknown,
  ) => select({ settings: { defaultCurrency: "ILS" } }),
}));

import { TransactionTypeSelector } from "@/components/forms/transaction-form-parts/TransactionTypeSelector";
import { DescriptionCategoryFields } from "@/components/forms/transaction-form-parts/DescriptionCategoryFields";
import { ImportRowEditModal } from "./ImportRowEditModal";

/**
 * Mirrors ImportRowEditModal → TransactionForm(alignCategoryWithType):
 * type tabs + visible category field with import-only sync enabled.
 */
function ImportRowEditCategoryHarness({
  initialType,
  initialCategory,
}: {
  initialType: TransactionFormValues["type"];
  initialCategory: string;
}) {
  const form = useForm<TransactionFormValues>({
    defaultValues: {
      type: initialType,
      category: initialCategory,
      date: "2026-01-15",
      amount: 42,
      currency: "ILS",
      description: "Test",
      isExempt: false,
      isRecognized: false,
      isFromPersonalFunds: false,
      is_chomesh: false,
      is_recurring: false,
      frequency: "monthly",
      recipient: "",
      payment_method: "",
    },
  });

  const [selectedType, setSelectedType] = useState(
    initialType as TransactionFormValues["type"] | "",
  );

  const syncTypeFromForm = () => {
    setSelectedType(
      (form.getValues("type") || "") as TransactionFormValues["type"] | "",
    );
  };

  useAlignCategoryOnTypeChange(form, selectedType, true);

  return (
    <FormProvider {...form}>
      <div
        onClickCapture={() => {
          // After TypeSelector's click handler sets `type`, re-render so the
          // import-only align hook sees the new type (same as form.watch in
          // TransactionForm, without calling watch in this test file).
          queueMicrotask(syncTypeFromForm);
        }}
      >
        <TransactionTypeSelector form={form} selectedType={selectedType} />
        <DescriptionCategoryFields form={form} selectedType={selectedType} />
      </div>
    </FormProvider>
  );
}

function baseNormalized(
  overrides: Partial<NonNullable<ImportPreviewRow["normalized"]>> = {},
): NonNullable<ImportPreviewRow["normalized"]> {
  return {
    date: "2026-01-15",
    amount: 42,
    currency: "ILS",
    type: "expense",
    description: "Test",
    category: "food",
    recipient: null,
    payment_method: null,
    is_chomesh: false,
    original_amount: null,
    original_currency: null,
    conversion_rate: null,
    conversion_date: null,
    rate_source: null,
    source_recurring_id: null,
    occurrence_number: null,
    ...overrides,
  };
}

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => undefined;
  HTMLElement.prototype.scrollIntoView = () => undefined;
});

afterEach(() => cleanup());

describe("import single-row edit: category aligns with type", () => {
  it("clears visible expense category when switching to income; save writes null", async () => {
    const user = userEvent.setup();
    render(
      <ImportRowEditCategoryHarness
        initialType="expense"
        initialCategory="food"
      />,
    );

    expect(screen.getByRole("combobox")).toHaveTextContent("food");

    await user.click(
      screen.getByRole("tab", {
        name: /transactionForm\.transactionType\.income/,
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveTextContent(
        "transactionForm.category.incomePlaceholder",
      );
    });

    const saved = formValuesToNormalized(
      {
        type: "income",
        category: "",
        date: "2026-01-15",
        amount: 42,
        currency: "ILS",
        description: "Test",
        isExempt: false,
        isRecognized: false,
        isFromPersonalFunds: false,
        is_chomesh: false,
        is_recurring: false,
        frequency: "monthly",
        recipient: "",
        payment_method: "",
      } as TransactionFormValues,
      "ILS",
      baseNormalized({ type: "expense", category: "food" }),
      FILE_IMPORT,
      "income",
    );
    expect(saved.category).toBeNull();
    expect(categoryForTypeOrNull("income", "food")).toBeNull();
  });

  it("keeps a custom category visible when it remains valid for income", async () => {
    const user = userEvent.setup();
    render(
      <ImportRowEditCategoryHarness
        initialType="expense"
        initialCategory="Gym Membership"
      />,
    );

    await user.click(
      screen.getByRole("tab", {
        name: /transactionForm\.transactionType\.income/,
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveTextContent("Gym Membership");
    });
  });
});

describe("ImportRowEditModal wiring", () => {
  it("enables alignCategoryWithType on TransactionForm", () => {
    render(
      <ImportRowEditModal
        isOpen
        onClose={() => {}}
        onSave={() => {}}
        row={{
          id: "r1",
          rowNumber: 1,
          approved: false,
          status: "ready",
          issues: [],
          raw: {},
          mapped: {},
          normalized: baseNormalized(),
        }}
      />,
    );

    expect(screen.getByTestId("tx-form")).toHaveAttribute(
      "data-align-category",
      "yes",
    );
  });
});
