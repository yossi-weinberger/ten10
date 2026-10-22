import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const PORTED = ["message", "bubble", "attachment", "message-scroller", "input-group", "empty", "spinner", "item"];
const FORBIDDEN = /(?<![\w:-])(?:ml|mr|pl|pr|left|right)-[\w[\]./-]+|text-(?:left|right)\b|oklch\(|color-mix\(|wrap-break-word|inset-s-|ring-3\b/;

describe("ported AI primitives", () => {
  it.each(PORTED)("%s has no physical-direction or Tailwind 4 classes", (name) => {
    const lines = readFileSync(`src/components/ui/${name}.tsx`, "utf8")
      .split("\n")
      .filter((line) => !line.includes("rtl:") && !line.includes("ltr:"));
    expect(lines.filter((line) => FORBIDDEN.test(line))).toEqual([]);
  });
});
