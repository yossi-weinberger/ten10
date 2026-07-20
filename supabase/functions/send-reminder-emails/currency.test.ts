import { describe, expect, it } from "vitest";
import {
  formatReminderAmount,
  normalizeReminderCurrencyCode,
} from "./currency.ts";

describe("reminder currency helpers", () => {
  it("falls back to ILS for missing or unknown codes", () => {
    expect(normalizeReminderCurrencyCode(null)).toBe("ILS");
    expect(normalizeReminderCurrencyCode("")).toBe("ILS");
    expect(normalizeReminderCurrencyCode("btc")).toBe("ILS");
    expect(normalizeReminderCurrencyCode("usd")).toBe("USD");
  });

  it("keeps the historical ILS layout for Hebrew and English", () => {
    expect(formatReminderAmount(384.7, "he", "ILS")).toBe("384.70 ₪");
    expect(formatReminderAmount(384.7, "en", "ILS")).toBe("₪384.70");
  });

  it("formats USD and EUR without a minus for absolute amounts", () => {
    expect(formatReminderAmount(-50, "he", "USD")).toBe("-50.00 $");
    expect(formatReminderAmount(-50, "en", "USD")).toBe("-$50.00");
    expect(formatReminderAmount(50, "en", "USD")).toBe("$50.00");
    expect(formatReminderAmount(12.5, "en", "EUR")).toBe("€12.50");
    expect(formatReminderAmount(-384.7, "he", "ILS")).toBe("-384.70 ₪");
    expect(formatReminderAmount(-384.7, "en", "ILS")).toBe("-₪384.70");
  });
});
