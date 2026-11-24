// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import heImport from "../../../../public/locales/he/import.json";

/** Hebrew CLDR categories used by i18next for `he`. */
function hePluralSuffix(count: number): "one" | "two" | "many" | "other" {
  const rule = new Intl.PluralRules("he").select(count);
  if (rule === "one" || rule === "two" || rule === "many" || rule === "other") {
    return rule;
  }
  return "other";
}

function heCountText(
  table: Record<string, string>,
  key: string,
  count: number,
): string {
  const suffix = hePluralSuffix(count);
  const template = table[`${key}_${suffix}`] ?? table[`${key}_other`];
  expect(template, `missing he ${key}_${suffix}`).toBeTypeOf("string");
  expect(template, `raw key leaked for ${key} count=${count}`).not.toMatch(
    new RegExp(`${key}_${suffix}|${key}_other`),
  );
  return template.replace(/\{\{\s*count\s*\}\}/g, String(count));
}

describe("Hebrew review/confirm plurals (B4a)", () => {
  it("defines dual forms and renders count=2 without raw keys", () => {
    expect(hePluralSuffix(2)).toBe("two");

    const summary = heImport.review.summary as unknown as Record<string, string>;
    const review = heImport.review as unknown as Record<string, string>;
    const confirm = heImport.confirm as unknown as Record<string, string>;

    expect(summary.compactCountsTotal_two).toBe("שתי תנועות");
    expect(review.saveCta_two).toBe("שמירת שתי תנועות");
    expect(confirm.title_two).toBe("לשמור שתי תנועות?");
    expect(confirm.description_two).toContain("שתי תנועות");
    expect(confirm.riskyRows_two).toContain("בשתי שורות");

    expect(heCountText(summary, "compactCountsTotal", 2)).toBe("שתי תנועות");
    expect(heCountText(review, "saveCta", 2)).toBe("שמירת שתי תנועות");
    expect(heCountText(confirm, "title", 2)).toBe("לשמור שתי תנועות?");
    expect(heCountText(confirm, "description", 2)).toBe(
      confirm.description_two,
    );
    expect(heCountText(confirm, "riskyRows", 2)).toBe(confirm.riskyRows_two);
  });
});
