import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Transaction } from "@/types/transaction";
import { parseCSVText } from "@/lib/import/parsers";

// Regression test for the export-transaction-fields.ts extraction: verifies
// export-csv.ts still wires the shared helpers into a correct CSV row,
// end-to-end, without needing a DOM (the actual file save is mocked out).
// Uses the already-tested parseCSVText() to read columns back out instead of
// a fragile raw-string regex — the header keys are untranslated in this test
// environment (no locale files loaded), but they're deterministic.
vi.mock("./save-export-file", () => ({
  saveOrDownloadExportedFile: vi.fn(async () => true),
}));

import { exportTransactionsToCSV } from "./export-csv";
import { saveOrDownloadExportedFile } from "./save-export-file";

beforeEach(() => {
  vi.mocked(saveOrDownloadExportedFile).mockClear();
});

function baseTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "t1",
    user_id: "u1",
    date: "2024-03-01",
    amount: 100,
    currency: "ILS",
    description: "Test",
    type: "income",
    category: "salary",
    is_chomesh: true,
    recipient: null,
    payment_method: "cash",
    created_at: "2024-03-01T10:00:00Z",
    updated_at: "2024-03-01T10:00:00Z",
    ...overrides,
  } as Transaction;
}

async function exportedRow(): Promise<Record<string, unknown>> {
  const call = vi.mocked(saveOrDownloadExportedFile).mock.calls.at(-1)?.[0];
  if (!call) throw new Error("saveOrDownloadExportedFile was not called");
  const csv = new TextDecoder("utf-8").decode(call.bytes);
  const { rows } = parseCSVText(csv);
  return rows[0];
}

describe("exportTransactionsToCSV (integration with shared export fields)", () => {
  it("includes the recurring progress for a recurring transaction", async () => {
    await exportTransactionsToCSV(
      [
        baseTransaction({
          source_recurring_id: "rec1",
          recurring_frequency: "monthly",
          occurrence_number: 3,
          total_occurrences: 12,
        }),
      ],
      "test",
      "en"
    );
    const row = await exportedRow();
    // "recurringStatus" column actually holds the frequency text (matches
    // export-excel.ts's `recurring_status: frequencyText` mapping) — see
    // the column-misalignment bug fixed alongside this extraction.
    expect(row["columns.recurringStatus"]).toBe("pdf.frequencies.monthly");
    expect(row["columns.recurringProgress"]).toBe("3/12");
    expect(row["columns.movementType"]).toBe("movementType.recurring");
    // Columns after recurringProgress must land on their own header, not
    // shifted by the extra stray placeholder that used to exist.
    expect(row["columns.id"]).toBe("t1");
    expect(row["columns.userId"]).toBe("u1");
    expect(row["columns.sourceRecurringId"]).toBe("rec1");
  });

  it("leaves recurring columns blank for a one-off transaction", async () => {
    await exportTransactionsToCSV([baseTransaction()], "test", "en");
    const row = await exportedRow();
    expect(row["columns.recurringStatus"]).toBe("");
    expect(row["columns.recurringProgress"]).toBe("");
    expect(row["columns.movementType"]).toBe("movementType.regular");
    expect(row["columns.id"]).toBe("t1");
    expect(row["columns.userId"]).toBe("u1");
  });

  it("does not export anything for an empty transaction list", async () => {
    const result = await exportTransactionsToCSV([], "test", "en");
    expect(result).toBe(true);
    expect(saveOrDownloadExportedFile).not.toHaveBeenCalled();
  });
});
