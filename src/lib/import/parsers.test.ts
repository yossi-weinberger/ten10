import { describe, it, expect } from "vitest";
import { parseCSVText, parseFile, MAX_FILE_SIZE_BYTES, MAX_ROWS } from "./parsers";

// Characterization tests: they pin the CURRENT behavior of the custom CSV
// parser (quotes, delimiters, Hebrew, BOM) as a safety net before refactors.

describe("parseCSVText", () => {
  it("parses a simple comma-separated file with Hebrew headers", () => {
    const { headers, rows } = parseCSVText(
      "תאריך,סכום,תיאור\n2024-01-15,100.50,מכולת\n2024-01-16,200,פירות"
    );
    expect(headers).toEqual(["תאריך", "סכום", "תיאור"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ תאריך: "2024-01-15", סכום: "100.50", תיאור: "מכולת" });
  });

  it("strips BOM and normalizes CRLF line endings", () => {
    const { headers, rows } = parseCSVText("﻿a,b\r\n1,2\r\n3,4");
    expect(headers).toEqual(["a", "b"]);
    expect(rows).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  it("keeps delimiters inside quoted fields", () => {
    const { rows } = parseCSVText('a,b\n"מכולת, שכונתית",5');
    expect(rows[0]).toEqual({ a: "מכולת, שכונתית", b: "5" });
  });

  it('unescapes doubled quotes ("" -> ")', () => {
    const { rows } = parseCSVText('a,b\n"He said ""hi""",2');
    expect(rows[0].a).toBe('He said "hi"');
  });

  it("preserves newlines inside quoted fields", () => {
    const { rows } = parseCSVText('a,b\n"line1\nline2",3');
    expect(rows).toHaveLength(1);
    expect(rows[0].a).toBe("line1\nline2");
  });

  it("detects semicolon delimiter", () => {
    const { headers, rows } = parseCSVText("a;b;c\n1;2;3");
    expect(headers).toEqual(["a", "b", "c"]);
    expect(rows[0]).toEqual({ a: "1", b: "2", c: "3" });
  });

  it("detects tab delimiter", () => {
    const { headers, rows } = parseCSVText("a\tb\n1\t2");
    expect(headers).toEqual(["a", "b"]);
    expect(rows[0]).toEqual({ a: "1", b: "2" });
  });

  it("skips leading blank lines before the header row", () => {
    const { headers, rows } = parseCSVText("\n\na,b\n1,2");
    expect(headers).toEqual(["a", "b"]);
    expect(rows).toHaveLength(1);
  });

  it("skips empty data lines", () => {
    const { rows } = parseCSVText("a,b\n1,2\n\n3,4\n");
    expect(rows).toHaveLength(2);
  });

  it("fills missing trailing values with empty string", () => {
    const { rows } = parseCSVText("a,b,c\n1,2");
    expect(rows[0]).toEqual({ a: "1", b: "2", c: "" });
  });

  it("normalizes Hebrew gershayim in headers (סה״כ -> סה\"כ)", () => {
    const { headers } = parseCSVText("סה״כ,b\n1,2");
    expect(headers[0]).toBe('סה"כ');
  });

  it("returns empty result for empty/whitespace input", () => {
    expect(parseCSVText("")).toEqual({ headers: [], rows: [] });
    expect(parseCSVText("\n\n  \n")).toEqual({ headers: [], rows: [] });
  });
});

describe("parseFile (CSV)", () => {
  const csvFile = (content: string, name = "test.csv") =>
    new File([content], name, { type: "text/csv" });

  it("rejects files over the size limit", async () => {
    const big = new File([new Uint8Array(MAX_FILE_SIZE_BYTES + 1)], "big.csv");
    const result = await parseFile(big);
    expect(result).toMatchObject({ ok: false, error: "too_large" });
  });

  it("rejects .xls files", async () => {
    const result = await parseFile(csvFile("a,b", "old.xls"));
    expect(result).toMatchObject({ ok: false, error: "xls_not_supported" });
  });

  it("rejects unsupported extensions", async () => {
    const result = await parseFile(csvFile("a,b", "notes.txt"));
    expect(result).toMatchObject({ ok: false, error: "unsupported_format" });
  });

  it("parses a valid CSV file", async () => {
    const result = await parseFile(csvFile("תאריך,סכום\n2024-01-15,100\n2024-01-16,200"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.file.headers).toEqual(["תאריך", "סכום"]);
      expect(result.file.rowCount).toBe(2);
      expect(result.file.sampleRows).toHaveLength(2);
    }
  });

  it("generates 'Column N' headers when the first row looks like data", async () => {
    const result = await parseFile(csvFile("2024-01-15,100.50\n2024-01-16,200.00"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.file.headers).toEqual(["Column 1", "Column 2"]);
      // The original first row becomes a data row
      expect(result.file.rowCount).toBe(2);
      expect(result.file.rows[0]).toEqual({ "Column 1": "2024-01-15", "Column 2": "100.50" });
      expect(result.file.diagnostics).toEqual([{ code: "generated_headers", count: 2 }]);
    }
  });

  it("returns no_data when headers exist but no rows follow", async () => {
    const result = await parseFile(csvFile("תאריך,סכום\n"));
    expect(result).toMatchObject({ ok: false, error: "no_data" });
  });

  it("returns too_many_rows above MAX_ROWS", async () => {
    const lines = ["a,b", ...Array.from({ length: MAX_ROWS + 1 }, (_, i) => `${i},x`)];
    const result = await parseFile(csvFile(lines.join("\n")));
    expect(result).toMatchObject({ ok: false, error: "too_many_rows" });
  });
});
