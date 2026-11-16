import { describe, it, expect } from "vitest";
import type { CurrencyCode } from "../currencies";
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

  it("formats decimal amounts with exactly two decimal digits", () => {
    const out = clean(formatCurrency(100.25, "ILS", "he"));
    expect(out).toBe("100.25 ₪");
  });

  it("pads a single fractional digit to two decimals", () => {
    const out = clean(formatCurrency(99.9, "ILS", "he"));
    expect(out).toBe("99.90 ₪");
  });

  it("formats USD in English with $ symbol", () => {
    const out = clean(formatCurrency(50, "USD", "en"));
    expect(out).toBe("$50");
  });

  it("formats EUR in English", () => {
    const out = clean(formatCurrency(75.5, "EUR", "en"));
    expect(out).toBe("€75.50");
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

// The CountUp figure and the sentence share these digits, so both show 6,289.10.
describe("currencyFractionDigits", () => {
  it("matches the decimals formatCurrency shows", () => {
    const digits = currencyFractionDigits(6289.1);
    const big = new Intl.NumberFormat("en", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(6289.1);
    expect(digits).toBe(2);
    expect(big).toBe("6,289.10");
    expect(clean(formatCurrency(6289.1, "ILS", "en"))).toContain("6,289.10");
    expect(currencyFractionDigits(6289)).toBe(0);
    expect(currencyFractionDigits(0)).toBe(0);
    expect(currencyFractionDigits(5)).toBe(0);
    expect(currencyFractionDigits(-5)).toBe(0);
    expect(currencyFractionDigits(5.5)).toBe(2);
    expect(currencyFractionDigits(5.55)).toBe(2);
    expect(currencyFractionDigits(5.555)).toBe(2);
    expect(currencyFractionDigits(-5.555)).toBe(2);
  });
});

// Whole amounts stay whole. A fractional amount shows exactly two decimals.
// `exported` is the PDF text, which still rounds to one decimal.
const samples: Array<{
  amount: number;
  currency: CurrencyCode;
  lang: string;
  display: string;
  exported: string;
}> = [
  { amount: 0, currency: "ILS", lang: "he", display: "0 ₪", exported: "0 ₪" },
  { amount: 5, currency: "ILS", lang: "he", display: "5 ₪", exported: "5 ₪" },
  { amount: 5.5, currency: "ILS", lang: "he", display: "5.50 ₪", exported: "5.5 ₪" },
  { amount: 5.55, currency: "ILS", lang: "he", display: "5.55 ₪", exported: "5.6 ₪" },
  { amount: 5.555, currency: "ILS", lang: "he", display: "5.56 ₪", exported: "5.6 ₪" },
  { amount: -5, currency: "ILS", lang: "he", display: "-5 ₪", exported: "-5 ₪" },
  { amount: -5.5, currency: "ILS", lang: "he", display: "-5.50 ₪", exported: "-5.5 ₪" },
  { amount: -5.555, currency: "ILS", lang: "he", display: "-5.56 ₪", exported: "-5.6 ₪" },
  { amount: 100.25, currency: "ILS", lang: "he", display: "100.25 ₪", exported: "100.3 ₪" },
  { amount: 99.9, currency: "ILS", lang: "he", display: "99.90 ₪", exported: "99.9 ₪" },
  { amount: 1234.6, currency: "ILS", lang: "he", display: "1,234.60 ₪", exported: "1,234.6 ₪" },
  { amount: 1234.6, currency: "ILS", lang: "en", display: "₪1,234.60", exported: "₪1,234.6" },
  { amount: 1234567.891, currency: "ILS", lang: "he", display: "1,234,567.89 ₪", exported: "1,234,567.9 ₪" },
  { amount: -1234567.891, currency: "ILS", lang: "he", display: "-1,234,567.89 ₪", exported: "-1,234,567.9 ₪" },
  { amount: 0, currency: "USD", lang: "en", display: "$0", exported: "$0" },
  { amount: 5, currency: "USD", lang: "en", display: "$5", exported: "$5" },
  { amount: 5.5, currency: "USD", lang: "en", display: "$5.50", exported: "$5.5" },
  { amount: 5.55, currency: "USD", lang: "en", display: "$5.55", exported: "$5.6" },
  { amount: 5.555, currency: "USD", lang: "en", display: "$5.56", exported: "$5.6" },
  { amount: -5.5, currency: "USD", lang: "en", display: "-$5.50", exported: "-$5.5" },
  { amount: -5.555, currency: "USD", lang: "en", display: "-$5.56", exported: "-$5.6" },
  { amount: 1234.6, currency: "USD", lang: "en", display: "$1,234.60", exported: "$1,234.6" },
  { amount: 1234.6, currency: "USD", lang: "he", display: "1,234.60 $", exported: "1,234.6 $" },
  { amount: 1234567.891, currency: "USD", lang: "en", display: "$1,234,567.89", exported: "$1,234,567.9" },
  { amount: 75.5, currency: "EUR", lang: "en", display: "€75.50", exported: "€75.5" },
  { amount: 5.555, currency: "EUR", lang: "en", display: "€5.56", exported: "€5.6" },
  { amount: 5.555, currency: "EUR", lang: "he", display: "5.56 €", exported: "5.6 €" },
  { amount: 1234.6, currency: "EUR", lang: "en", display: "€1,234.60", exported: "€1,234.6" },
  { amount: 1234.6, currency: "GBP", lang: "en", display: "1,234.60 £", exported: "1,234.6 £" },
  { amount: 1234.6, currency: "GBP", lang: "he", display: "1,234.60 £", exported: "1,234.6 £" },
  { amount: 10, currency: "ILS", lang: "fr", display: "10 ₪", exported: "10 ₪" },
];

describe("formatCurrency display", () => {
  it.each(samples)(
    "$amount $currency $lang → $display",
    ({ amount, currency, lang, display }) => {
      expect(clean(formatCurrency(amount, currency, lang))).toBe(display);
      expect(clean(formatCurrency(amount, currency, lang, { fractionalDigits: 2 }))).toBe(display);
    },
  );
});

describe("formatCurrency PDF export digits", () => {
  it.each(samples)(
    "$amount $currency $lang stays $exported",
    ({ amount, currency, lang, exported }) => {
      expect(clean(formatCurrency(amount, currency, lang, { fractionalDigits: 1 }))).toBe(exported);
    },
  );
});
