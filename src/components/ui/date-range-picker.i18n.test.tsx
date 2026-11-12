// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { parseLocalDate } from "@/lib/utils/local-date";

let mockMatches = false;
let mockLanguage = "en";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, Record<string, string>> = {
        en: {
          "datePicker.selectDateRange": "Select date range",
          "actions.clear": "Clear",
          "actions.apply": "Apply",
        },
        he: {
          "datePicker.selectDateRange": "בחר טווח תאריכים",
          "actions.clear": "ניקוי",
          "actions.apply": "החל",
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

vi.mock("@/lib/calendar/use-display-date", () => ({
  useDisplayDate: () => () => ({ day: "1", month: "Jan", year: "2026" }),
}));

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
});

describe("DatePickerWithRange i18n", () => {
  describe("English locale", () => {
    beforeEach(() => {
      mockLanguage = "en";
    });

    it("should have accessible dialog name in English mobile drawer", async () => {
      mockMatches = true;
      const user = userEvent.setup();
      const onDateChange = vi.fn();

      render(
        <DatePickerWithRange
          date={{
            from: parseLocalDate("2026-10-01"),
            to: parseLocalDate("2026-10-08"),
          }}
          onDateChange={onDateChange}
        />
      );

      const triggerButton = screen.getByRole("button");
      await user.click(triggerButton);

      const dialog = screen.getByRole("dialog", {
        name: /select date range/i,
      });
      expect(dialog).toBeInTheDocument();

      const titleText = dialog.getAttribute("aria-labelledby");
      if (titleText) {
        const titleElement = document.getElementById(titleText);
        expect(titleElement?.textContent).not.toBe("datePicker.selectDateRange");
        expect(titleElement?.textContent).toBe("Select date range");
      }
    });
  });

  describe("Hebrew locale", () => {
    beforeEach(() => {
      mockLanguage = "he";
    });

    it("should have accessible dialog name in Hebrew mobile drawer", async () => {
      mockMatches = true;
      const user = userEvent.setup();
      const onDateChange = vi.fn();

      render(
        <DatePickerWithRange
          date={{
            from: parseLocalDate("2026-10-01"),
            to: parseLocalDate("2026-10-08"),
          }}
          onDateChange={onDateChange}
        />
      );

      const triggerButton = screen.getByRole("button");
      await user.click(triggerButton);

      const dialog = screen.getByRole("dialog", {
        name: /בחר טווח תאריכים/i,
      });
      expect(dialog).toBeInTheDocument();

      const titleText = dialog.getAttribute("aria-labelledby");
      if (titleText) {
        const titleElement = document.getElementById(titleText);
        expect(titleElement?.textContent).not.toBe("datePicker.selectDateRange");
        expect(titleElement?.textContent).toBe("בחר טווח תאריכים");
      }
    });
  });
});
