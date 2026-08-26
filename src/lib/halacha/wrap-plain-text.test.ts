import { describe, expect, it } from "vitest";
import { stripPrintMarkup, wrapPlainText } from "./wrap-plain-text";

describe("wrapPlainText", () => {
  const measure = (value: string) => value.length;

  it("returns no lines for blank text", () => {
    expect(wrapPlainText("   ", measure, 10)).toEqual([]);
  });

  it("keeps a short sentence on one line", () => {
    expect(wrapPlainText("שלום עולם", measure, 20)).toEqual(["שלום עולם"]);
  });

  it("wraps when the next word would overflow", () => {
    expect(wrapPlainText("aaa bbb ccc", measure, 7)).toEqual([
      "aaa bbb",
      "ccc",
    ]);
  });

  it("splits a token that is longer than the line", () => {
    expect(wrapPlainText("abcdefghij", measure, 4)).toEqual([
      "abcd",
      "efgh",
      "ij",
    ]);
  });
});

describe("stripPrintMarkup", () => {
  it("removes bold and italic markers", () => {
    expect(stripPrintMarkup("**bold** and *italic*")).toBe("bold and italic");
  });

  it("unescapes leaked JSON quotes", () => {
    expect(stripPrintMarkup('גמ\\"חים')).toBe('גמ"חים');
  });
});
