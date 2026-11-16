import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MOBILE_CARD_QUERY } from "../src/lib/responsive";

describe("mobile-card variant", () => {
  it("uses the same media query as MOBILE_CARD_QUERY", () => {
    const source = readFileSync(resolve(process.cwd(), "tailwind.config.js"), "utf8");
    const match = source.match(
      /addVariant\(\s*'mobile-card',\s*'@media ([^']+) \{ &:is\(&\) \}'/,
    );

    expect(match?.[1]).toBe(MOBILE_CARD_QUERY);
  });
});
