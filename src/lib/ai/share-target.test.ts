import { describe, expect, it } from "vitest";
import { isExpiredShare, SHARE_MAX_AGE_MS } from "./share-target";

describe("shared receipt age", () => {
  it("keeps a file inside 24 hours and drops an older one", () => {
    const now = 1_000_000_000;
    expect(isExpiredShare(now - SHARE_MAX_AGE_MS, now)).toBe(false);
    expect(isExpiredShare(now - SHARE_MAX_AGE_MS - 1, now)).toBe(true);
  });
});
