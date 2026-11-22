// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import heImport from "../../../public/locales/he/import.json";
import type { ColumnMapping } from "@/lib/import/import-session.types";
import { ColumnMapper } from "./ColumnMapper";

/** Hebrew CLDR categories used by i18next for `he`. */
function hePluralSuffix(count: number): "one" | "two" | "many" | "other" {
  const rule = new Intl.PluralRules("he").select(count);
  if (rule === "one" || rule === "two" || rule === "many" || rule === "other") {
    return rule;
  }
  return "other";
}

function heMappingText(
  key: "detectedCount" | "unmappedCollapsed",
  count: number
): string {
  const suffix = hePluralSuffix(count);
  const table = heImport.mapping as Record<string, string>;
  const template = table[`${key}_${suffix}`] ?? table[`${key}_other`];
  expect(template, `missing he mapping.${key}_${suffix}`).toBeTypeOf("string");
  return template.replace(/\{\{\s*count\s*\}\}/g, String(count));
}

function heRemainingText(count: number): string {
  const suffix = hePluralSuffix(count);
  const table = heImport.mapping.summary as Record<string, string>;
  const template = table[`remaining_${suffix}`] ?? table.remaining_other;
  expect(template, `missing he mapping.summary.remaining_${suffix}`).toBeTypeOf(
    "string"
  );
  return template.replace(/\{\{\s*count\s*\}\}/g, String(count));
}

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) => {
      if (typeof opts?.count === "number") {
        if (key === "mapping.unmappedCollapsed") {
          return heMappingText("unmappedCollapsed", opts.count);
        }
        if (key === "mapping.detectedCount") {
          return heMappingText("detectedCount", opts.count);
        }
        if (key === "mapping.summary.remaining") {
          return heRemainingText(opts.count);
        }
      }
      if (key.startsWith("mapping.fields.")) {
        return key.slice("mapping.fields.".length);
      }
      return key;
    },
    i18n: { language: "he", dir: () => "rtl" },
  }),
}));
vi.mock("@/lib/utils/export-excel", () => ({ exportTransactionsToExcel: vi.fn() }));
vi.mock("@/lib/utils/export-pdf", () => ({ exportTransactionsToPDF: vi.fn() }));

let mockMobile = true;
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => mockMobile,
}));

beforeEach(() => {
  mockMobile = true;
});

afterEach(() => cleanup());

describe("Hebrew mapping plurals (B1/B3)", () => {
  it("has a dual form for unmappedCollapsed count=2 and renders it", () => {
    expect(hePluralSuffix(2)).toBe("two");
    expect(heImport.mapping).toHaveProperty("unmappedCollapsed_two");
    expect(heImport.mapping.unmappedCollapsed_two).toBe(
      "עוד שתי עמודות שלא ייובאו"
    );

    const mappings: ColumnMapping[] = [
      { sourceColumn: "תאריך", targetField: "date" },
      { sourceColumn: "סכום", targetField: "amount" },
      { sourceColumn: "יתרה", targetField: null },
      { sourceColumn: "מזהה", targetField: null },
    ];

    render(
      <ColumnMapper mappings={mappings} sampleRows={[]} onMappingChange={vi.fn()} />
    );

    expect(screen.getByText("עוד שתי עמודות שלא ייובאו")).toBeInTheDocument();
    expect(screen.queryByText(/mapping\.unmappedCollapsed/)).not.toBeInTheDocument();
  });

  it("defines dual forms for detectedCount and summary.remaining", () => {
    expect(heImport.mapping).toHaveProperty("detectedCount_two");
    expect(heImport.mapping.detectedCount_two).toContain("שתי עמודות");
    expect(heImport.mapping.summary).toHaveProperty("remaining_two");
    expect(heImport.mapping.summary.remaining_two).toBe("נשארו שני דברים לתקן");

    expect(heMappingText("detectedCount", 2)).toBe(
      heImport.mapping.detectedCount_two
    );
    expect(heRemainingText(2)).toBe(heImport.mapping.summary.remaining_two);
  });
});
