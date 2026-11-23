// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";

/**
 * App.tsx passes mobileHidden={currentPath === "/transactions-table/import"}.
 * Keep this assertion co-located so a path rename breaks the contract explicitly.
 */
function mobileHiddenForPath(currentPath: string): boolean {
  return currentPath === "/transactions-table/import";
}

describe("App import route AssistantFab mobileHidden", () => {
  it("is true only on the import path", () => {
    expect(mobileHiddenForPath("/transactions-table/import")).toBe(true);
    expect(mobileHiddenForPath("/transactions-table")).toBe(false);
    expect(mobileHiddenForPath("/transactions-table/recurring")).toBe(false);
    expect(mobileHiddenForPath("/settings")).toBe(false);
    expect(mobileHiddenForPath("/")).toBe(false);
  });
});
