// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ColumnMapping } from "@/lib/import/import-session.types";
import { ColumnMapper } from "./ColumnMapper";

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number; column?: string }) => {
      if (key === "mapping.unmappedCollapsed") {
        return opts?.count === 1
          ? "unmappedCollapsed:1"
          : `unmappedCollapsed:${opts?.count ?? 0}`;
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
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn();
});

afterEach(() => cleanup());

const MAPPINGS: ColumnMapping[] = [
  { sourceColumn: "תאריך", targetField: "date" },
  { sourceColumn: "תאריך ערך", targetField: "date" },
  { sourceColumn: "סכום", targetField: "amount" },
];

const MAX_LIKE: ColumnMapping[] = [
  { sourceColumn: "תאריך רכישה", targetField: "date" },
  { sourceColumn: "שם בית עסק", targetField: "description" },
  { sourceColumn: "סכום", targetField: "amount" },
  { sourceColumn: "מטבע מקורי", targetField: "currency" },
  { sourceColumn: "קטגוריה", targetField: "category" },
  { sourceColumn: "4 ספרות אחרונות", targetField: "payment_method" },
  { sourceColumn: "הערות", targetField: "recipient" },
  { sourceColumn: "סוג עסקה", targetField: null },
  { sourceColumn: "מספר שובר", targetField: null },
  { sourceColumn: "תאריך חיוב", targetField: null },
  { sourceColumn: "עמלה", targetField: null },
  { sourceColumn: "סכום מקורי", targetField: null },
  { sourceColumn: "כוכב", targetField: null },
  { sourceColumn: "תוספת", targetField: null },
  { sourceColumn: "מדינה", targetField: null },
  { sourceColumn: "מזהה", targetField: null },
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
    expect(chips).toHaveLength(2);
  });
});

describe("ColumnMapper B3 mobile cards", () => {
  it("keeps the desktop grid path when not mobile", () => {
    mockMobile = false;
    const { container } = render(
      <ColumnMapper mappings={MAPPINGS} sampleRows={[]} onMappingChange={vi.fn()} />
    );
    expect(container.querySelector("[data-mapping-mobile]")).toBeNull();
    expect(container.querySelector('[data-mapping-column="תאריך"]')?.className).toContain(
      "grid"
    );
  });

  it("renders cards on mobile and hides empty samples", () => {
    mockMobile = true;
    const { container } = render(
      <ColumnMapper
        mappings={[
          { sourceColumn: "תאריך", targetField: "date" },
          { sourceColumn: "ריק", targetField: "description" },
        ]}
        sampleRows={[{ תאריך: "02/11/26", ריק: "" }]}
        onMappingChange={vi.fn()}
      />
    );

    expect(container.querySelector("[data-mapping-mobile]")).toBeInTheDocument();
    const dateCard = container.querySelector('[data-mapping-column="תאריך"]');
    const emptyCard = container.querySelector('[data-mapping-column="ריק"]');
    expect(dateCard?.querySelectorAll(".rounded-full").length).toBeGreaterThan(0);
    expect(emptyCard?.querySelectorAll(".rounded-full")).toHaveLength(0);
  });

  it("orders mapped cards first and collapses non-flagged unmapped columns", () => {
    mockMobile = true;
    const { container } = render(
      <ColumnMapper
        mappings={MAX_LIKE}
        sampleRows={[
          Object.fromEntries(MAX_LIKE.map((m) => [m.sourceColumn, "x"])),
        ]}
        onMappingChange={vi.fn()}
      />
    );

    const cards = [...container.querySelectorAll("[data-mapping-card]")];
    // collapsed by default when date+amount are mapped → only mapped cards visible
    expect(cards).toHaveLength(7);
    expect(screen.getByText("unmappedCollapsed:9")).toBeInTheDocument();
    expect(container.querySelector("[data-mapping-unmapped-section]")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /unmappedCollapsed:9/ })
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("never collapses a flagged column and auto-expands when date is unmapped", async () => {
    mockMobile = true;
    const user = userEvent.setup();
    const mappings: ColumnMapping[] = [
      { sourceColumn: "סכום", targetField: "amount" },
      { sourceColumn: "יתרה", targetField: null },
      { sourceColumn: "תאריך ערך", targetField: null },
    ];

    const { container } = render(
      <ColumnMapper
        mappings={mappings}
        sampleRows={[]}
        onMappingChange={vi.fn()}
        issueColumns={new Set(["תאריך ערך"])}
      />
    );

    // Flagged unmapped stays visible; other unmapped is in section (starts expanded)
    expect(container.querySelector('[data-mapping-column="תאריך ערך"]')).toBeInTheDocument();
    expect(container.querySelector('[data-mapping-column="יתרה"]')).toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: /unmappedCollapsed:1/ });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(container.querySelector('[data-mapping-column="יתרה"]')).toBeNull();
  });

  it("opens the picker sheet from a card trigger", async () => {
    mockMobile = true;
    const user = userEvent.setup();
    render(
      <ColumnMapper
        mappings={MAPPINGS}
        sampleRows={[{ תאריך: "02/11/26", "תאריך ערך": "03/11/26", סכום: "100" }]}
        onMappingChange={vi.fn()}
      />
    );

    const trigger = document.querySelector(
      '[data-mapping-picker="תאריך ערך"]'
    ) as HTMLButtonElement;
    expect(trigger).toBeTruthy();
    await user.click(trigger);
    expect(document.querySelector("[data-column-picker-sheet]")).toBeInTheDocument();
    expect(screen.getByText("mapping.sheet.question")).toBeInTheDocument();
  });
});
