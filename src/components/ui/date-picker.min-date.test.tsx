// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Resolver, useForm } from "react-hook-form";
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
    resolver: zodResolver(schema) as Resolver<TransactionFormValues>,
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
  it("types 15/03/2026 character by character with auto-inserted slashes", async () => {
    useGregorian();
    const user = userEvent.setup();
    const setDate = vi.fn();
    render(
      <DatePicker date={parseLocalDate("2026-10-08")} setDate={setDate} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    
    // Clear and type digit by digit
    await user.clear(input);
    
    await user.type(input, "1");
    expect(input).toHaveValue("1");
    
    await user.type(input, "5");
    expect(input).toHaveValue("15/"); // Auto-inserted slash
    
    await user.type(input, "0");
    expect(input).toHaveValue("15/0");
    
    await user.type(input, "3");
    expect(input).toHaveValue("15/03/"); // Auto-inserted slash
    
    await user.type(input, "2");
    expect(input).toHaveValue("15/03/2");
    expect(setDate).toHaveBeenLastCalledWith(undefined); // Partial date
    
    await user.type(input, "0");
    expect(input).toHaveValue("15/03/20");
    expect(setDate).toHaveBeenLastCalledWith(undefined); // Still partial
    
    await user.type(input, "2");
    expect(input).toHaveValue("15/03/202");
    
    await user.type(input, "6");
    expect(input).toHaveValue("15/03/2026");

    const committed = setDate.mock.calls[setDate.mock.calls.length - 1]?.[0] as Date;
    expect(formatLocalDate(committed)).toBe("2026-03-15");
  });

  it("types digits one by one with auto-inserted slashes (31102026)", async () => {
    useGregorian();
    const user = userEvent.setup();
    const setDate = vi.fn();
    render(
      <DatePicker date={undefined} setDate={setDate} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    await user.click(input);
    
    await user.type(input, "3");
    expect(input).toHaveValue("3");
    
    await user.type(input, "1");
    expect(input).toHaveValue("31/");
    
    await user.type(input, "1");
    expect(input).toHaveValue("31/1");
    
    await user.type(input, "0");
    expect(input).toHaveValue("31/10/");
    
    await user.type(input, "2026");
    expect(input).toHaveValue("31/10/2026");
    
    await user.tab();
    
    const committed = setDate.mock.calls[setDate.mock.calls.length - 1]?.[0] as Date;
    expect(formatLocalDate(committed)).toBe("2026-10-31");
  });

  it("backspace over slash does not re-insert it", async () => {
    useGregorian();
    const user = userEvent.setup();
    const setDate = vi.fn();
    render(
      <DatePicker date={parseLocalDate("2026-10-31")} setDate={setDate} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    await user.click(input);
    
    // Position at end and backspace several times
    await user.keyboard("{End}");
    await user.keyboard("{Backspace}");
    expect(input).toHaveValue("31/10/202");
    
    await user.keyboard("{Backspace}");
    expect(input).toHaveValue("31/10/20");
    
    await user.keyboard("{Backspace}");
    expect(input).toHaveValue("31/10/2");
    
    // Verify slash wasn't re-inserted
    expect(input).not.toHaveValue("31/10/2/");
  });

  it("mid-text edit preserves value without auto-formatting", async () => {
    useGregorian();
    const user = userEvent.setup();
    const setDate = vi.fn();
    render(
      <DatePicker date={parseLocalDate("2026-10-31")} setDate={setDate} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    expect(input).toHaveValue("31/10/2026");
    
    // Type digits only (which will auto-format)
    await user.clear(input);
    await user.type(input, "21102026");
    
    // Should auto-format to DD/MM/YYYY
    expect(input).toHaveValue("21/10/2026");
    const committed = setDate.mock.calls[setDate.mock.calls.length - 1]?.[0] as Date;
    expect(formatLocalDate(committed)).toBe("2026-10-21");
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

  it("auto-formats pasted 8 digits to DD/MM/YYYY", async () => {
    useGregorian();
    const user = userEvent.setup();
    const setDate = vi.fn();
    render(
      <DatePicker date={parseLocalDate("2026-10-08")} setDate={setDate} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    await user.click(input);
    // Select all before pasting
    await user.keyboard("{Control>}a{/Control}");
    await user.paste("31102026");

    expect(input).toHaveValue("31/10/2026");
    const committed = setDate.mock.calls[setDate.mock.calls.length - 1]?.[0] as Date;
    expect(formatLocalDate(committed)).toBe("2026-10-31");
  });

  it("auto-formats pasted 6 digits to DD/MM/YY and normalizes on blur", async () => {
    useGregorian();
    const user = userEvent.setup();
    const setDate = vi.fn();
    render(
      <DatePicker date={parseLocalDate("2026-10-08")} setDate={setDate} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    await user.click(input);
    // Select all before pasting
    await user.keyboard("{Control>}a{/Control}");
    await user.paste("311026");

    expect(input).toHaveValue("31/10/26");

    await user.tab();

    expect(input).toHaveValue("31/10/2026");
    const committed = setDate.mock.calls[setDate.mock.calls.length - 1]?.[0] as Date;
    expect(formatLocalDate(committed)).toBe("2026-10-31");
  });

  it("shows invalid error on blur for malformed input", async () => {
    useGregorian();
    const user = userEvent.setup();
    const setDate = vi.fn();
    render(
      <DatePicker date={parseLocalDate("2026-10-08")} setDate={setDate} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    await typeOverField(user, input, "abc");
    
    await user.tab();
    
    // setDate should have been called with NaN
    const lastCall = setDate.mock.calls[setDate.mock.calls.length - 1]?.[0] as Date;
    expect(Number.isNaN(lastCall.getTime())).toBe(true);
  });

  it("tracks input method correctly when switching typed to calendar to typed", async () => {
    useGregorian();
    const user = userEvent.setup();
    const setDate = vi.fn();
    const onInputStatusChange = vi.fn();
    render(
      <DatePicker 
        date={parseLocalDate("2026-10-08")} 
        setDate={setDate}
        onInputStatusChange={onInputStatusChange}
      />,
    );

    // Type a date
    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    await typeOverField(user, input, "15/03/2026");
    await user.tab();
    
    expect(onInputStatusChange).toHaveBeenCalledWith("parsed", "typed");
    
    // Open calendar and select a date
    const calendarButton = screen.getByRole("button", { name: /open calendar/i });
    await user.click(calendarButton);
    
    // Find and click any day button (using getAll to find all day buttons)
    const dayButtons = screen.getAllByRole("button").filter(button => 
      /^\d+$/.test(button.textContent || "")
    );
    expect(dayButtons.length).toBeGreaterThan(0);
    await user.click(dayButtons[5]!); // Click the 6th day button available
    
    expect(onInputStatusChange).toHaveBeenCalledWith("parsed", "calendar");
    
    // Type again
    await user.click(input);
    await typeOverField(user, input, "01/01/2026");
    await user.tab();
    
    expect(onInputStatusChange).toHaveBeenCalledWith("parsed", "typed");
  });

  it("out-of-range commit (pre-2000) emits NaN not real date", async () => {
    useGregorian();
    const user = userEvent.setup();
    const setDate = vi.fn();
    render(
      <DatePicker date={parseLocalDate("2026-10-08")} setDate={setDate} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    await typeOverField(user, input, "31/12/1999");
    
    await user.tab();
    
    // Should emit NaN, not the actual 1999 date
    const lastCall = setDate.mock.calls[setDate.mock.calls.length - 1]?.[0] as Date;
    expect(Number.isNaN(lastCall.getTime())).toBe(true);
  });

  it("accepts dates with dot separator", async () => {
    useGregorian();
    const user = userEvent.setup();
    const setDate = vi.fn();
    render(
      <DatePicker date={parseLocalDate("2026-10-08")} setDate={setDate} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    await typeOverField(user, input, "15.03.2026");

    await user.tab();

    expect(input).toHaveValue("15/03/2026");
    const committed = setDate.mock.calls[setDate.mock.calls.length - 1]?.[0] as Date;
    expect(formatLocalDate(committed)).toBe("2026-03-15");
  });

  it("accepts dates with dash separator", async () => {
    useGregorian();
    const user = userEvent.setup();
    const setDate = vi.fn();
    render(
      <DatePicker date={parseLocalDate("2026-10-08")} setDate={setDate} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    await typeOverField(user, input, "15-03-2026");

    await user.tab();

    expect(input).toHaveValue("15/03/2026");
    const committed = setDate.mock.calls[setDate.mock.calls.length - 1]?.[0] as Date;
    expect(formatLocalDate(committed)).toBe("2026-03-15");
  });

  it("has inputMode numeric on the input", () => {
    useGregorian();
    render(
      <DatePicker date={parseLocalDate("2026-10-08")} setDate={vi.fn()} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    expect(input).toHaveAttribute("inputMode", "numeric");
  });

  it("has data-ph-unmask-date attribute for session replay", () => {
    useGregorian();
    render(
      <DatePicker date={parseLocalDate("2026-10-08")} setDate={vi.fn()} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    expect(input).toHaveAttribute("data-ph-unmask-date", "true");
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

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(input).toHaveValue("abc");
    expect(screen.getByText(EN_INVALID)).toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith({ date: "2026-01-01" });
    expect(input).toHaveValue("01/01/2026");
  });

  it("blocks save when 01/01/0999 is typed and Save is clicked while focused", async () => {
    useGregorian();
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <TransactionDateFormHarness initialDate={initialDate} onSubmit={onSubmit} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    await typeOverField(user, input, "01/01/0999");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(input).toHaveValue("01/01/0999");
    // Since out_of_range dates are committed as NaN (as requested in req #2),
    // the form validation shows "Invalid date" not "min date" error
    expect(screen.getByText(EN_INVALID)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
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
    // Since out_of_range dates are committed as NaN (as requested in req #2),
    // the form validation shows "Invalid date" not "min date" error
    expect(screen.getByText(EN_INVALID)).toBeInTheDocument();
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
