import { describe, expect, it } from "vitest";
import { aiShare, formatAiShare } from "./ai-usage";

describe("aiShare", () => {
  it("rounds the share of AI transactions", () => {
    expect(aiShare(14, 16)).toBe(88);
  });

  it("stays at zero when the total is zero", () => {
    expect(aiShare(3, 0)).toBe(0);
    expect(Number.isNaN(aiShare(3, 0))).toBe(false);
  });
});

describe("formatAiShare", () => {
  it("keeps a large share as an integer", () => {
    expect(formatAiShare(14, 16)).toBe("88");
  });

  it("shows one decimal under 10 percent", () => {
    expect(formatAiShare(14, 17326)).toBe("0.1");
  });

  it("never prints 0 when the count is positive", () => {
    expect(formatAiShare(1, 1_000_000)).toBe("<0.1");
    expect(formatAiShare(1, 1_000_000)).not.toBe("0");
  });

  it("stays at zero when there is nothing to share", () => {
    expect(formatAiShare(0, 100)).toBe("0");
    expect(formatAiShare(3, 0)).toBe("0");
  });
});