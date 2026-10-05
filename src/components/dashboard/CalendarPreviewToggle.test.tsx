// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCalendarPreview } from "@/lib/calendar/calendar-preview";
import { useDonationStore } from "@/lib/store";
import { CalendarPreviewToggle } from "./CalendarPreviewToggle";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "he", dir: () => "rtl" },
  }),
}));

function setCalendarSettings(
  calendarType: "gregorian" | "hebrew",
  showSecondaryDate: boolean,
) {
  useDonationStore.setState({
    settings: {
      ...useDonationStore.getState().settings,
      calendarType,
      showSecondaryDate,
    },
  });
}

describe("CalendarPreviewToggle visibility", () => {
  beforeEach(() => {
    useCalendarPreview.setState({ preview: null });
    setCalendarSettings("gregorian", false);
  });

  afterEach(cleanup);

  it("stays hidden for a Gregorian user who does not show a secondary date", () => {
    render(<CalendarPreviewToggle />);

    expect(screen.queryByRole("group")).toBeNull();
  });

  it.each([
    ["hebrew", false],
    ["gregorian", true],
  ] as const)(
    "shows the switch when the saved calendar is %s and secondary date is %s",
    (calendarType, showSecondaryDate) => {
      setCalendarSettings(calendarType, showSecondaryDate);
      render(<CalendarPreviewToggle />);

      expect(
        screen.getByRole("radio", { name: "dateRange.calendarHebrew" }),
      ).toBeTruthy();
    },
  );

  it("drops a temporary Hebrew view when the switch is no longer available", () => {
    setCalendarSettings("gregorian", true);
    useCalendarPreview.setState({ preview: "hebrew" });
    const { rerender } = render(<CalendarPreviewToggle />);

    setCalendarSettings("gregorian", false);
    rerender(<CalendarPreviewToggle />);

    expect(useCalendarPreview.getState().preview).toBeNull();
    expect(screen.queryByRole("group")).toBeNull();
  });
});
