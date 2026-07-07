import { describe, it, expect } from "vitest";
import { getErrorMessage } from "./error-message";

// Regression test for a Copilot-flagged review comment: Supabase throws
// PostgrestError, a plain object with `.message` (not an Error instance),
// so `err instanceof Error` alone would silently swallow real error messages.
describe("getErrorMessage", () => {
  it("extracts the message from a real Error instance", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("extracts the message from a Supabase-style plain error object", () => {
    expect(getErrorMessage({ message: "duplicate key", code: "23505" })).toBe("duplicate key");
  });

  it("returns undefined for an object with no string message field", () => {
    expect(getErrorMessage({ code: "23505" })).toBeUndefined();
    expect(getErrorMessage({ message: 42 })).toBeUndefined();
  });

  it("returns undefined for non-object values", () => {
    expect(getErrorMessage("plain string")).toBeUndefined();
    expect(getErrorMessage(null)).toBeUndefined();
    expect(getErrorMessage(undefined)).toBeUndefined();
  });
});
