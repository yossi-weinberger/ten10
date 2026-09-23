// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { he, enUS } from "date-fns/locale";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Calendar } from "@/components/ui/calendar";
import { DatePicker } from "@/components/ui/date-picker";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { getCalendarAdapter } from "@/lib/calendar";
import { useDonationStore } from "@/lib/store";
import { formatLocalDate, parseLocalDate } from "@/lib/utils/local-date";

let language = "he";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, Record<string, string>> = {
        en: {
          "datePicker.selectDateRange": "Select date range",
        },
        he: {
          "datePicker.selectDateRange": "בחר טווח תאריכים",
        },
      };
      return translations[language][key] ?? key;
    },
    i18n: {
      get language() {
        return language;
      },
      dir: () => (language === "he" ? "rtl" : "ltr"),
    },
  }),
}));

const hebrew = getCalendarAdapter("hebrew");
const initialSettings = useDonationStore.getState().settings;

interface CalendarTestOptions {
  captionLayout?: "label" | "dropdown" | "dropdown-months" | "dropdown-years";
  startMonth?: Date;
  endMonth?: Date;
  onSelect?: (date: Date | undefined) => void;
}

function setCalendarType(calendarType: "gregorian" | "hebrew") {
  useDonationStore.setState({
    settings: {
      ...initialSettings,
      calendarType,
      showSecondaryDate: false,
    },
  });
}

function renderCalendar(
  month: Date,
  options: CalendarTestOptions = {},
) {
  return render(
    <Calendar
      mode="single"
      month={month}
      locale={language === "he" ? he : enUS}
      dir={language === "he" ? "rtl" : "ltr"}
      {...options}
    />,
  );
}

function StatefulCalendar({
  initialMonth,
  ...options
}: {
  initialMonth: Date;
} & CalendarTestOptions) {
  const [month, setMonth] = React.useState(initialMonth);
  return (
    <Calendar
      mode="single"
      month={month}
      onMonthChange={setMonth}
      locale={language === "he" ? he : enUS}
      dir={language === "he" ? "rtl" : "ltr"}
      {...options}
    />
  );
}

function getCurrentMonthCells(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      '[role="gridcell"][data-day]:not([data-outside])',
    ),
  );
}

function getDayButton(isoDate: string): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>(
    `[role="gridcell"][data-day="${isoDate}"] button`,
  );
  if (!button) {
    throw new Error(`Missing day button for ${isoDate}`);
  }
  return button;
}

beforeEach(() => {
  language = "he";
  setCalendarType("hebrew");
});

afterEach(() => {
  cleanup();
  setCalendarType("gregorian");
});

