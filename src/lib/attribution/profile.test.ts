import { describe, expect, it } from "vitest";
import { isRecentAuthUser, RECENT_SIGNUP_WINDOW_MS } from "./profile";

describe("isRecentAuthUser", () => {
  const now = Date.parse("2026-10-19T12:00:00.000Z");

  it("accepts accounts created inside the signup window", () => {
    expect(
      isRecentAuthUser(new Date(now - 60_000).toISOString(), now)
    ).toBe(true);
    expect(
      isRecentAuthUser(
        new Date(now - RECENT_SIGNUP_WINDOW_MS + 1).toISOString(),
        now
      )
    ).toBe(true);
  });

  it("rejects missing, future, or older accounts", () => {
    expect(isRecentAuthUser(undefined, now)).toBe(false);
    expect(isRecentAuthUser("not-a-date", now)).toBe(false);
    expect(
      isRecentAuthUser(new Date(now + 60_000).toISOString(), now)
    ).toBe(false);
    expect(
      isRecentAuthUser(
        new Date(now - RECENT_SIGNUP_WINDOW_MS).toISOString(),
        now
      )
    ).toBe(false);
  });
});
