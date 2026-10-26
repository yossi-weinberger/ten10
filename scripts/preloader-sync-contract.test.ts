import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SYMBOL_RING_PATH, SYMBOL_SLICE_PATH, SYMBOL_VIEWBOX } from "../src/components/brand/logoPaths";

// The static pre-loader (index.html + public/loader.css) renders before the app's code
// and CSS exist, so it carries copies of the symbol, its motion and the theme colours.
// These tests fail when a copy drifts from its source.
const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const html = read("index.html");
const loaderCss = read("public/loader.css");
const indexCss = read("src/index.css");
const tailwind = read("tailwind.config.js");

const match = (source: string, pattern: RegExp) => pattern.exec(source)?.[1]?.trim();

/** The declarations inside the first `{ … }` after `selector`. */
function block(source: string, selector: string): string {
  const start = source.indexOf(selector);
  expect(start, `${selector} not found`).toBeGreaterThanOrEqual(0);
  const open = source.indexOf("{", start);
  return source.slice(open + 1, source.indexOf("}", open));
}

const cssVar = (declarations: string, name: string) =>
  match(declarations, new RegExp(`${name}:\\s*(?:hsl\\()?([^;)]+)\\)?;`));

describe("static pre-loader", () => {
  it("draws the symbol from logoPaths", () => {
    expect(match(html, /class="pl-ring"\s+d="([^"]+)"/)).toBe(SYMBOL_RING_PATH);
    expect(match(html, /class="pl-slice"\s+d="([^"]+)"/)).toBe(SYMBOL_SLICE_PATH);
    expect(match(html, /class="pl-spin"\s+viewBox="([^"]+)"/)).toBe(SYMBOL_VIEWBOX);
  });

  it("moves like BrandSpinner (tailwind brand-* animations)", () => {
    expect(match(loaderCss, /animation: pl-spin ([^;]+);/)).toBe(
      match(tailwind, /"brand-spin": "spin ([^"]+)"/)
    );
    expect(match(loaderCss, /animation: pl-fling ([^;]+);/)).toBe(
      match(tailwind, /"brand-fling": "brand-fling ([^"]+)"/)
    );
    expect(match(loaderCss, /animation: pl-pulse ([^;]+);/)).toBe(
      match(tailwind, /"brand-pulse": "brand-pulse ([^"]+)"/)
    );
    expect(match(loaderCss, /@keyframes pl-fling \{\s*50% \{\s*transform: ([^;]+);/)).toBe(
      match(tailwind, /"brand-fling": \{\s*"50%": \{ transform: "([^"]+)" \}/)
    );
    expect(match(loaderCss, /@keyframes pl-pulse \{\s*50% \{\s*opacity: ([^;]+);/)).toBe(
      match(tailwind, /"brand-pulse": \{\s*"50%": \{ opacity: "([^"]+)" \}/)
    );
  });

  it("uses the theme's colours in light and dark", () => {
    const light = block(loaderCss, "#pre-loader {");
    const dark = block(loaderCss, '#pre-loader[data-theme="dark"]');
    const systemDark = block(loaderCss, '#pre-loader:not([data-theme="light"])');
    const appLight = block(indexCss, '[data-theme="ten10-emerald-light"]');
    const appDark = block(indexCss, '[data-theme="ten10-emerald-dark"]');

    for (const [ours, theirs] of [
      ["--pl-bg", "--background"],
      ["--pl-primary", "--primary"],
      ["--pl-text", "--muted-foreground"],
    ]) {
      expect(cssVar(light, ours), ours).toBe(cssVar(appLight, theirs));
      expect(cssVar(dark, ours), ours).toBe(cssVar(appDark, theirs));
      expect(cssVar(systemDark, ours), ours).toBe(cssVar(appDark, theirs));
    }
    // The slice keeps the light value in dark mode, like --accent.
    expect(cssVar(light, "--pl-slice")).toBe(cssVar(appLight, "--accent"));
    expect(cssVar(appDark, "--accent")).toBe(cssVar(appLight, "--accent"));
  });
});
