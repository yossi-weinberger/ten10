// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { TransactionFormValues } from "@/lib/schemas";
import { Form } from "@/components/ui/form";
import { RecurringFields } from "./RecurringFields";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => undefined;
  HTMLElement.prototype.scrollIntoView = () => undefined;
});

afterEach(cleanup);

function Harness({
  calendarType,
  dayOfMonth = 30,
}: {
  calendarType: "gregorian" | "hebrew";
  dayOfMonth?: number;
}) {
  const form = useForm<TransactionFormValues>({
    defaultValues: {
      frequency: "monthly",
      recurring_calendar_type: calendarType,
      recurring_day_of_month: dayOfMonth,
    },
  });
  return (
    <Form {...form}>
      <RecurringFields form={form} />
    </Form>
  );
}

describe("RecurringFields calendar controls", () => {
  it("offers Gregorian and Hebrew overrides", async () => {
    const user = userEvent.setup();
    render(<Harness calendarType="gregorian" />);

    await user.click(screen.getByRole("combobox", {
      name: "transactionForm.recurringTransaction.calendar.label",
    }));

    expect(
      screen.getByRole("option", {
        name: "transactionForm.recurringTransaction.calendar.gregorian",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("option", {
        name: "transactionForm.recurringTransaction.calendar.hebrew",
      }),
    ).toBeTruthy();
  });

  it.each([
    ["gregorian", "31"],
    ["hebrew", "30"],
  ] as const)("uses the %s day range", (calendarType, maximum) => {
    render(<Harness calendarType={calendarType} />);

    const dayInput = screen.getByRole("spinbutton", {
      name: "transactionForm.recurringTransaction.dayOfMonth",
    });
    expect(dayInput.getAttribute("max")).toBe(maximum);
  });

  it("clamps an existing day 31 when Hebrew is selected", async () => {
    const user = userEvent.setup();
    render(<Harness calendarType="gregorian" dayOfMonth={31} />);

    await user.click(screen.getByRole("combobox", {
      name: "transactionForm.recurringTransaction.calendar.label",
    }));
    await user.click(screen.getByRole("option", {
      name: "transactionForm.recurringTransaction.calendar.hebrew",
    }));

    expect(
      (screen.getByRole("spinbutton", {
        name: "transactionForm.recurringTransaction.dayOfMonth",
      }) as HTMLInputElement).value,
    ).toBe("30");
  });
});
