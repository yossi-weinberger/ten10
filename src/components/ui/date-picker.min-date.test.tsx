// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AmountCurrencyDateFields } from "@/components/forms/transaction-form-parts/AmountCurrencyDateFields";
import { DatePicker } from "@/components/ui/date-picker";
import { Form } from "@/components/ui/form";
import {
  createTransactionFormSchema,
  type TransactionFormValues,
} from "@/lib/schemas";
import { useDonationStore } from "@/lib/store";
import { formatLocalDate, parseLocalDate } from "@/lib/utils/local-date";
import enTransactions from "../../../public/locales/en/transactions.json";
import heTransactions from "../../../public/locales/he/transactions.json";

const EN_REQUIRED = enTransactions.transactionForm.validation.date.required;
const HE_REQUIRED = heTransactions.transactionForm.validation.date.required;
const EN_INVALID = enTransactions.transactionForm.validation.date.invalid;
const EN_MIN = enTransactions.transactionForm.validation.date.min;

let locale: "en" | "he" = "en";

function lookup(key: string): string {
  const messages = locale === "he" ? heTransactions : enTransactions;
  const path = key.replace(/^transactions:/, "").split(".");
  let current: unknown = messages;
  for (const part of path) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof current === "string" ? current : key;
}

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => lookup(key),
    i18n: {
      get language() {
        return locale;
      },
      dir: () => (locale === "he" ? "rtl" : "ltr"),
    },
  }),
}));

vi.mock("@/components/ui/CurrencyPicker", () => ({
  CurrencyPicker: () => <div data-testid="currency-picker" />,
}));

const initialSettings = useDonationStore.getState().settings;

afterEach(() => {
  cleanup();
  locale = "en";
  useDonationStore.setState({ settings: initialSettings });
});

function useGregorian() {
  useDonationStore.setState({
    settings: {
      ...initialSettings,
      calendarType: "gregorian",
    },
  });
}

function TransactionDateFormHarness({
  initialDate,
  onSubmit,
}: {
  initialDate: string;
  onSubmit: (values: { date: string }) => void;
}) {
  const schema = createTransactionFormSchema(((key: string) => lookup(key)) as never);
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: 100,
      currency: "ILS",
      date: initialDate,
      type: "income",
      isExempt: false,
      isRecognized: false,
      isFromPersonalFunds: false,
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => onSubmit({ date: values.date }))}
      >
        <AmountCurrencyDateFields form={form} />
        <p data-testid="committed-date">{form.watch("date")}</p>
        <button type="submit">Save</button>
      </form>
    </Form>
  );
}

async function typeOverField(
  user: ReturnType<typeof userEvent.setup>,
  input: HTMLElement,
  value: string,
) {
  await user.click(input);
  for (let index = 0; index < value.length; index += 1) {
    const options =
      index === 0
        ? {
            initialSelectionStart: 0,
            initialSelectionEnd: (input as HTMLInputElement).value.length,
          }
        : undefined;
    await user.type(input, value[index]!, options);
  }
}

describe("DatePicker typed dates", () => {
  it("types 15/03/2026 character by character without rewriting the field", async () => {
    useGregorian();
    const user = userEvent.setup();
    const setDate = vi.fn();
    render(
      <DatePicker date={parseLocalDate("2026-10-08")} setDate={setDate} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    const typed = "15/03/2026";
    await user.click(input);
    for (let index = 0; index < typed.length; index += 1) {
      const options =
        index === 0
          ? {
              initialSelectionStart: 0,
              initialSelectionEnd: (input as HTMLInputElement).value.length,
            }
          : undefined;
      await user.type(input, typed[index]!, options);
      expect(input).toHaveValue(typed.slice(0, index + 1));
      if (typed.slice(0, index + 1) === "15/03/20") {
        expect(setDate).toHaveBeenLastCalledWith(undefined);
      }
    }

    expect(input).toHaveValue("15/03/2026");
    const committed = setDate.mock.calls[setDate.mock.calls.length - 1]?.[0] as Date;
    expect(formatLocalDate(committed)).toBe("2026-03-15");
  });

  it("normalizes 01/01/26 on blur to 01/01/2026", async () => {
    useGregorian();
    const user = userEvent.setup();
    const setDate = vi.fn();
    render(
      <DatePicker date={parseLocalDate("2026-10-08")} setDate={setDate} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    await typeOverField(user, input, "01/01/26");

    expect(input).toHaveValue("01/01/26");
    expect(setDate).toHaveBeenLastCalledWith(undefined);

    await user.tab();

    expect(input).toHaveValue("01/01/2026");
    const committed = setDate.mock.calls[setDate.mock.calls.length - 1]?.[0] as Date;
    expect(formatLocalDate(committed)).toBe("2026-01-01");
  });
});

describe.each([
  { mode: "add", initialDate: "2026-10-08" },
  { mode: "edit", initialDate: "2026-03-15" },
] as const)("transaction date Save click ($mode)", ({ initialDate }) => {
  it("blocks save when abc is typed and Save is clicked while focused", async () => {
    useGregorian();
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <TransactionDateFormHarness initialDate={initialDate} onSubmit={onSubmit} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    await typeOverField(user, input, "abc");
    expect(input).toHaveValue("abc");
    expect(screen.getByTestId("committed-date")).toHaveTextContent("");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(input).toHaveValue("abc");
    expect(screen.getByText(EN_INVALID)).toBeInTheDocument();
    expect(screen.getByTestId("committed-date")).toHaveTextContent("invalid");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("saves 2026-01-01 when 01/01/26 is typed and Save is clicked while focused", async () => {
    useGregorian();
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <TransactionDateFormHarness initialDate={initialDate} onSubmit={onSubmit} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    await typeOverField(user, input, "01/01/26");
    expect(screen.getByTestId("committed-date")).toHaveTextContent("");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith({ date: "2026-01-01" });
    expect(input).toHaveValue("01/01/2026");
    expect(screen.getByTestId("committed-date")).toHaveTextContent("2026-01-01");
  });

  it("blocks save when 31/12/1999 is typed and Save is clicked while focused", async () => {
    useGregorian();
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <TransactionDateFormHarness initialDate={initialDate} onSubmit={onSubmit} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    await typeOverField(user, input, "31/12/1999");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(input).toHaveValue("31/12/1999");
    expect(screen.getByText(EN_MIN)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("empty date Save shows a visible field error", () => {
  it("shows the English required message under the field", async () => {
    useGregorian();
    locale = "en";
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <TransactionDateFormHarness initialDate="2026-10-08" onSubmit={onSubmit} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText(EN_REQUIRED)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the Hebrew required message under the field", async () => {
    useGregorian();
    locale = "he";
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <TransactionDateFormHarness initialDate="2026-03-15" onSubmit={onSubmit} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText(HE_REQUIRED)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
