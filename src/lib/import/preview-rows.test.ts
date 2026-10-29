import { describe, expect, it, vi } from "vitest";
import type { RecurringTransaction, Transaction } from "@/types/transaction";
import type { TransactionDraftV1 } from "@/lib/intake/contracts";
import { draftToNormalizedRow } from "@/lib/intake/draft-to-import";
import type { ImportPreviewRow } from "./import-session.types";
import { parseCSVText } from "./parsers";
import { buildPreviewRows, previewRowsFromNormalized, suggestMappings } from "./index";

vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));

const HEADER = "date,amount,currency,description,type,category,recipient,payment_method,is_chomesh";

const EXISTING = [
  {
    date: "2026-10-01",
    amount: 350,
    currency: "ILS",
    type: "expense",
    description: "Groceries",
    category: "food",
  },
] as Transaction[];

const RECURRING = [
  {
    id: "rec-1",
    status: "active",
    currency: "ILS",
    type: "income",
    amount: 5000,
    frequency: "monthly",
    day_of_month: 2,
    description: "Salary",
  },
] as RecurringTransaction[];

function draft(overrides: Partial<TransactionDraftV1>): TransactionDraftV1 {
  return {
    schema_version: 1,
    date: "2026-10-05",
    amount: 100,
    currency: "ILS",
    type: "expense",
    description: null,
    category: null,
    recipient: null,
    payment_method: null,
    is_chomesh: false,
    requested_rate: null,
    ...overrides,
  };
}

async function viaFile(lines: string[]): Promise<ImportPreviewRow[]> {
  const { headers, rows } = parseCSVText([HEADER, ...lines].join("\n"));
  const parsed = { headers, rows, sampleRows: rows.slice(0, 5), rowCount: rows.length };
  const result = await buildPreviewRows(parsed, suggestMappings(headers), "ILS", EXISTING, RECURRING);
  return result.rows;
}

function viaDrafts(drafts: TransactionDraftV1[]): ImportPreviewRow[] {
  return previewRowsFromNormalized(
    drafts.map((d) => draftToNormalizedRow(d, { defaultCurrency: "ILS" })),
    EXISTING,
    RECURRING,
  );
}

function review(rows: ImportPreviewRow[]) {
  return rows.map(({ rowNumber, normalized, status, issues, approved }) => ({
    rowNumber,
    normalized,
    status,
    issues,
    approved,
  }));
}

describe("previewRowsFromNormalized", () => {
  it("gives the same review as the file path where both profiles agree", async () => {
    const file = await viaFile([
      "2026-10-01,350,ILS,Groceries,expense,food,,cash,no",
      "2026-10-02,5000,ILS,Salary,income,salary,,bank_transfer,no",
      "2026-10-03,180,ILS,Tzedaka,donation,,Local shul,cash,yes",
      "2026-10-04,90,ILS,Taxi,expense,transportation,,credit_card,no",
      "2026-10-04,90,ILS,Taxi,expense,transportation,,credit_card,no",
      "2026-10-06,1200,ILS,Accountant,recognized expense,,,,no",
      "1999-12-31,40,ILS,Old,expense,,,,no",
      "2026-10-07,25,USD,Books,expense,shopping,,,no",
    ]);
    const drafts = viaDrafts([
      draft({ date: "2026-10-01", amount: 350, description: "Groceries", category: "food", payment_method: "cash" }),
      draft({ date: "2026-10-02", amount: 5000, type: "income", description: "Salary", category: "salary", payment_method: "bank_transfer" }),
      draft({ date: "2026-10-03", amount: 180, type: "donation", description: "Tzedaka", recipient: "Local shul", payment_method: "cash", is_chomesh: true }),
      draft({ date: "2026-10-04", amount: 90, description: "Taxi", category: "transportation", payment_method: "credit_card" }),
      draft({ date: "2026-10-04", amount: 90, description: "Taxi", category: "transportation", payment_method: "credit_card" }),
      draft({ date: "2026-10-06", amount: 1200, type: "recognized-expense", description: "Accountant" }),
      draft({ date: "1999-12-31", amount: 40, description: "Old" }),
      draft({ date: "2026-10-07", amount: 25, currency: "USD", description: "Books", category: "shopping" }),
    ]);

    expect(review(drafts)).toEqual(review(file));
    expect(drafts.map((r) => [r.status, r.issues.map((i) => i.code)])).toEqual([
      ["needs_review", ["possible_duplicate"]],
      ["needs_review", ["possible_recurring"]],
      ["ready", []],
      ["ready", []],
      ["needs_review", ["possible_duplicate"]],
      ["ready", []],
      ["invalid", ["date_before_minimum"]],
      ["invalid", ["foreign_currency_not_supported"]],
    ]);
    expect(drafts[2].normalized).toMatchObject({ type: "donation", category: null, is_chomesh: true });
  });

  it("keeps exempt-income and non_tithe_donation, which the file path reads as income", async () => {
    const file = await viaFile([
      "2026-10-08,700,ILS,Gift,exempt-income,,,,no",
      "2026-10-09,60,ILS,Friend,non_tithe_donation,,,,no",
    ]);
    const drafts = viaDrafts([
      draft({ date: "2026-10-08", amount: 700, type: "exempt-income", description: "Gift" }),
      draft({ date: "2026-10-09", amount: 60, type: "non_tithe_donation", description: "Friend" }),
    ]);

    expect(file.map((r) => [r.status, r.normalized?.type])).toEqual([
      ["ready", "income"],
      ["ready", "income"],
    ]);
    expect(drafts.map((r) => [r.status, r.normalized?.type, r.approved])).toEqual([
      ["ready", "exempt-income", true],
      ["ready", "non_tithe_donation", true],
    ]);
  });

  it("marks a converted foreign draft invalid, since the import save drops conversion data", () => {
    const [row] = viaDrafts([
      draft({ amount: 100, currency: "USD", requested_rate: 3.7, description: "Books" }),
    ]);

    expect(row.status).toBe("invalid");
    expect(row.approved).toBe(false);
    expect(row.normalized).toBeUndefined();
    expect(row.issues).toEqual([
      { code: "foreign_currency_not_supported", field: "currency", detail: "USD" },
    ]);
  });
});
