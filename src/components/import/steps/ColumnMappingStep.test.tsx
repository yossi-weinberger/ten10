// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ColumnMapping, ParsedFile } from "@/lib/import/import-session.types";
import { getMappingIssues } from "@/lib/import/mapping-issues";
import { ColumnMappingStep } from "./ColumnMappingStep";

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (key: string, opts?: { columns?: string; other?: string; count?: number; field?: string }) => {
      if (key === "mapping.errors.amountAndDebitCredit") {
        return `ALERT:${opts?.columns ?? ""}`;
      }
      if (key === "mapping.errors.otherPlusMore") {
        return `${opts?.other} +${opts?.count}`;
      }
      if (key === "mapping.errors.amountAndDebitCreditInline") {
        return `INLINE:${opts?.other ?? ""}`;
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

let mockMobile = false;
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => mockMobile,
}));

beforeEach(() => {
  mockMobile = false;
});

afterEach(() => cleanup());

const PARSED: ParsedFile = {
  headers: ["תאריך", "סכום", "חיוב", "תיאור"],
  rows: [],
  sampleRows: [{ תאריך: "02/11/26", סכום: "10", חיוב: "10", תיאור: "x" }],
  rowCount: 1,
};

describe("ColumnMappingStep desktop amount/debit alert", () => {
  it("names the conflicting columns in the top alert summary", () => {
    const mappings: ColumnMapping[] = [
      { sourceColumn: "תאריך", targetField: "date" },
      { sourceColumn: "סכום", targetField: "amount" },
      { sourceColumn: "חיוב", targetField: "debit" },
      { sourceColumn: "תיאור", targetField: "description" },
    ];
    const issues = getMappingIssues(mappings);
    expect(issues.some((i) => i.code === "amountAndDebitCredit")).toBe(true);

    render(
      <ColumnMappingStep
        parsedFile={PARSED}
        mappings={mappings}
        isTen10Template={false}
        issues={issues}
        autoMappedColumns={{}}
        onMappingChange={vi.fn()}
      />
    );

    const alert = document.querySelector("#mapping-issues-summary");
    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain("סכום");
    expect(alert?.textContent).toContain("חיוב");
    expect(screen.getByText(/ALERT:סכום, חיוב/)).toBeInTheDocument();
  });
});