describe("Hebrew calendar grid", () => {
  it.each([
    ["he", "תשרי"],
    ["en", "Tishri"],
  ] as const)(
    "renders all 30 Tishrei 5787 days with correct weekday alignment in %s",
    (testLanguage, expectedCaption) => {
      language = testLanguage;
      const { container } = renderCalendar(parseLocalDate("2026-09-12"));

      const currentMonthCells = getCurrentMonthCells(container);
      expect(currentMonthCells).toHaveLength(30);
      expect(screen.getByRole("status")).toHaveTextContent(expectedCaption);
      expect(screen.getByRole("status")).toHaveTextContent("תשפ״ז");

      const firstDayCell = container.querySelector<HTMLElement>(
        '[role="gridcell"][data-day="2026-09-12"]',
      );
      expect(firstDayCell).not.toBeNull();
      expect(firstDayCell).toHaveTextContent("א׳");
      expect(getDayButton("2026-09-12")).toHaveAttribute("data-yom-tov", "true");
      expect(getDayButton("2026-09-12")).toHaveAttribute("data-shabbat", "true");
      expect(getDayButton("2026-09-19")).toHaveAttribute("data-shabbat", "true");
      expect(getDayButton("2026-09-19")).not.toHaveAttribute("data-yom-tov");
      expect(getDayButton("2026-09-14")).not.toHaveAttribute("data-shabbat");
      expect(
        Array.from(firstDayCell?.parentElement?.children ?? []).indexOf(
          firstDayCell as HTMLElement,
        ),
      ).toBe(6);
    },
  );

  it("navigates from Elul 29 to Tishrei 1 across the Hebrew year boundary", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <StatefulCalendar initialMonth={parseLocalDate("2026-09-11")} />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("אלול");
    await user.click(
      container.querySelector<HTMLButtonElement>(".rdp-button_next")!,
    );

    expect(screen.getByRole("status")).toHaveTextContent("תשרי");
    expect(screen.getByRole("status")).toHaveTextContent("תשפ״ז");
    expect(getCurrentMonthCells(container)[0]).toHaveAttribute(
      "data-day",
      "2026-09-12",
    );
  });

  it("exposes both Adars in leap year dropdowns and omits Adar I in a simple year", async () => {
    const user = userEvent.setup();
    const leapStart = parseLocalDate(
      hebrew.toIsoDate({ year: 5787, month: 1, day: 1 }),
    );
    const leapEnd = parseLocalDate(
      hebrew.toIsoDate({ year: 5787, month: 13, day: 1 }),
    );
    const adarI = parseLocalDate(
      hebrew.toIsoDate({ year: 5787, month: 6, day: 1 }),
    );
    const { unmount } = render(
      <StatefulCalendar
        initialMonth={adarI}
        captionLayout="dropdown"
        startMonth={leapStart}
        endMonth={leapEnd}
      />,
    );

    const leapMonthSelect = screen.getByRole("combobox", { name: /month/i });
    expect(
      within(leapMonthSelect).getByRole("option", { name: /אדר א/ }),
    ).toBeInTheDocument();
    expect(
      within(leapMonthSelect).getByRole("option", { name: /אדר ב/ }),
    ).toBeInTheDocument();
    await user.selectOptions(leapMonthSelect, "6");
    expect(leapMonthSelect).toHaveValue("6");
    unmount();

    const simpleStart = parseLocalDate(
      hebrew.toIsoDate({ year: 5788, month: 1, day: 1 }),
    );
    const simpleEnd = parseLocalDate(
      hebrew.toIsoDate({ year: 5788, month: 12, day: 1 }),
    );
    render(
      <StatefulCalendar
        initialMonth={simpleStart}
        captionLayout="dropdown"
        startMonth={simpleStart}
        endMonth={simpleEnd}
      />,
    );

    const simpleMonthSelect = screen.getByRole("combobox", { name: /month/i });
    expect(within(simpleMonthSelect).getAllByRole("option")).toHaveLength(12);
    expect(
      within(simpleMonthSelect).queryByRole("option", { name: /אדר א/ }),
    ).not.toBeInTheDocument();
    expect(
      within(simpleMonthSelect).getByRole("option", { name: /^אדר(?:\s|$)/ }),
    ).toBeInTheDocument();
  });

  it("never renders day 30 in a short Hebrew month", () => {
    const shortMonth = Array.from(
      { length: 13 },
      (_, index) => index + 1,
    ).find((month) => hebrew.daysInMonth(5787, month) === 29);
    expect(shortMonth).toBeDefined();
    const month = parseLocalDate(
      hebrew.toIsoDate({ year: 5787, month: shortMonth!, day: 1 }),
    );
    const { container } = renderCalendar(month);

    const currentMonthCells = getCurrentMonthCells(container);
    expect(currentMonthCells).toHaveLength(29);
    expect(
      currentMonthCells.some((cell) => cell.textContent === "30"),
    ).toBe(false);
  });

  it("returns the exact Gregorian date selected from a Hebrew cell", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderCalendar(parseLocalDate("2026-09-12"), { onSelect });

    await user.click(getDayButton("2026-09-21"));

    expect(onSelect).toHaveBeenCalled();
    const selected = onSelect.mock.calls[onSelect.mock.calls.length - 1][0] as Date;
    expect(formatLocalDate(selected)).toBe("2026-09-21");
    expect(hebrew.fromIsoDate(formatLocalDate(selected))).toMatchObject({
      year: 5787,
      month: 1,
      day: 10,
    });
  });

  it("supports RTL navigation semantics and Gregorian weekday labels", () => {
    const { container } = renderCalendar(parseLocalDate("2026-09-12"));

    expect(container.querySelector("[data-slot=calendar]")).toHaveAttribute(
      "dir",
      "rtl",
    );
    expect(container.querySelector(".rdp-button_previous")).toHaveAttribute(
      "type",
      "button",
    );
    expect(container.querySelector(".rdp-button_next")).toHaveAttribute(
      "type",
      "button",
    );
    expect(container.querySelectorAll(".rdp-weekday")).toHaveLength(7);
    expect(screen.getByRole("grid")).toHaveAccessibleName(/תשרי/);
  });
});

