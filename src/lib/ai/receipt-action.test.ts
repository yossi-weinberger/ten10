import { describe, expect, it } from "vitest";
import { showReceiptAction } from "./receipt-action";

const now = Date.parse("2026-10-22T12:00:00Z");

describe("showReceiptAction", () => {
  it("hides the action on an AI row with no receipt", () => {
    expect(showReceiptAction({
      platform: "web",
      enabled: true,
      expiresAt: null,
      now,
    })).toBe(false);
  });

  it("hides the action when the receipt has expired", () => {
    expect(showReceiptAction({
      platform: "web",
      enabled: true,
      expiresAt: "2026-10-21T12:00:00Z",
      now,
    })).toBe(false);
  });

  it("shows the action only on web, with the flag, while the receipt is still available", () => {
    expect(showReceiptAction({
      platform: "web",
      enabled: true,
      expiresAt: "2026-11-21T12:00:00Z",
      now,
    })).toBe(true);
    expect(showReceiptAction({
      platform: "desktop",
      enabled: true,
      expiresAt: "2026-11-21T12:00:00Z",
      now,
    })).toBe(false);
    expect(showReceiptAction({
      platform: "web",
      enabled: false,
      expiresAt: "2026-11-21T12:00:00Z",
      now,
    })).toBe(false);
  });
});
