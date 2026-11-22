// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ColumnMapping } from "@/lib/import/import-session.types";
import { ColumnMapper } from "./ColumnMapper";

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "he", dir: () => "rtl" },
  }),
}));
vi.mock("@/lib/utils/export-excel", () => ({ exportTransactionsToExcel: vi.fn() }));
vi.mock("@/lib/utils/export-pdf", () => ({ exportTransactionsToPDF: vi.fn() }));

afterEach(() => cleanup());

const MAPPINGS: ColumnMapping[] = [
  { sourceColumn: "תאריך", targetField: "date" },
  { sourceColumn: "תאריך ערך", targetField: "date" },
  { sourceColumn: "סכום", targetField: "amount" },
];

describe("ColumnMapper B1 issue state", () => {
  it("marks issue rows red and shows inline error text naming the other column", () => {
    const issueColumns = new Set(["תאריך", "תאריך ערך"]);
    const issueTextByColumn = new Map([
      ["תאריך", 'גם "תאריך ערך" מסומנת כתאריך'],
      ["תאריך ערך", 'גם "תאריך" מסומנת כתאריך'],
    ]);

    const { container } = render(
      <ColumnMapper
        mappings={MAPPINGS}
        sampleRows={[{ תאריך: "02/11/26", "תאריך ערך": "03/11/26", סכום: "100" }]}
        onMappingChange={vi.fn()}
        issueColumns={issueColumns}
        issueTextByColumn={issueTextByColumn}
        autoMappedColumns={{ תאריך: "date", סכום: "amount" }}
      />
    );

    const dateRow = container.querySelector('[data-mapping-column="תאריך"]');
    const valueDateRow = container.querySelector('[data-mapping-column="תאריך ערך"]');
    expect(dateRow).toHaveAttribute("data-mapping-issue", "true");
    expect(valueDateRow).toHaveAttribute("data-mapping-issue", "true");
    expect(dateRow?.className).toContain("border-destructive");
    expect(valueDateRow?.className).toContain("bg-red-50");
    expect(screen.getByText('גם "תאריך ערך" מסומנת כתאריך')).toBeInTheDocument();
    expect(screen.getByText('גם "תאריך" מסומנת כתאריך')).toBeInTheDocument();
  });

  it("shows the auto-detected chip only while the target still matches the suggestion", () => {
    render(
      <ColumnMapper
        mappings={MAPPINGS}
        sampleRows={[]}
        onMappingChange={vi.fn()}
        autoMappedColumns={{ תאריך: "date", סכום: "amount" }}
      />
    );

    const chips = screen.getAllByText("mapping.autoDetected");
    // תאריך still matches; תאריך ערך was never auto-mapped to date in autoMappedColumns; סכום matches
    expect(chips).toHaveLength(2);
  });
});