describe("Hebrew date pickers", () => {
  it("keeps DatePicker manual input Gregorian without extra help text", () => {
    render(
      <DatePicker date={parseLocalDate("2026-09-12")} setDate={vi.fn()} />,
    );

    expect(screen.getByRole("textbox")).toHaveValue("12/09/2026");
    expect(screen.getByRole("textbox")).not.toHaveAccessibleDescription();
    expect(
      screen.queryByText("הזנה ידנית לפי הלוח הגרגוריאני (DD/MM/YYYY)"),
    ).not.toBeInTheDocument();
  });

  it("selects an exact Gregorian date through DatePicker Hebrew grid", async () => {
    const user = userEvent.setup();
    const setDate = vi.fn();
    render(
      <DatePicker date={parseLocalDate("2026-09-12")} setDate={setDate} />,
    );

    await user.click(screen.getByRole("button", { name: "Open calendar" }));
    await user.click(getDayButton("2026-09-21"));

    const selected = setDate.mock.calls[setDate.mock.calls.length - 1][0] as Date;
    expect(formatLocalDate(selected)).toBe(
      "2026-09-21",
    );
  });

  it("returns Gregorian endpoints for a range spanning a Hebrew year boundary", async () => {
    const user = userEvent.setup();
    const onDateChange = vi.fn();
    render(
      <DatePickerWithRange
        date={{
          from: parseLocalDate("2026-09-11"),
          to: undefined,
        }}
        onDateChange={onDateChange}
      />,
    );

    expect(screen.getByRole("button", { name: /אלול/ })).toHaveTextContent(
      "אלול",
    );
    await user.click(screen.getByRole("button", { name: /אלול/ }));
    await user.click(getDayButton("2026-09-12"));

    const range = onDateChange.mock.calls[
      onDateChange.mock.calls.length - 1
    ][0] as {
      from: Date;
      to?: Date;
    };
    expect(formatLocalDate(range.from)).toBe("2026-09-11");
    expect(formatLocalDate(range.to!)).toBe("2026-09-12");
  });
});

describe("Gregorian calendar regression", () => {
  it("retains current Gregorian caption, day numbering, and selection output", async () => {
    setCalendarType("gregorian");
    language = "en";
    const onSelect = vi.fn();
    const { container } = renderCalendar(parseLocalDate("2026-09-12"), {
      onSelect,
    });

    expect(screen.getByRole("status")).toHaveTextContent("September 2026");
    expect(getCurrentMonthCells(container)).toHaveLength(30);
    expect(
      container.querySelector('[data-day="2026-09-12"] button'),
    ).toHaveTextContent("12");

    fireEvent.click(getDayButton("2026-09-21"));
    const selected = onSelect.mock.calls[onSelect.mock.calls.length - 1][0] as Date;
    expect(formatLocalDate(selected)).toBe(
      "2026-09-21",
    );
  });
});
