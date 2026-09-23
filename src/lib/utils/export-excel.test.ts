import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Transaction } from "@/types/transaction";

vi.mock("./save-export-file", () => ({
  saveOrDownloadExportedFile: vi.fn(async () => true),
}));

import { exportTransactionsToExcel } from "./export-excel";
import { saveOrDownloadExportedFile } from "./save-export-file";

const transaction = {
  id: "t1",
  user_id: "u1",
  date: "2026-09-12",
  amount: 100,
  currency: "ILS",
  description: "Test",
  type: "income",
  category: "salary",
  is_chomesh: false,
  payment_method: "cash",
} as Transaction;

beforeEach(() => {
  vi.mocked(saveOrDownloadExportedFile).mockClear();
});

async function exportedSheet(): Promise<ExcelJS.Worksheet> {
  const calls = vi.mocked(saveOrDownloadExportedFile).mock.calls;
  const call = calls[calls.length - 1]?.[0];
  if (!call) throw new Error("saveOrDownloadExportedFile was not called");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    call.bytes as unknown as Parameters<typeof workbook.xlsx.load>[0],
  );
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Workbook has no worksheet");
  return sheet;
}

describe("exportTransactionsToExcel", () => {
  it("keeps a machine-usable Gregorian date without a Hebrew column by default", async () => {
    await exportTransactionsToExcel([transaction], "test.xlsx", "en", {
      calendarType: "gregorian",
      showSecondaryDate: false,
    });

    const sheet = await exportedSheet();
    expect(sheet.getRow(2).getCell(1).value).toBeInstanceOf(Date);
    expect(sheet.columnCount).toBe(10);
  });

  it("adds Hebrew text immediately after the Gregorian date", async () => {
    await exportTransactionsToExcel([transaction], "test.xlsx", "en", {
      calendarType: "hebrew",
      showSecondaryDate: false,
    });

    const sheet = await exportedSheet();
    expect(sheet.getRow(2).getCell(1).value).toBeInstanceOf(Date);
    expect(sheet.getRow(2).getCell(2).value).toBe("א׳ Tishri תשפ״ז");
    expect(sheet.columnCount).toBe(11);
  });
});
