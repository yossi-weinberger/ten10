import { describe, expect, it } from "vitest";
import { aiShare } from "./ai-usage";

describe("aiShare", () => {
  it("rounds the share of AI transactions", () => {
    expect(aiShare(14, 16)).toBe(88);
  });

  it("stays at zero when the total is zero", () => {
    expect(aiShare(3, 0)).toBe(0);
    expect(Number.isNaN(aiShare(3, 0))).toBe(false);
  });
});