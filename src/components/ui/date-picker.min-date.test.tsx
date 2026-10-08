// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DatePicker } from "@/components/ui/date-picker";
import { useDonationStore } from "@/lib/store";
import { formatLocalDate, parseLocalDate } from "@/lib/utils/local-date";
import { isOnOrAfterMinTransactionDate } from "@/lib/utils/transaction-date";

const MIN_DATE_MESSAGE = "Date must be on or after January 1, 2000";
const INVALID_DATE_MESSAGE = "Invalid date";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === "transactions:transactionForm.validation.date.min") {
        return MIN_DATE_MESSAGE;
      }
      if (key === "transactions:transactionForm.validation.date.invalid") {
        return INVALID_DATE_MESSAGE;
      }
      return key;
    },
    i18n: {
      language: "en",
      dir: () => "ltr",
    },
  }),
}));

const initialSettings = useDonationStore.getState().settings;

afterEach(() => {
  cleanup();
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

function DateFormHarness({
  initialDate,
  onSubmit,
}: {
  initialDate: string;
  onSubmit: (values: { date: string }) => void;
}) {
  const [date, setDate] = React.useState(initialDate);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (
          !date ||
          Number.isNaN(Date.parse(date)) ||
          !isOnOrAfterMinTransactionDate(date)
        ) {
          return;
        }
        onSubmit({ date });
      }}
    >
      <DatePicker
        date={date ? parseLocalDate(date) : undefined}
        setDate={(next) => {
          if (next && !Number.isNaN(next.getTime())) {
            setDate(formatLocalDate(next));
          } else {
            setDate("");
          }
        }}
      />
      <p data-testid="committed-date">{date}</p>
      <button type="submit">Save</button>
    </form>
  );
}

describe("DatePicker typed dates", () => {
  it("commits 01/01/26 to setDate as 1 Jan 2026", () => {
    useGregorian();
    const setDate = vi.fn();
    render(
      <DatePicker
        date={parseLocalDate("2026-10-08")}
        setDate={setDate}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("DD/MM/YYYY"), {
      target: { value: "01/01/26" },
    });

    expect(setDate).toHaveBeenCalled();
    const committed = setDate.mock.calls.at(-1)?.[0] as Date;
    expect(formatLocalDate(committed)).toBe("2026-01-01");
    expect(screen.getByPlaceholderText("DD/MM/YYYY")).toHaveValue("01/01/2026");
  });

  it("writes 2026-01-01 to the form and display when 01/01/26 is typed", () => {
    useGregorian();
    const onSubmit = vi.fn();
    render(
      <DateFormHarness initialDate="2026-10-08" onSubmit={onSubmit} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    fireEvent.change(input, { target: { value: "01/01/26" } });
    fireEvent.blur(input);

    expect(input).toHaveValue("01/01/2026");
    expect(screen.getByTestId("committed-date")).toHaveTextContent("2026-01-01");
    fireEvent.submit(input.closest("form")!);
    expect(onSubmit).toHaveBeenCalledWith({ date: "2026-01-01" });
  });

  it("shows an invalid-date error and blocks submit for garbage input", () => {
    useGregorian();
    const onSubmit = vi.fn();
    render(
      <DateFormHarness initialDate="2026-10-08" onSubmit={onSubmit} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    fireEvent.change(input, { target: { value: "not-a-date" } });
    fireEvent.blur(input);

    expect(input).toHaveValue("not-a-date");
    expect(screen.getByText(INVALID_DATE_MESSAGE)).toBeInTheDocument();
    expect(screen.getByTestId("committed-date")).toHaveTextContent("");
    fireEvent.submit(input.closest("form")!);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the min-date validation message when a date before 2000 is typed", () => {
    useGregorian();
    const onSubmit = vi.fn();
    render(
      <DateFormHarness initialDate="2026-03-15" onSubmit={onSubmit} />,
    );

    fireEvent.change(screen.getByPlaceholderText("DD/MM/YYYY"), {
      target: { value: "01/01/1999" },
    });

    expect(screen.getByText(MIN_DATE_MESSAGE)).toBeInTheDocument();
    fireEvent.submit(screen.getByPlaceholderText("DD/MM/YYYY").closest("form")!);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not show the min-date message for a valid typed date", () => {
    useGregorian();
    const setDate = vi.fn();
    render(
      <DatePicker
        date={parseLocalDate("2026-03-15")}
        setDate={setDate}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("DD/MM/YYYY"), {
      target: { value: "01/01/2000" },
    });

    expect(screen.queryByText(MIN_DATE_MESSAGE)).not.toBeInTheDocument();
    expect(setDate).toHaveBeenCalled();
  });
});
