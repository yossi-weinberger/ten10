import { describe, expect, it } from "vitest";
import { htmlXlsLooksBounded, shouldApplyHtmlXlsGuard } from "./html-xls-guard";

describe("htmlXlsLooksBounded", () => {
  it("accepts a normal single-table HTML export", () => {
    const text = "<html><table><tr><td>a</td></tr></table></html>";
    expect(htmlXlsLooksBounded(text)).toBe(true);
  });

  it("rejects many unmatched table openings", () => {
    const text = "<table>".repeat(40);
    expect(htmlXlsLooksBounded(text, 32)).toBe(false);
  });

  it("only applies the guard to .xls names", () => {
    expect(shouldApplyHtmlXlsGuard("bank.xls")).toBe(true);
    expect(shouldApplyHtmlXlsGuard("bank.xlsx")).toBe(false);
    expect(shouldApplyHtmlXlsGuard("bank.csv")).toBe(false);
  });
});
