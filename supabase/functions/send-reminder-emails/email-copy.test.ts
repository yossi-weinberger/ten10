import { describe, expect, it } from "vitest";
import {
  getIsraelMonth,
  getMonthlyEncouragement,
  normalizeReminderLanguage,
  REMINDER_COPY,
} from "./email-copy.ts";

const EXPECTED_CONTENT_IDS = [
  "TN10-0002",
  "TN10-0003",
  "TN10-0005",
  "TN10-0006",
  "TN10-0014",
  "TN10-0024",
  "TN10-0015",
  "TN10-0053",
  "TN10-0008",
  "TN10-0009",
  "TN10-0056",
  "TN10-0076",
] as const;

describe("reminder email copy", () => {
  it("supports exactly Hebrew and English", () => {
    expect(Object.keys(REMINDER_COPY).sort()).toEqual(["en", "he"]);
  });

  it("falls back to Hebrew for missing or unsupported values", () => {
    expect(normalizeReminderLanguage(undefined)).toBe("he");
    expect(normalizeReminderLanguage(null)).toBe("he");
    expect(normalizeReminderLanguage("")).toBe("he");
    expect(normalizeReminderLanguage("fr")).toBe("he");
  });

  it("keeps English when explicitly selected", () => {
    expect(normalizeReminderLanguage("en")).toBe("en");
  });

  it("contains exactly 12 encouragement entries per language", () => {
    expect(REMINDER_COPY.he.monthlyEncouragements).toHaveLength(12);
    expect(REMINDER_COPY.en.monthlyEncouragements).toHaveLength(12);
  });

  it("keeps Hebrew and English months aligned by contentId", () => {
    for (let month = 1; month <= 12; month += 1) {
      const he = getMonthlyEncouragement("he", month);
      const en = getMonthlyEncouragement("en", month);
      expect(he.contentId).toBe(EXPECTED_CONTENT_IDS[month - 1]);
      expect(en.contentId).toBe(EXPECTED_CONTENT_IDS[month - 1]);
      expect(he.body.length).toBeGreaterThan(80);
      expect(en.body.length).toBeGreaterThan(80);
      expect(he.source).toBeTruthy();
      expect(en.source).toBeTruthy();
      expect(he.source).not.toMatch(/TN10-/);
      expect(en.source).not.toMatch(/TN10-/);
      expect(he.body).not.toMatch(/TN10-/);
      expect(en.body).not.toMatch(/TN10-/);
    }
  });

  it("rejects month numbers outside 1 through 12", () => {
    expect(() => getMonthlyEncouragement("he", 0)).toThrow(
      "Month must be between 1 and 12",
    );
    expect(() => getMonthlyEncouragement("he", 13)).toThrow(
      "Month must be between 1 and 12",
    );
  });

  it("uses the Israeli calendar month at UTC month boundaries", () => {
    expect(getIsraelMonth(new Date("2026-01-31T22:30:00.000Z"))).toBe(2);
  });

  it("fills {{amount}} placeholders from locale JSON subjects", () => {
    expect(REMINDER_COPY.he.subject.outstanding("120.50 ₪")).toBe(
      "תזכורת מעשר - נותרו 120.50 ₪ לתרומה",
    );
    expect(REMINDER_COPY.en.subject.credit("$40.00")).toBe(
      "Tithe reminder - $40.00 credit",
    );
    expect(REMINDER_COPY.he.subject.settled).toBe(
      "תזכורת מעשר - היתרה שלך מאוזנת",
    );
  });
});
