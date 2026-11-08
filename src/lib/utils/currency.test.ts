import { describe, it, expect } from "vitest";
import { currencyFractionDigits, formatCurrency } from "./currency";

// Intl output varies slightly between ICU versions (NBSP, RTL marks),
// so assertions strip invisible characters and check content, not exact bytes.
const clean = (s: string) =>
  s
    .replace(/[\u200E\u200F\u061C]/g, "") // LRM / RLM / ALM bidi marks
    .replace(/\u00A0/g, " ") // NBSP -> regular space
    .trim();

describe("formatCurrency", () => {
  it("formats whole ILS amounts without decimals", () => {
    const out = clean(formatCurrency(100, "ILS", "he"));
    expect(out).toContain("₪"); // ₪
    expect(out).toContain("100");
    expect(out).not.toMatch(/100[.,]0/);
  });

  it("formats decimal amounts with exactly one decimal digit", () => {
    const out = clean(formatCurrency(100.25, "ILS", "he"));
    expect(out).toMatch(/100[.,]3/); // rounded half-up to one digit
  });

  it("keeps one decimal digit even for x.0-adjacent values", () => {
    const out = clean(formatCurrency(99.9, "ILS", "he"));
    expect(out).toMatch(/99[.,]9/);
  });

  it("formats USD in English with $ symbol", () => {
    const out = clean(formatCurrency(50, "USD", "en"));
    expect(out).toContain("$");
    expect(out).toContain("50");
  });

  it("formats EUR in English", () => {
    const out = clean(formatCurrency(75.5, "EUR", "en"));
    expect(out).toContain("€"); // €
    expect(out).toMatch(/75[.,]5/);
  });

  it("falls back to he-IL locale for unknown language", () => {
    const out = clean(formatCurrency(10, "ILS", "fr"));
    expect(out).toContain("₪");
    expect(out).toContain("10");
  });

  it("handles negative amounts", () => {
    const out = clean(formatCurrency(-42, "ILS", "he"));
    expect(out).toContain("42");
    expect(out).toContain("-");
  });

  it("handles zero as a whole number", () => {
    const out = clean(formatCurrency(0, "ILS", "he"));
    expect(out).toContain("0");
    expect(out).not.toMatch(/0[.,]0/);
  });
});

// QA 2026-11-03: a data answer showed 6,289.10 above and 6,289.1 in the sentence.
describe("currencyFractionDigits", () => {
  it("gives the big number the decimals formatCurrency uses", () => {
    const digits = currencyFractionDigits(6289.1);
    const big = new Intl.NumberFormat("en", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(6289.1);
    expect(big).toBe("6,289.1");
    expect(clean(formatCurrency(6289.1, "ILS", "en"))).toContain("6,289.1");
    expect(currencyFractionDigits(6289)).toBe(0);
  });
});
