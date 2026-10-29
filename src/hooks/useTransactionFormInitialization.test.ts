import { describe, expect, it } from "vitest";
import { recurringFromSearch } from "./useTransactionFormInitialization";

describe("recurringFromSearch", () => {
  it("turns the checkbox on only for the standing-order query", () => {
    expect(recurringFromSearch({})).toBe(false);
    expect(recurringFromSearch({ type: "donation" })).toBe(false);
    expect(recurringFromSearch({ recurring: "1" })).toBe(true);
    expect(recurringFromSearch({ recurring: "true" })).toBe(true);
    expect(recurringFromSearch({ recurring: "0" })).toBe(false);
  });
});
