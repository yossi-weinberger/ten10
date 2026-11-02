import { describe, expect, it } from "vitest";
import { parseDraftAmount } from "./draft-amount";

describe("parseDraftAmount", () => {
  it("reads a thousand separator as thousands, not as a decimal point", () => {
    expect(parseDraftAmount("1,500")).toBe(1500);
    expect(parseDraftAmount("12,345.60")).toBe(12345.6);
    expect(parseDraftAmount("1 500")).toBe(1500);
  });

  it("reads a decimal comma with one or two digits", () => {
    expect(parseDraftAmount("12,50")).toBe(12.5);
    expect(parseDraftAmount("1.5")).toBe(1.5);
  });

  it("accepts a currency sign", () => {
    expect(parseDraftAmount("₪250")).toBe(250);
  });

  it("refuses zero, negative, empty, and text", () => {
    expect(parseDraftAmount("0")).toBeNull();
    expect(parseDraftAmount("-50")).toBeNull();
    expect(parseDraftAmount("")).toBeNull();
    expect(parseDraftAmount("12abc")).toBeNull();
    expect(parseDraftAmount(",")).toBeNull();
  });
});
