import { describe, expect, it } from "vitest";
import {
  categoryForTypeOrNull,
  isCategoryValidForType,
} from "./category-registry";

describe("isCategoryValidForType / categoryForTypeOrNull", () => {
  it("keeps expense key food for expense and clears it for income", () => {
    expect(isCategoryValidForType("expense", "food")).toBe(true);
    expect(categoryForTypeOrNull("expense", "food")).toBe("food");
    expect(isCategoryValidForType("income", "food")).toBe(false);
    expect(categoryForTypeOrNull("income", "food")).toBeNull();
  });

  it("keeps custom categories for income and expense", () => {
    expect(categoryForTypeOrNull("income", "Gym")).toBe("Gym");
    expect(categoryForTypeOrNull("expense", "Gym")).toBe("Gym");
  });
});
