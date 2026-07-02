import { describe, it, expect } from "vitest";
import { getRecurringExportInfo, getExportCategoryLabel } from "./export-transaction-fields";

describe("getRecurringExportInfo", () => {
  it("is not recurring when neither source id nor frequency is set", () => {
    const info = getRecurringExportInfo({
      source_recurring_id: null,
      recurring_frequency: null,
      occurrence_number: null,
      total_occurrences: null,
    }, "he");
    expect(info).toEqual({ isRecurring: false, frequencyText: "", progressText: "" });
  });

  it("is recurring when source_recurring_id is set", () => {
    const info = getRecurringExportInfo({
      source_recurring_id: "rec1",
      recurring_frequency: null,
      occurrence_number: null,
      total_occurrences: null,
    }, "he");
    expect(info.isRecurring).toBe(true);
  });

  it("formats progress as N/total when total_occurrences is known", () => {
    const info = getRecurringExportInfo({
      source_recurring_id: "rec1",
      recurring_frequency: "monthly",
      occurrence_number: 3,
      total_occurrences: 12,
    }, "en");
    expect(info.progressText).toBe("3/12");
  });

  it("formats progress as N/∞ when total_occurrences is unset (indefinite)", () => {
    const info = getRecurringExportInfo({
      source_recurring_id: "rec1",
      recurring_frequency: "monthly",
      occurrence_number: 5,
      total_occurrences: null,
    }, "en");
    expect(info.progressText).toBe("5/∞");
  });

  it("leaves progressText empty when there is no occurrence_number", () => {
    const info = getRecurringExportInfo({
      source_recurring_id: "rec1",
      recurring_frequency: "monthly",
      occurrence_number: null,
      total_occurrences: null,
    }, "en");
    expect(info.progressText).toBe("");
  });
});

describe("getExportCategoryLabel", () => {
  it("resolves a predefined income category without throwing", () => {
    // i18next-http-backend doesn't load real translation files in this test
    // environment, so we only assert the pass-through doesn't crash and
    // produces a non-empty string — actual translation content is covered
    // by formatCategory's own responsibility, not this thin wrapper.
    const label = getExportCategoryLabel({ type: "income", category: "salary" }, "en");
    expect(label.length).toBeGreaterThan(0);
  });

  it("treats exempt-income the same as income for category resolution", () => {
    const income = getExportCategoryLabel({ type: "income", category: "salary" }, "en");
    const exempt = getExportCategoryLabel({ type: "exempt-income", category: "salary" }, "en");
    expect(exempt).toBe(income);
  });

  it("treats recognized-expense the same as expense for category resolution", () => {
    const expense = getExportCategoryLabel({ type: "expense", category: "food" }, "en");
    const recognized = getExportCategoryLabel({ type: "recognized-expense", category: "food" }, "en");
    expect(recognized).toBe(expense);
  });

  it("returns empty string when category is missing", () => {
    expect(getExportCategoryLabel({ type: "income", category: null }, "en")).toBe("");
  });

  it("passes through a custom (non-predefined) category value unchanged", () => {
    const custom = getExportCategoryLabel({ type: "income", category: "My Custom Category" }, "en");
    expect(custom).toBe("My Custom Category");
  });
});
