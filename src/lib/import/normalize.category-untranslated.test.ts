import { describe, expect, it } from "vitest";
import { normalizeRow } from "./normalize";

// Separate file on purpose: the category label map is cached per module
// instance, and here the "transactions" namespace is never loaded.
describe("normalizeRow category without the transactions namespace", () => {
  it("keeps a Hebrew label as a custom category", () => {
    expect(
      normalizeRow({ date: "2024-03-15", amount: "-10", category: "מזון" }, "ILS")
        .normalized?.category,
    ).toBe("מזון");
  });

  it("keeps an English label as a custom category", () => {
    expect(
      normalizeRow({ date: "2024-03-15", amount: "-10", category: "Food" }, "ILS")
        .normalized?.category,
    ).toBe("Food");
  });

  it("still keeps a category key", () => {
    expect(
      normalizeRow({ date: "2024-03-15", amount: "-10", category: "food" }, "ILS")
        .normalized?.category,
    ).toBe("food");
  });

  it("still maps payment method labels, which do not depend on i18n", () => {
    expect(
      normalizeRow(
        { date: "2024-03-15", amount: "-10", payment_method: "כרטיס אשראי" },
        "ILS",
      ).normalized?.payment_method,
    ).toBe("credit_card");
  });
});
