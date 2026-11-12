// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DatePicker } from "@/components/ui/date-picker";
import { useDonationStore } from "@/lib/store";
import { parseLocalDate } from "@/lib/utils/local-date";

let mockMatches = false;
let mockLanguage = "en";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, Record<string, string>> = {
        en: {
          "datePicker.selectDate": "Select date",
          "datePicker.openCalendar": "Open calendar",
        },
        he: {
          "datePicker.selectDate": "בחירת תאריך",
          "datePicker.openCalendar": "פתיחת לוח שנה",
        },
      };
      return translations[mockLanguage]?.[key] || key;
    },
    i18n: {
      language: mockLanguage,
      dir: () => (mockLanguage === "he" ? "rtl" : "ltr"),
    },
  }),
}));

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => mockMatches,
}));

const initialSettings = useDonationStore.getState().settings;

beforeEach(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn();

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
  mockMatches = false;
  mockLanguage = "en";
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

describe("DatePicker i18n", () => {
  describe("English locale", () => {
    beforeEach(() => {
      mockLanguage = "en";
    });

    it("should translate 'Open calendar' button in English", () => {
      useGregorian();
      const setDate = vi.fn();

      render(
        <DatePicker date={parseLocalDate("2026-10-08")} setDate={setDate} />
      );

      const calendarButton = screen.getByRole("button", {
        name: /open calendar/i,
      });
      expect(calendarButton).toBeInTheDocument();
      expect(calendarButton.textContent).not.toBe("datePicker.openCalendar");
    });

    it("should resolve datePicker.selectDate key in English mobile drawer", async () => {
      useGregorian();
      mockMatches = true;
      const user = userEvent.setup();
      const setDate = vi.fn();

      render(
        <DatePicker date={parseLocalDate("2026-10-08")} setDate={setDate} />
      );

      const calendarButton = screen.getByRole("button", {
        name: /open calendar/i,
      });
      await user.click(calendarButton);

      const dialog = screen.getByRole("dialog", { name: /select date/i });
      expect(dialog).toBeInTheDocument();

      const titleText = dialog.getAttribute("aria-labelledby");
      if (titleText) {
        const titleElement = document.getElementById(titleText);
        expect(titleElement?.textContent).not.toBe("datePicker.selectDate");
        expect(titleElement?.textContent).toBe("Select date");
      }
    });
  });

  describe("Hebrew locale", () => {
    beforeEach(() => {
      mockLanguage = "he";
    });

    it("should translate 'Open calendar' button in Hebrew", () => {
      useGregorian();
      const setDate = vi.fn();

      render(
        <DatePicker date={parseLocalDate("2026-10-08")} setDate={setDate} />
      );

      const calendarButton = screen.getByRole("button", {
        name: /פתיחת לוח שנה/i,
      });
      expect(calendarButton).toBeInTheDocument();
      expect(calendarButton.textContent).not.toBe("datePicker.openCalendar");
    });

    it("should resolve datePicker.selectDate key in Hebrew mobile drawer", async () => {
      useGregorian();
      mockMatches = true;
      const user = userEvent.setup();
      const setDate = vi.fn();

      render(
        <DatePicker date={parseLocalDate("2026-10-08")} setDate={setDate} />
      );

      const calendarButton = screen.getByRole("button", {
        name: /פתיחת לוח שנה/i,
      });
      await user.click(calendarButton);

      const dialog = screen.getByRole("dialog", { name: /בחירת תאריך/i });
      expect(dialog).toBeInTheDocument();

      const titleText = dialog.getAttribute("aria-labelledby");
      if (titleText) {
        const titleElement = document.getElementById(titleText);
        expect(titleElement?.textContent).not.toBe("datePicker.selectDate");
        expect(titleElement?.textContent).toBe("בחירת תאריך");
      }
    });
  });
});
