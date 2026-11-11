// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeAll } from "vitest";
import userEvent from "@testing-library/user-event";
import { CurrencyConversionInfo } from "./CurrencyConversionInfo";

beforeAll(() => {
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

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => undefined },
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

vi.mock("@/lib/calendar/use-display-date", () => ({
  useDisplayDate: () => (date: string) => ({
    primary: date,
    secondary: null,
  }),
}));

describe("CurrencyConversionInfo PostHog masking", () => {
  it("applies data-ph-mask to simple amount display", () => {
    const { container } = render(
      <CurrencyConversionInfo
        amount={100}
        currency="ILS"
        originalAmount={null}
        originalCurrency={null}
        conversionRate={null}
        conversionDate={null}
        rateSource={null}
        mode="static"
      />
    );

    const maskedElement = container.querySelector('[data-ph-mask]');
    expect(maskedElement).toBeTruthy();
    expect(maskedElement?.classList.contains("ph-mask")).toBe(true);
  });

  it("applies data-ph-mask to converted amount wrapper", () => {
    const { container } = render(
      <CurrencyConversionInfo
        amount={100}
        currency="ILS"
        originalAmount={85}
        originalCurrency="USD"
        conversionRate={1.176}
        conversionDate="2026-11-10"
        rateSource="manual"
        mode="static"
      />
    );

    const wrapper = container.querySelector('[data-ph-mask]');
    expect(wrapper).toBeTruthy();
    expect(wrapper?.classList.contains("ph-mask")).toBe(true);
  });
});
