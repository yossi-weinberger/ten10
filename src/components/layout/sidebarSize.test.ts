import { describe, expect, it } from "vitest";
import { SIDEBAR_SIZE } from "./sidebarSize";

describe("SIDEBAR_SIZE", () => {
  it.each(Object.entries(SIDEBAR_SIZE))("%s: px matches its Tailwind class", (_name, size) => {
    // Tailwind's spacing scale: w-N / h-N is N × 0.25rem, i.e. N × 4px at a 16px root.
    const match = /^[wh]-(\d+)$/.exec(size.className);
    expect(match).not.toBeNull();
    expect(Number(match![1]) * 4).toBe(size.px);
  });
});
