import { describe, it, expect } from "vitest";
import { cleanHeaderName, normalizeHeaderName } from "./header-normalizer";

describe("cleanHeaderName", () => {
  it("strips BOM and trims whitespace", () => {
    expect(cleanHeaderName("﻿ תאריך ")).toBe("תאריך");
  });

  it("removes invisible bidi control characters", () => {
    expect(cleanHeaderName("‏סכום‎")).toBe("סכום");
  });

  it("normalizes Hebrew gershayim and geresh to ASCII quotes", () => {
    expect(cleanHeaderName("סה״כ")).toBe('סה"כ');
    expect(cleanHeaderName("צ׳ק")).toBe("צ'ק");
  });

  it("preserves casing", () => {
    expect(cleanHeaderName("Amount USD")).toBe("Amount USD");
  });
});

describe("normalizeHeaderName", () => {
  it("cleans and lowercases", () => {
    expect(normalizeHeaderName(" Date ")).toBe("date");
    expect(normalizeHeaderName("﻿AMOUNT")).toBe("amount");
  });
});
