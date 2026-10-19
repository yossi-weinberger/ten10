import { describe, expect, it } from "vitest";
import { matchUserCategory } from "./match-category";

describe("matchUserCategory", () => {
  it("matches one category ignoring case", () => {
    expect(matchUserCategory("אוכל", ["אוכל", "תחבורה"])).toBe("אוכל");
    expect(matchUserCategory("Food", ["food"])).toBe("food");
  });

  it("does not match a missing name or two equal names", () => {
    expect(matchUserCategory("ביטוח", ["אוכל"])).toBeNull();
    expect(matchUserCategory("אוכל", ["אוכל", "אוכל"])).toBeNull();
  });
});
