import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

// index.ts reads env and calls Deno.serve on import, so this file does not
// import it. Cases run the helper body copied out of that file.
const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8").replace(
  /\r\n/g,
  "\n",
);

const helperBody = source.match(
  /export function isUsableExchangeRate\(rate: number\): boolean \{\n([\s\S]*?)\n\}/,
)?.[1];

if (helperBody == null) {
  throw new Error("isUsableExchangeRate was not found in index.ts");
}

const isUsableExchangeRate = runInNewContext(
  `(function isUsableExchangeRate(rate) {\n${helperBody}\n})`,
  { Number },
) as (rate: number) => boolean;

function roundedRate(rate: number): number {
  return Math.round(rate * 10000) / 10000;
}

describe("process-recurring-transactions exchange rate gate", () => {
  it("uses a finite rate greater than zero after rounding, and null when every provider fails", () => {
    expect(helperBody).toBe("  return Number.isFinite(rate) && rate > 0;");
    expect(source).toMatch(
      /const roundedRate = Math\.round\(rate \* 10000\) \/ 10000;\n\s+if \(!isUsableExchangeRate\(roundedRate\)\) \{\n\s+throw new Error\(\n\s+`\$\{provider\.name\}: Rate not usable for \$\{from\} -> \$\{to\}`\n\s+\);\n\s+\}/,
    );
    expect(source).toMatch(
      /console\.error\(`All providers failed for \$\{from\} -> \$\{to\}`\);\n\s+return null;/,
    );
  });

  it.each([
    ["zero", 0, false],
    ["negative zero", -0, false],
    ["negative", -1.25, false],
    ["NaN", Number.NaN, false],
    ["Infinity", Number.POSITIVE_INFINITY, false],
    ["-Infinity", Number.NEGATIVE_INFINITY, false],
    ["positive", 3.7123, true],
    ["smallest positive 4-decimal rate", 0.0001, true],
  ] as const)("treats %s as usable=%s", (_label, rate, usable) => {
    expect(isUsableExchangeRate(rate)).toBe(usable);
  });

  it("treats a rate that rounds to 0 as not usable", () => {
    const rounded = roundedRate(0.00004);
    expect(rounded).toBe(0);
    expect(isUsableExchangeRate(rounded)).toBe(false);
  });

  it("keeps a tiny rate that still rounds above 0", () => {
    const rounded = roundedRate(0.00005);
    expect(rounded).toBe(0.0001);
    expect(isUsableExchangeRate(rounded)).toBe(true);
  });
});
