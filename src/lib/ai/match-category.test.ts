import { describe, expect, it } from "vitest";
import { matchUserCategory } from "./match-category";

describe("matchUserCategory", () => {
  it("maps Hebrew labels and spoken food words onto the stored key", () => {
    expect(matchUserCategory("מזון", ["food"])).toBe("food");
    expect(matchUserCategory("אוכל", ["food"])).toBe("food");
    expect(matchUserCategory("Food", ["food"])).toBe("food");
  });

  it("treats a spaced capital key as the same category", () => {
    expect(matchUserCategory("מזון", ["food", "Food "])).toBe("food");
  });

  it("does not match a name that is not a category", () => {
    expect(matchUserCategory("ביטוח", ["food", "housing"])).toBeNull();
  });
});
