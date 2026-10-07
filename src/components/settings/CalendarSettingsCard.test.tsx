import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CalendarSettingsCard } from "./CalendarSettingsCard";

const mockLanguage = vi.hoisted(() => ({ current: "he" }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      dir: () => "rtl",
      language: mockLanguage.current,
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
          gregorianDateFormat: "day-month-year",
          hebrewEnglishDateFormat: "mixed",
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
    expect(markup).toContain("calendar.gregorianFormatLabel");
    expect(markup).not.toContain("calendar.hebrewEnglishFormatLabel");
  });

  it("shows the Hebrew-date-in-English control only in the English UI", () => {
    mockLanguage.current = "en";
    const markup = renderToStaticMarkup(
      <CalendarSettingsCard
        calendarSettings={{
          calendarType: "hebrew",
          showSecondaryDate: false,
          gregorianDateFormat: "day-month-year",
          hebrewEnglishDateFormat: "numbers",
        }}
        updateSettings={vi.fn()}
      />,
    );
    mockLanguage.current = "he";

    expect(markup).toContain("calendar.hebrewEnglishFormatLabel");
    expect(markup).toContain("calendar.hebrewEnglishFormatOptions.numbers");
  });
});
