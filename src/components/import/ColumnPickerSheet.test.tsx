// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImportTargetField } from "@/lib/import/import-session.types";
import { ColumnPickerSheet } from "./ColumnPickerSheet";

const TARGET_FIELDS = [
  "date",
  "amount",
  "debit",
  "credit",
  "description",
  "currency",
  "type",
  "category",
  "recipient",
  "payment_method",
  "is_chomesh",
] as const;

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (key: string, opts?: { column?: string }) => {
      if (key.startsWith("mapping.fields.")) {
        return key.slice("mapping.fields.".length);
      }
      if (key === "mapping.sheet.usedBy") {
        return `usedBy:${opts?.column ?? ""}`;
      }
      if (key === "mapping.sheet.alsoMarked") {
        return `alsoMarked:${opts?.column ?? ""}`;
      }
      return key;
    },
    i18n: { language: "he", dir: () => "rtl" },
  }),
}));
vi.mock("@/lib/utils/export-excel", () => ({ exportTransactionsToExcel: vi.fn() }));
vi.mock("@/lib/utils/export-pdf", () => ({ exportTransactionsToPDF: vi.fn() }));

beforeEach(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn();
});

afterEach(() => cleanup());

function renderSheet(
  overrides: Partial<ComponentProps<typeof ColumnPickerSheet>> = {}
) {
  const onSelect = vi.fn();
  const onOpenChange = vi.fn();
  const usedByOther = new Map<ImportTargetField, string>([
    ["debit", "בחובה"],
    ["credit", "בזכות"],
    ["date", "תאריך"],
  ]);

  render(
    <ColumnPickerSheet
      open
      onOpenChange={onOpenChange}
      sourceColumn="תאריך ערך"
      samples={["02/11/26", "03/11/26"]}
      currentField="date"
      usedByOther={usedByOther}
      onSelect={onSelect}
      {...overrides}
    />
  );

  return { onSelect, onOpenChange };
}

describe("ColumnPickerSheet", () => {
  it("sets RTL dir on the drawer content", () => {
    renderSheet();
    const sheet = document.querySelector("[data-column-picker-sheet]");
    expect(sheet).toHaveAttribute("dir", "rtl");
  });

  it("lists Don't import first, then TARGET_FIELDS in order", () => {
    renderSheet();
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveTextContent("mapping.noMapping");
    expect(options[0]).toHaveTextContent("mapping.sheet.skipHint");

    const fieldLabels = options.slice(1).map((el) => {
      const label = el.querySelector("span.block.text-sm");
      return label?.textContent ?? "";
    });
    expect(fieldLabels).toEqual([...TARGET_FIELDS]);
  });

  it("disables options already used by another column with usedBy reason", () => {
    renderSheet();
    const debit = screen.getByRole("option", { name: /debit/i });
    const credit = screen.getByRole("option", { name: /credit/i });
    expect(debit).toBeDisabled();
    expect(credit).toBeDisabled();
    expect(debit).toHaveTextContent("usedBy:בחובה");
    expect(credit).toHaveTextContent("usedBy:בזכות");
  });

  it("marks the selected duplicate with alsoMarked and a check icon", () => {
    renderSheet();
    const dateOption = screen.getByRole("option", { name: /^date/i });
    expect(dateOption).toHaveAttribute("aria-selected", "true");
    expect(dateOption).toHaveTextContent("alsoMarked:תאריך");
    expect(dateOption).not.toBeDisabled();
    expect(dateOption.querySelector("svg")).not.toBeNull();
  });

  it("calls onSelect and closes when picking Don't import", async () => {
    const user = userEvent.setup();
    const { onSelect, onOpenChange } = renderSheet();

    await user.click(screen.getByRole("option", { name: /mapping\.noMapping/i }));

    expect(onSelect).toHaveBeenCalledWith(null);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps description selectable even when another column uses it", () => {
    const usedByOther = new Map<ImportTargetField, string>([
      ["description", "פרטים"],
    ]);
    renderSheet({
      currentField: null,
      usedByOther,
    });
    const description = screen.getByRole("option", { name: /description/i });
    expect(description).not.toBeDisabled();
  });
});
