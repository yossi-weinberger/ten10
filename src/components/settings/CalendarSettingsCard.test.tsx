import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CalendarSettingsCard } from "./CalendarSettingsCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      dir: () => "rtl",
    },
  }),
}));

describe("CalendarSettingsCard", () => {
  it("renders the primary calendar and display-only secondary-date controls", () => {
    const markup = renderToStaticMarkup(
      <CalendarSettingsCard
        calendarSettings={{
          calendarType: "gregorian",
          showSecondaryDate: false,
        }}
        updateSettings={vi.fn()}
      />,
    );

    expect(markup).toContain('dir="rtl"');
    expect(markup).toContain("calendar.primaryCalendarLabel");
    expect(markup).toContain("calendar.options.gregorian");
    expect(markup).toContain("calendar.options.hebrew");
    expect(markup).not.toContain('role="combobox"');
    expect(markup).toContain("calendar.showSecondaryDateLabel");
    expect(markup).toContain("calendar.showSecondaryDateDescription");
    expect(markup).toContain('role="switch"');
    expect(markup).toContain('aria-checked="false"');
  });
});
