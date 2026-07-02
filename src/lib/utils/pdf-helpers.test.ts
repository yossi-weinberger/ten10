import { describe, it, expect } from "vitest";
import { splitTextSegments } from "./pdf-helpers";

// Pins RTL/number segmentation behavior used by both PDF exports.

describe("splitTextSegments", () => {
  it("splits Hebrew text with a thousands+decimal amount", () => {
    expect(splitTextSegments("דיור: 1,234.56 ₪")).toEqual([
      { text: "דיור: ", isNumber: false },
      { text: "1,234.56", isNumber: true },
      { text: " ₪", isNumber: false },
    ]);
  });

  it("keeps a date as a single number segment", () => {
    expect(splitTextSegments("2024-01-15")).toEqual([
      { text: "2024-01-15", isNumber: true },
    ]);
  });

  it("keeps a time as a single number segment", () => {
    expect(splitTextSegments("נכון ל-12:30")).toEqual([
      { text: "נכון ל-", isNumber: false },
      { text: "12:30", isNumber: true },
    ]);
  });

  it("handles a single digit", () => {
    expect(splitTextSegments("5")).toEqual([{ text: "5", isNumber: true }]);
  });

  it("handles text without numbers", () => {
    expect(splitTextSegments("שלום עולם")).toEqual([
      { text: "שלום עולם", isNumber: false },
    ]);
  });

  it("returns empty array for empty string", () => {
    expect(splitTextSegments("")).toEqual([]);
  });

  it("alternates segments for interleaved text and numbers", () => {
    expect(splitTextSegments("a1b")).toEqual([
      { text: "a", isNumber: false },
      { text: "1", isNumber: true },
      { text: "b", isNumber: false },
    ]);
  });
});
