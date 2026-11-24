// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import heImport from "../../../../public/locales/he/import.json";
import { ImportResultStep } from "./ImportResultStep";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

/** Hebrew CLDR categories used by i18next for `he`. */
function hePluralSuffix(count: number): "one" | "two" | "many" | "other" {
  const rule = new Intl.PluralRules("he").select(count);
  if (rule === "one" || rule === "two" || rule === "many" || rule === "other") {
    return rule;
  }
  return "other";
}

function heResultText(key: "inserted" | "failed" | "skipped", count: number): string {
  const suffix = hePluralSuffix(count);
  const table = heImport.result as Record<string, string>;
  const template = table[`${key}_${suffix}`] ?? table[`${key}_other`];
  expect(template, `missing he result.${key}_${suffix}`).toBeTypeOf("string");
  return template.replace(/\{\{\s*count\s*\}\}/g, String(count));
}

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) => {
      if (
        (key === "result.inserted" ||
          key === "result.failed" ||
          key === "result.skipped") &&
        typeof opts?.count === "number"
      ) {
        const base = key.slice("result.".length) as "inserted" | "failed" | "skipped";
        return heResultText(base, opts.count);
      }
      if (key === "result.title") return heImport.result.title;
      if (key === "result.viewTransactions") return heImport.result.viewTransactions;
      if (key === "result.importAnother") return heImport.result.importAnother;
      if (key === "result.noRowsImported") return heImport.result.noRowsImported;
      return key;
    },
    i18n: { language: "he", dir: () => "rtl" },
  }),
}));

afterEach(() => cleanup());

describe("ImportResultStep Hebrew plurals", () => {
  it("renders the dual form for two inserted rows without a raw key", () => {
    expect(hePluralSuffix(2)).toBe("two");
    expect(heImport.result).toHaveProperty("inserted_two");
    expect(heImport.result).toHaveProperty("inserted_many");
    expect(heImport.result).toHaveProperty("inserted_other");

    render(
      <ImportResultStep
        result={{ inserted: 2, failed: 0, skipped: 0, errors: [] }}
        onImportAnother={vi.fn()}
      />
    );

    expect(screen.getByText("שתי תנועות נשמרו")).toBeInTheDocument();
    expect(screen.queryByText("result.inserted")).not.toBeInTheDocument();
    expect(screen.queryByText(/result\.inserted/)).not.toBeInTheDocument();
  });
});
