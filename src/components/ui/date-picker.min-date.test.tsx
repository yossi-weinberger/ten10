// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  const dateRef = React.useRef(initialDate);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const submitted = dateRef.current;
        if (
          !submitted ||
          Number.isNaN(Date.parse(submitted)) ||
          !isOnOrAfterMinTransactionDate(submitted)
        ) {
          return;
        }
        onSubmit({ date: submitted });
      }}
    >
      <DatePicker
        date={date ? parseLocalDate(date) : undefined}
        setDate={(next) => {
          if (next && !Number.isNaN(next.getTime())) {
            const nextDate = formatLocalDate(next);
            dateRef.current = nextDate;
            setDate(nextDate);
          } else {
            dateRef.current = "";
            setDate("");
          }
        }}
      />
      <p data-testid="committed-date">{date}</p>
      <button type="submit">Save</button>
    </form>
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
    const onSubmit = vi.fn();
    render(
      <DateFormHarness initialDate="2026-10-08" onSubmit={onSubmit} />,
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
        expect(screen.getByTestId("committed-date")).toHaveTextContent("");
      }
    }

    expect(input).toHaveValue("15/03/2026");
    expect(screen.getByTestId("committed-date")).toHaveTextContent("2026-03-15");
  });

  it("normalizes 01/01/26 on blur to 01/01/2026 and 2026-01-01", async () => {
    useGregorian();
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <DateFormHarness initialDate="2026-10-08" onSubmit={onSubmit} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    await typeOverField(user, input, "01/01/26");

    expect(input).toHaveValue("01/01/26");
    expect(screen.getByTestId("committed-date")).toHaveTextContent("");

    await user.tab();

    expect(input).toHaveValue("01/01/2026");
    expect(screen.getByTestId("committed-date")).toHaveTextContent("2026-01-01");
  });

  it("shows the min-date error when 31/12/1999 is blurred", async () => {
    useGregorian();
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <DateFormHarness initialDate="2026-03-15" onSubmit={onSubmit} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    await typeOverField(user, input, "31/12/1999");
    await user.tab();

    expect(input).toHaveValue("31/12/1999");
    expect(screen.getByText(MIN_DATE_MESSAGE)).toBeInTheDocument();
    fireEvent.submit(input.closest("form")!);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows an invalid-date error and blocks submit for garbage", async () => {
    useGregorian();
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <DateFormHarness initialDate="2026-10-08" onSubmit={onSubmit} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    await typeOverField(user, input, "not-a-date");
    await user.tab();

    expect(input).toHaveValue("not-a-date");
    expect(screen.getByText(INVALID_DATE_MESSAGE)).toBeInTheDocument();
    expect(screen.getByTestId("committed-date")).toHaveTextContent("");
    fireEvent.submit(input.closest("form")!);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("replaces an existing date when the field is selected and retyped", async () => {
    useGregorian();
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <DateFormHarness initialDate="2026-10-08" onSubmit={onSubmit} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    expect(input).toHaveValue("08/10/2026");

    await typeOverField(user, input, "15/03/2026");

    expect(input).toHaveValue("15/03/2026");
    expect(screen.getByTestId("committed-date")).toHaveTextContent("2026-03-15");
  });

  it("commits uncommitted typed text before submit", async () => {
    useGregorian();
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <DateFormHarness initialDate="2026-10-08" onSubmit={onSubmit} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    await typeOverField(user, input, "01/01/26");

    expect(input).toHaveValue("01/01/26");
    expect(screen.getByTestId("committed-date")).toHaveTextContent("");

    fireEvent.submit(input.closest("form")!);

    expect(onSubmit).toHaveBeenCalledWith({ date: "2026-01-01" });
    expect(input).toHaveValue("01/01/2026");
    expect(screen.getByTestId("committed-date")).toHaveTextContent("2026-01-01");
  });

  it("does not show the min-date message for a valid typed date", async () => {
    useGregorian();
    const user = userEvent.setup();
    const setDate = vi.fn();
    render(
      <DatePicker
        date={parseLocalDate("2026-03-15")}
        setDate={setDate}
      />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    await typeOverField(user, input, "01/01/2000");

    expect(screen.queryByText(MIN_DATE_MESSAGE)).not.toBeInTheDocument();
    expect(setDate).toHaveBeenCalled();
    const committed = setDate.mock.calls[setDate.mock.calls.length - 1]?.[0] as Date;
    expect(formatLocalDate(committed)).toBe("2000-01-01");
  });

  it("blocks save when abc is typed and Save is clicked while the field is focused", async () => {
    useGregorian();
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <DateFormHarness initialDate="2026-10-08" onSubmit={onSubmit} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    await typeOverField(user, input, "abc");
    expect(input).toHaveValue("abc");
    expect(screen.getByTestId("committed-date")).toHaveTextContent("");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(input).toHaveValue("abc");
    expect(screen.getByText(INVALID_DATE_MESSAGE)).toBeInTheDocument();
    expect(screen.getByTestId("committed-date")).toHaveTextContent("");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("saves 2026-01-01 when 01/01/26 is typed and Save is clicked while focused", async () => {
    useGregorian();
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <DateFormHarness initialDate="2026-10-08" onSubmit={onSubmit} />,
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
      <DateFormHarness initialDate="2026-03-15" onSubmit={onSubmit} />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    await typeOverField(user, input, "31/12/1999");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(input).toHaveValue("31/12/1999");
    expect(screen.getByText(MIN_DATE_MESSAGE)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
