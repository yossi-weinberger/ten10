// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DatePicker } from "@/components/ui/date-picker";
import { useDonationStore } from "@/lib/store";
import { parseLocalDate } from "@/lib/utils/local-date";

const MIN_DATE_MESSAGE = "Date must be on or after January 1, 2000";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key === "transactions:transactionForm.validation.date.min"
        ? MIN_DATE_MESSAGE
        : key,
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

describe("DatePicker min-date typed input", () => {
  it("shows the min-date validation message when a date before 2000 is typed", async () => {
    const user = userEvent.setup();
    useDonationStore.setState({
      settings: {
        ...initialSettings,
        calendarType: "gregorian",
      },
    });

    render(
      <DatePicker
        date={parseLocalDate("2026-03-15")}
        setDate={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    await user.clear(input);
    await user.type(input, "01/01/1999");

    expect(await screen.findByRole("alert")).toHaveTextContent(MIN_DATE_MESSAGE);
  });

  it("does not show the min-date message for a valid typed date", async () => {
    const user = userEvent.setup();
    useDonationStore.setState({
      settings: {
        ...initialSettings,
        calendarType: "gregorian",
      },
    });

    render(
      <DatePicker
        date={parseLocalDate("2026-03-15")}
        setDate={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText("DD/MM/YYYY");
    await user.clear(input);
    await user.type(input, "01/01/2000");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
