// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormProvider, useForm } from "react-hook-form";
import type { TransactionFormValues } from "@/lib/schemas";
import { TransactionTypeSelector } from "./TransactionTypeSelector";

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "he", dir: () => "rtl" },
  }),
}));

function Harness({
  initialType,
  initialCategory,
}: {
  initialType: TransactionFormValues["type"] | "";
  initialCategory: string;
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

  const selectedType = form.watch("type") || "";
  const category = form.watch("category") ?? "";

  return (
    <FormProvider {...form}>
      <TransactionTypeSelector form={form} selectedType={selectedType} />
      <output data-testid="category-value">{category}</output>
    </FormProvider>
  );
}

afterEach(() => cleanup());

describe("TransactionTypeSelector category sync", () => {
  it("clears an expense category when switching to income", async () => {
    const user = userEvent.setup();
    render(<Harness initialType="expense" initialCategory="food" />);

    expect(screen.getByTestId("category-value")).toHaveTextContent("food");

    await user.click(
      screen.getByRole("tab", {
        name: /transactionForm\.transactionType\.income/,
      }),
    );

    expect(screen.getByTestId("category-value")).toHaveTextContent("");
  });

  it("keeps a custom category that remains valid for the new type", async () => {
    const user = userEvent.setup();
    render(<Harness initialType="expense" initialCategory="Gym Membership" />);

    await user.click(
      screen.getByRole("tab", {
        name: /transactionForm\.transactionType\.income/,
      }),
    );

    expect(screen.getByTestId("category-value")).toHaveTextContent(
      "Gym Membership",
    );
  });
});
