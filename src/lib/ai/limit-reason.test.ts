import { describe, expect, it } from "vitest";
import { readLimitInfo } from "./limit-reason";

describe("readLimitInfo", () => {
  it("extracts daily_limit with resetsAt", () => {
    const body = { reason: "daily_limit", resets_at: "2026-11-11T00:00:00Z" };
    const result = readLimitInfo(body);
    expect(result).toEqual({
      kind: "daily_limit",
      resetsAt: "2026-11-11T00:00:00Z",
    });
  });

  it("extracts quota_exhausted with resetsAt", () => {
    const body = { reason: "quota_exhausted", resets_at: "2026-12-01T00:00:00Z" };
    const result = readLimitInfo(body);
    expect(result).toEqual({
      kind: "quota_exhausted",
      resetsAt: "2026-12-01T00:00:00Z",
    });
  });

  it("extracts rate_limited with resetsAt", () => {
    const body = { reason: "rate_limited", resets_at: "2026-11-10T10:31:00Z" };
    const result = readLimitInfo(body);
    expect(result).toEqual({
      kind: "rate_limited",
      resetsAt: "2026-11-10T10:31:00Z",
    });
  });

  it("extracts limit without resetsAt", () => {
    const body = { reason: "daily_limit" };
    const result = readLimitInfo(body);
    expect(result).toEqual({
      kind: "daily_limit",
      resetsAt: null,
    });
  });

  it("returns null for unavailable reason", () => {
    const body = { reason: "unavailable" };
    const result = readLimitInfo(body);
    expect(result).toBeNull();
  });

  it("returns null for not_allowed reason", () => {
    const body = { reason: "not_allowed" };
    const result = readLimitInfo(body);
    expect(result).toBeNull();
  });

  it("returns null for missing reason", () => {
    const body = {};
    const result = readLimitInfo(body);
    expect(result).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(readLimitInfo(null)).toBeNull();
    expect(readLimitInfo(undefined)).toBeNull();
    expect(readLimitInfo("string")).toBeNull();
    expect(readLimitInfo(123)).toBeNull();
  });

  it("handles invalid resets_at type", () => {
    const body = { reason: "daily_limit", resets_at: 123 };
    const result = readLimitInfo(body);
    expect(result).toEqual({
      kind: "daily_limit",
      resetsAt: null,
    });
  });
});
