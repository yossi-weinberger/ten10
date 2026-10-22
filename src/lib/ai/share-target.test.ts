import { describe, expect, it } from "vitest";
import { isExpiredShare, SHARE_MAX_AGE_MS, sharedTextMessage } from "./share-target";

describe("shared receipt age", () => {
  it("keeps a file inside 24 hours and drops an older one", () => {
    const now = 1_000_000_000;
    expect(isExpiredShare(now - SHARE_MAX_AGE_MS, now)).toBe(false);
    expect(isExpiredShare(now - SHARE_MAX_AGE_MS - 1, now)).toBe(true);
  });

  it("joins shared text and drops empty parts", () => {
    expect(sharedTextMessage(["  Title ", "", "https://example.com"])).toBe("Title\nhttps://example.com");
    expect(sharedTextMessage(["", "  "])).toBe("");
  });

  it("does not repeat a url that is already in the shared text", () => {
    const sentence = "קניה על פיצה https://example.com/r/1";
    expect(sharedTextMessage([sentence, sentence, "https://example.com/r/1"])).toBe(sentence);
  });
});
