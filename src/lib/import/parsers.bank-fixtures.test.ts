import { describe, expect, it, vi } from "vitest";
import {
  applyMappings,
  suggestMappings,
  validateMappings,
} from "./mapping";
import { normalizeRow } from "./normalize";
import { checkCardRefund } from "./card-refund-detector";
import { rowBlocksApproval, getApprovedRows } from "./approval-gates";
import { revalidateAfterEdit } from "./validation";
import {
  decodeImportText,
  parseCSVText,
  parseFile,
  parseHtmlTableText,
} from "./parsers";
import {
  buildCalXlsx,
  buildHapoalimXlsx,
  buildIsracardXlsx,
  buildLeumiCsv,
  buildMaxXlsx,
  buildMizrahiXlsxAsXls,
  LEUMI_HTML_XLS,
  MIZRAHI_HTML_XLS,
} from "./__fixtures__/banks/build-fixtures";

vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));

import { buildPreviewRows } from "./index";

function fileFromBytes(bytes: Uint8Array, name: string): File {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new File([copy.buffer], name);
}

describe("bank fixture parsing", () => {
  it("decodes windows-1255 CSV and skips the title row", () => {
    const { bytes } = buildLeumiCsv({ encoding: "windows-1255", withTitle: true });
    const text = decodeImportText(bytes);
    expect(text).toContain("תאריך");
    expect(text).toContain("משכורת");

    const { headers, rows } = parseCSVText(text);
    expect(headers[0]).toBe("תאריך");
    expect(headers).toContain("בחובה");
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows[0]?.["תאריך"]).toBe("02/11/26");
  });

  it("skips a UTF-8 title row before the Leumi header", async () => {
    const { name, bytes } = buildLeumiCsv({ encoding: "utf8", withTitle: true });
    const result = await parseFile(fileFromBytes(bytes, name));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.file.headers[0]).toBe("תאריך");
    expect(result.file.headers).toContain("תאריך ערך");
  });

  it("detects the Hapoalim header below a merged title row", async () => {
    const result = await parseFile(await buildHapoalimXlsx());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.file.headers).toContain("תאריך");
    expect(result.file.headers).toContain("חובה");
    expect(result.file.headers.some((header) => header.startsWith("תנועות בחשבון"))).toBe(
      false,
    );

    const mappings = suggestMappings(result.file.headers);
    expect(validateMappings(mappings).valid).toBe(true);
    expect(mappings.find((m) => m.sourceColumn === "תאריך")?.targetField).toBe("date");
    expect(mappings.find((m) => m.sourceColumn === "תאריך ערך")?.targetField).toBeNull();

    const first = normalizeRow(applyMappings(result.file.rows[0], mappings), "ILS");
    expect(first.normalized?.date).toBe("2026-11-02");
    expect(first.normalized?.type).toBe("income");
    expect(first.normalized?.amount).toBe(12500);
  });

  it("parses Leumi HTML saved as .xls", async () => {
    const result = await parseFile(new File([LEUMI_HTML_XLS], "leumi-html.xls"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.file.headers[0]).toBe("תאריך");
    expect(result.file.headers).toContain("בזכות");

    const mappings = suggestMappings(result.file.headers);
    expect(validateMappings(mappings).valid).toBe(true);

    const first = normalizeRow(applyMappings(result.file.rows[0], mappings), "ILS");
    expect(first.normalized?.date).toBe("2026-11-02");
    expect(first.normalized?.amount).toBe(12500);
    expect(first.normalized?.type).toBe("income");
  });

  it("parses Mizrahi HTML saved as .xls", async () => {
    const parsed = parseHtmlTableText(MIZRAHI_HTML_XLS);
    expect(parsed.headers).toContain("תאריך");
    expect(parsed.headers).toContain("זכות");

    const result = await parseFile(new File([MIZRAHI_HTML_XLS], "mizrahi-html.xls"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const mappings = suggestMappings(result.file.headers);
    expect(validateMappings(mappings).valid).toBe(true);
    expect(mappings.find((m) => m.sourceColumn === "תאריך ערך")?.targetField).toBeNull();

    const first = normalizeRow(applyMappings(result.file.rows[0], mappings), "ILS");
    expect(first.normalized?.date).toBe("2026-11-02");
    expect(first.normalized?.type).toBe("income");
  });

  it("accepts a ZIP .xlsx misnamed as .xls", async () => {
    const result = await parseFile(await buildMizrahiXlsxAsXls());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.file.headers).toContain("תאריך");
    expect(validateMappings(suggestMappings(result.file.headers)).valid).toBe(true);
  });

  it("still rejects true binary .xls payloads", async () => {
    const binary = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00]);
    const result = await parseFile(fileFromBytes(binary, "legacy.xls"));
    expect(result).toMatchObject({ ok: false, error: "xls_not_supported" });
  });

  it("auto-maps Max sheet headers without מטבע→debit", async () => {
    const file = await buildMaxXlsx();
    const sheets = await parseFile(file);
    expect(sheets.ok).toBe(true);
    if (!sheets.ok) return;
    expect(sheets.file.availableSheets?.length).toBeGreaterThan(1);

    const result = await parseFile(file, sheets.file.availableSheets![0]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const mappings = suggestMappings(result.file.headers);
    expect(mappings.find((m) => m.sourceColumn === "מטבע חיוב")?.targetField).toBe(
      "currency",
    );
    expect(mappings.find((m) => m.sourceColumn === "סכום חיוב")?.targetField).toBe(
      "debit",
    );
    expect(mappings.find((m) => m.sourceColumn === "תאריך חיוב")?.targetField).toBeNull();
    expect(
      mappings.find((m) => m.sourceColumn.includes("שער המרה"))?.targetField,
    ).toBeNull();
    expect(validateMappings(mappings).valid).toBe(true);

    const first = normalizeRow(applyMappings(result.file.rows[0], mappings), "ILS");
    expect(first.normalized?.date).toBe("2026-11-03");
    // Charge-only Max sheet: positive סכום חיוב is an expense (debit convention).
    expect(first.normalized?.type).toBe("expense");
    expect(first.normalized?.amount).toBe(412.3);

    const refundRaw = result.file.rows.find(
      (row) => String(row["שם בית העסק"] ?? "").includes("החזר"),
    );
    expect(refundRaw).toBeTruthy();
    const refundMapped = applyMappings(refundRaw!, mappings);
    const refundNorm = normalizeRow(refundMapped, "ILS");
    // Max labels refunds as סוג עסקה=זיכוי → income via locale aliases; abs(debit) kept.
    expect(refundNorm.normalized?.type).toBe("income");
    expect(refundNorm.normalized?.amount).toBe(50);
    expect(checkCardRefund(refundMapped)?.code).toBe("card_refund");
  });

  it("parses Cal purchases as expenses (dual-column charge stays debit)", async () => {
    const result = await parseFile(await buildCalXlsx());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const mappings = suggestMappings(result.file.headers);
    expect(mappings.find((m) => m.sourceColumn === "סכום חיוב")?.targetField).toBe(
      "debit",
    );
    expect(mappings.find((m) => m.sourceColumn === "סכום עסקה")?.targetField).toBeNull();
    expect(validateMappings(mappings).valid).toBe(true);

    const first = normalizeRow(applyMappings(result.file.rows[0], mappings), "ILS");
    expect(first.normalized?.date).toBe("2026-11-03");
    expect(first.normalized?.amount).toBe(412.3);
    expect(first.normalized?.type).toBe("expense");

    const refundRaw = result.file.rows.find(
      (row) => String(row["שם בית עסק"] ?? "").includes("החזר"),
    );
    expect(refundRaw).toBeTruthy();
    const refundMapped = applyMappings(refundRaw!, mappings);
    const refundNorm = normalizeRow(refundMapped, "ILS");
    // Cal labels refunds as סוג עסקה=זיכוי → income; negative debit still flags card_refund.
    expect(refundNorm.normalized?.type).toBe("income");
    expect(refundNorm.normalized?.amount).toBe(50);
    expect(checkCardRefund(refundMapped)?.code).toBe("card_refund");
  });

  it("maps Isracard charge currency so foreign merchants charged in ILS are not blocked", async () => {
    const result = await parseFile(await buildIsracardXlsx());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const mappings = suggestMappings(result.file.headers);
    expect(mappings.find((m) => m.sourceColumn === "סכום חיוב")?.targetField).toBe(
      "debit",
    );
    expect(mappings.find((m) => m.sourceColumn === "מטבע לחיוב")?.targetField).toBe(
      "currency",
    );
    expect(mappings.find((m) => m.sourceColumn === "מטבע מקור")?.targetField).toBeNull();
    expect(validateMappings(mappings).valid).toBe(true);

    const foreign = result.file.rows.find(
      (row) => String(row["שם בית עסק"] ?? "").includes("AMAZON"),
    );
    expect(foreign).toBeTruthy();
    const normalized = normalizeRow(applyMappings(foreign!, mappings), "ILS");
    expect(normalized.issues.map((issue) => issue.code)).not.toContain(
      "foreign_currency_not_supported",
    );
    expect(normalized.normalized?.currency).toBe("ILS");
    expect(normalized.normalized?.amount).toBe(171.2);
    expect(normalized.normalized?.date).toBe("2026-11-10");
    expect(normalized.normalized?.type).toBe("expense");

    const purchase = result.file.rows.find(
      (row) => String(row["שם בית עסק"] ?? "").includes("שופרסל"),
    );
    expect(purchase).toBeTruthy();
    const purchaseNorm = normalizeRow(applyMappings(purchase!, mappings), "ILS");
    expect(purchaseNorm.normalized?.type).toBe("expense");
    expect(purchaseNorm.normalized?.amount).toBe(412.3);

    const refundRaw = result.file.rows.find(
      (row) => String(row["שם בית עסק"] ?? "").includes("החזר"),
    );
    expect(refundRaw).toBeTruthy();
    const refundMapped = applyMappings(refundRaw!, mappings);
    const refundNorm = normalizeRow(refundMapped, "ILS");
    expect(refundNorm.normalized?.type).toBe("expense");
    expect(refundNorm.normalized?.amount).toBe(50);
    expect(checkCardRefund(refundMapped)?.code).toBe("card_refund");
  });

  it.each([
    ["Cal", buildCalXlsx, "שם בית עסק", false],
    ["Max", buildMaxXlsx, "שם בית העסק", true],
    ["Isracard", buildIsracardXlsx, "שם בית עסק", false],
  ] as const)(
    "%s preview refunds have no tentative type and stay blocked until type is set",
    async (_label, build, descCol, multiSheet) => {
      const file = await build();
      let result = await parseFile(file);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      if (multiSheet) {
        expect(result.file.availableSheets?.length).toBeGreaterThan(1);
        result = await parseFile(file, result.file.availableSheets![0]);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
      }

      const mappings = suggestMappings(result.file.headers);
      const { rows } = await buildPreviewRows(result.file, mappings, "ILS", [], []);
      const refund = rows.find((r) =>
        String(r.raw[descCol] ?? r.normalized?.description ?? "").includes("החזר"),
      );
      expect(refund).toBeTruthy();
      expect(refund?.status).toBe("needs_review");
      expect(refund?.issues.map((i) => i.code)).toContain("card_refund");
      expect(refund?.normalized?.type).toBeNull();
      expect(refund?.normalized?.amount).toBe(50);
      expect(refund?.approved).toBe(false);
      expect(rowBlocksApproval(refund!)).toBe(true);
      expect(getApprovedRows([{ ...refund!, approved: true }])).toEqual([]);

      // Category-only edit keeps the block (RG-203).
      const categoryOnly = {
        ...refund!,
        normalized: { ...refund!.normalized!, category: "מזון" },
      };
      const afterCategory = revalidateAfterEdit(categoryOnly, {
        existingTransactions: [],
        recurringTransactions: [],
      });
      expect(afterCategory.issues.map((i) => i.code)).toContain("card_refund");
      expect(afterCategory.status).toBe("needs_review");
      expect(
        rowBlocksApproval({ ...categoryOnly, ...afterCategory }),
      ).toBe(true);

      // Explicit type unblocks.
      const typed = {
        ...refund!,
        normalized: { ...refund!.normalized!, type: "income" as const },
      };
      const afterType = revalidateAfterEdit(typed, {
        existingTransactions: [],
        recurringTransactions: [],
      });
      expect(afterType.issues.map((i) => i.code)).not.toContain("card_refund");
      expect(afterType.status).toBe("ready");
      expect(
        rowBlocksApproval({
          ...typed,
          issues: afterType.issues,
          status: afterType.status,
        }),
      ).toBe(false);
    },
  );

  it("keeps positive Cal purchases as ready expenses in preview", async () => {
    const result = await parseFile(await buildCalXlsx());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const mappings = suggestMappings(result.file.headers);
    const { rows } = await buildPreviewRows(result.file, mappings, "ILS", [], []);
    const purchase = rows.find((r) => r.normalized?.description?.includes("שופרסל"));
    expect(purchase?.status).toBe("ready");
    expect(purchase?.normalized?.type).toBe("expense");
    expect(purchase?.approved).toBe(true);
    expect(rowBlocksApproval(purchase!)).toBe(false);
  });
});
