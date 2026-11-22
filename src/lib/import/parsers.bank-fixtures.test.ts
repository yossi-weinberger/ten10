import { describe, expect, it } from "vitest";
import {
  applyMappings,
  suggestMappings,
  validateMappings,
} from "./mapping";
import { normalizeRow } from "./normalize";
import {
  decodeImportText,
  parseCSVText,
  parseFile,
  parseHtmlTableText,
} from "./parsers";
import {
  buildCalXlsx,
  buildHapoalimXlsx,
  buildLeumiCsv,
  buildMaxXlsx,
  buildMizrahiXlsxAsXls,
  LEUMI_HTML_XLS,
  MIZRAHI_HTML_XLS,
} from "./__fixtures__/banks/build-fixtures";

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
      "amount",
    );
    expect(mappings.find((m) => m.sourceColumn === "תאריך חיוב")?.targetField).toBeNull();
    expect(
      mappings.find((m) => m.sourceColumn.includes("שער המרה"))?.targetField,
    ).toBeNull();
    expect(validateMappings(mappings).valid).toBe(true);

    const first = normalizeRow(applyMappings(result.file.rows[0], mappings), "ILS");
    expect(first.normalized?.date).toBe("2026-11-03");
  });

  it("parses Cal dd/mm/yy dates after resolving amount columns", async () => {
    const result = await parseFile(await buildCalXlsx());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const mappings = suggestMappings(result.file.headers);
    expect(validateMappings(mappings).valid).toBe(true);

    const first = normalizeRow(applyMappings(result.file.rows[0], mappings), "ILS");
    expect(first.normalized?.date).toBe("2026-11-03");
    expect(first.normalized?.amount).toBe(412.3);
  });
});
