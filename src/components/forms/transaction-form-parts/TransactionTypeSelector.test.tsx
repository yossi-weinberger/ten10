// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";
import { FormProvider, useForm, type UseFormReturn } from "react-hook-form";
import type { TransactionFormValues } from "@/lib/schemas";
import { TransactionTypeSelector } from "./TransactionTypeSelector";

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
}));

function Harness({
  initialType,
  initialCategory,
  formRef,
}: {
  initialType: TransactionFormValues["type"] | "";
  initialCategory: string;
  formRef: { current: UseFormReturn<TransactionFormValues> | null };
}) {
  const form = useForm<TransactionFormValues>({
    defaultValues: {
      type: initialType as TransactionFormValues["type"],
      category: initialCategory,
      isExempt: false,
      isRecognized: false,
      isFromPersonalFunds: false,
      is_chomesh: false,
    },
  });

  useEffect(() => {
    formRef.current = form;
  }, [form, formRef]);

  return (
    <FormProvider {...form}>
      <TransactionTypeSelector form={form} selectedType={initialType} />
    </FormProvider>
  );
}

afterEach(() => cleanup());

describe("TransactionTypeSelector category sync", () => {
  it("clears an expense category when switching to income", async () => {
    const user = userEvent.setup();
    const formRef: {
      current: UseFormReturn<TransactionFormValues> | null;
    } = { current: null };

    render(
      <Harness
        initialType="expense"
        initialCategory="food"
        formRef={formRef}
      />,
    );

    await waitFor(() => expect(formRef.current).not.toBeNull());
    expect(formRef.current?.getValues("category")).toBe("food");

    await user.click(
      screen.getByRole("tab", {
        name: /transactionForm\.transactionType\.income/,
      }),
    );

    expect(formRef.current?.getValues("category")).toBe("");
  });

  it("keeps a custom category that remains valid for the new type", async () => {
    const user = userEvent.setup();
    const formRef: {
      current: UseFormReturn<TransactionFormValues> | null;
    } = { current: null };

    render(
      <Harness
        initialType="expense"
        initialCategory="Gym Membership"
        formRef={formRef}
      />,
    );

    await waitFor(() => expect(formRef.current).not.toBeNull());

    await user.click(
      screen.getByRole("tab", {
        name: /transactionForm\.transactionType\.income/,
      }),
    );

    expect(formRef.current?.getValues("category")).toBe("Gym Membership");
  });
});
