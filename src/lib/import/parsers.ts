import type { ParseFileResult } from "./import-session.types";
import { cleanHeaderName } from "./header-normalizer";

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_ROWS = 5000;
const SAMPLE_ROWS = 5;

function looksLikeDataHeader(headers: string[]): boolean {
  if (headers.length < 2) return false;

  const meaningful = headers.map((header) => header.trim()).filter(Boolean);
  if (meaningful.length < 2) return false;

  const dataLikeCount = meaningful.filter((header) =>
    isDateLikeText(header) || isAmountLikeText(header)
  ).length;

  return dataLikeCount >= 2 && dataLikeCount >= Math.ceil(meaningful.length / 2);
}

function buildGeneratedHeaders(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `Column ${index + 1}`);
}

function remapHeaderlessRows(
  originalHeaders: string[],
  rows: Record<string, unknown>[]
): { headers: string[]; rows: Record<string, unknown>[] } {
  const headers = buildGeneratedHeaders(originalHeaders.length);
  // Known limitation: rows are already stored as objects keyed by the first-row values
  // (which are treated as headers by the parser). If two cells in the first row share
  // the same text (e.g. two identical amounts), one of them will have been silently
  // overwritten at parse time — column alignment may be off for those duplicated values.
  // This is an acceptable trade-off for an inherently ambiguous, non-standard file.
  const remappedRows = [
    Object.fromEntries(headers.map((header, index) => [header, originalHeaders[index] ?? ""])),
    ...rows.map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, row[originalHeaders[index]] ?? ""]))
    ),
  ];

  return { headers, rows: remappedRows };
}

function isDateLikeText(value: string): boolean {
  return (
    /^\d{4}-\d{1,2}-\d{1,2}$/.test(value) ||
    /^\d{1,2}[./-]\d{1,2}[./-](\d{2}|\d{4})$/.test(value)
  );
}

function isAmountLikeText(value: string): boolean {
  const normalized = value
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/[₪$€£¥₩,\s]/g, "");

  return /^-?\(?\d+(\.\d{1,2})?\)?$/.test(normalized);
}

// ---------------------------------------------------------------------------
// CSV parser
// ---------------------------------------------------------------------------

function detectDelimiter(firstLine: string): "," | ";" | "\t" {
  const comma = (firstLine.match(/,/g) ?? []).length;
  const semicolon = (firstLine.match(/;/g) ?? []).length;
  const tab = (firstLine.match(/\t/g) ?? []).length;
  if (tab > comma && tab > semicolon) return "\t";
  if (semicolon > comma) return ";";
  return ",";
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { current += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      current += ch; i++; continue;
    }
    if (ch === '"' && current === "") { inQuotes = true; i++; continue; }
    if (line.startsWith(delimiter, i)) { fields.push(current); current = ""; i += delimiter.length; continue; }
    current += ch; i++;
  }
  fields.push(current);
  return fields;
}

function splitCSVLines(text: string): string[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;
  let atFieldStart = true;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { current += '""'; i++; continue; }
        inQuotes = false; current += ch; continue;
      }
      current += ch; continue;
    }
    if (ch === '"' && atFieldStart) { inQuotes = true; current += ch; atFieldStart = false; continue; }
    if (ch === "\n") { lines.push(current); current = ""; atFieldStart = true; continue; }
    current += ch;
    atFieldStart = ch === "," || ch === ";" || ch === "\t";
  }
  if (current.length > 0) lines.push(current);
  return lines;
}

export function parseCSVText(text: string): {
  headers: string[];
  rows: Record<string, unknown>[];
} {
  const stripped = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const normalized = stripped.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = splitCSVLines(normalized);

  const headerIdx = lines.findIndex((l) => l.trim().length > 0);
  if (headerIdx === -1) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(lines[headerIdx]);
  const headers = parseCSVLine(lines[headerIdx], delimiter).map(cleanHeaderName);
  if (headers.length === 0 || headers.every((h) => h === "")) return { headers: [], rows: [] };

  const rows: Record<string, unknown>[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    const values = parseCSVLine(line, delimiter);
    const row: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }
  return { headers, rows };
}

// ---------------------------------------------------------------------------
// Excel parser helpers
// ---------------------------------------------------------------------------

/** Remove XML namespace prefixes so the document can be queried without namespaces. */
function normalizeXmlNs(xml: string): string {
  return xml
    .replace(/\s+xmlns:[a-z0-9]+="[^"]*"/g, "")   // remove xmlns:prefix="..." declarations
    .replace(/<([/]?)[a-z0-9]+:([a-zA-Z])/g, "<$1$2"); // <x:foo → <foo, </x:foo → </foo
}

/** Convert Excel column letters (A, B, …, AA, AB, …) to 1-based number. */
function colLetterToNum(col: string): number {
  let n = 0;
  for (const ch of col.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

/** Extract column letters and row number from a cell reference like "A12". */
function parseCellRef(ref: string): { col: number; row: number } {
  const m = ref.match(/^([A-Za-z]+)(\d+)$/);
  if (!m) return { col: 0, row: 0 };
  return { col: colLetterToNum(m[1]), row: parseInt(m[2]) };
}

// ---------------------------------------------------------------------------
// Excel fallback parser — used when ExcelJS cannot parse the file
// (e.g., some Israeli banks/credit companies export non-standard xlsx where
// the XML uses a namespace prefix like <x:workbook> instead of <workbook>)
// ---------------------------------------------------------------------------

/** Decompress a DEFLATE-raw compressed byte array using DecompressionStream. */
async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (data.length === 0) return new Uint8Array(0);
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();

  // Write and read concurrently — the serial pattern (write-all, then read-all)
  // deadlocks when the internal buffer fills up before we start consuming.
  const chunks: Uint8Array[] = [];
  const readAll = (async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  })();

  // Cast required: Uint8Array generic is ArrayBufferLike in TS ≥5.7, but
  // WritableStreamDefaultWriter.write() expects ArrayBufferView<ArrayBuffer>.
  // In a browser/Tauri context the underlying buffer is always ArrayBuffer.
  await writer.write(data as unknown as Uint8Array<ArrayBuffer>);
  await writer.close();
  await readAll;

  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

/**
 * Extract a named entry from a ZIP buffer; returns its text content or null.
 *
 * Limitation: this reader relies on the compressed size stored in the local
 * file header (bytes 18–21). It does NOT handle the ZIP "data descriptor"
 * case (general-purpose bit-flag bit 3 set), where those fields are zero and
 * the real sizes appear after the data or in the central directory. Files
 * created with streaming writers may trigger this path and return null.
 * In practice, XLSX files produced by Excel, LibreOffice, or Google Sheets
 * do not set this flag — they are generated non-streaming. This fallback
 * path is only reached when exceljs itself is unavailable, so the risk is
 * limited. If a user reports a valid XLSX that fails, parse the central
 * directory to obtain the correct offsets/sizes instead.
 */
async function extractZipEntryText(bytes: Uint8Array, entryName: string): Promise<string | null> {
  let pos = 0;
  while (pos < bytes.length - 4) {
    if (bytes[pos] === 0x50 && bytes[pos+1] === 0x4b && bytes[pos+2] === 0x03 && bytes[pos+3] === 0x04) {
      const compMethod = bytes[pos+8] | (bytes[pos+9] << 8);
      const nameLen    = bytes[pos+26] | (bytes[pos+27] << 8);
      const extraLen   = bytes[pos+28] | (bytes[pos+29] << 8);
      const compSize   = (bytes[pos+18]|(bytes[pos+19]<<8)|(bytes[pos+20]<<16)|(bytes[pos+21]<<24))>>>0;
      const name = new TextDecoder("utf-8").decode(bytes.slice(pos+30, pos+30+nameLen));
      const dataStart = pos + 30 + nameLen + extraLen;
      if (name === entryName) {
        // compSize === 0 in the local file header means the ZIP was written with a
        // data-descriptor (e.g. by a streaming writer); the real compressed/uncompressed
        // sizes appear after the data block, so we cannot reliably locate this entry's
        // payload from the local header alone without parsing the central directory.
        if (compSize === 0) return null;
        const compressed = bytes.slice(dataStart, dataStart + compSize);
        let raw: Uint8Array;
        if (compMethod === 0) {
          raw = compressed;
        } else if (compMethod === 8 && typeof DecompressionStream !== "undefined") {
          try {
            raw = await inflateRaw(compressed);
          } catch {
            return null;
          }
        } else {
          return null;
        }
        return new TextDecoder("utf-8").decode(raw);
      }
      pos = dataStart + compSize;
    } else {
      pos++;
    }
  }
  return null;
}

/** Parse shared strings from xl/sharedStrings.xml using regex (no DOMParser dependency). */
function parseSharedStrings(xml: string): string[] {
  if (!xml) return [];
  const norm = normalizeXmlNs(xml);
  const strings: string[] = [];
  // Each shared string is wrapped in <si>…</si>; text pieces are in <t>…</t>
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let siM: RegExpExecArray | null;
  while ((siM = siRe.exec(norm)) !== null) {
    const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    const parts: string[] = [];
    let tM: RegExpExecArray | null;
    while ((tM = tRe.exec(siM[1])) !== null) parts.push(tM[1]);
    strings.push(parts.join(""));
  }
  return strings;
}

/** Build a map: sheet name → xl-relative file path from workbook.xml + rels. */
function buildSheetPaths(workbookXml: string, relsXml: string): Map<string, string> {
  const map = new Map<string, string>();
  // Grab rId → target from rels
  const ridToTarget = new Map<string, string>();
  for (const m of relsXml.matchAll(/Id="([^"]+)"[^>]+Target="([^"]+)"/g)) {
    ridToTarget.set(m[1], m[2]);
  }
  // Grab sheetName → rId from workbook.xml
  for (const m of workbookXml.matchAll(/sheet[^>]+?name="([^"]+)"[^>]+?(?:r:)?id="([^"]+)"/gi)) {
    const name = m[1];
    const rId = m[2];
    const target = ridToTarget.get(rId);
    if (target) map.set(name, `xl/${target}`);
  }
  return map;
}

/** Extract available sheet names from workbook.xml. */
function extractSheetNames(workbookXml: string): string[] {
  const names: string[] = [];
  for (const m of workbookXml.matchAll(/sheet[^>]+?name="([^"]+)"/gi)) {
    names.push(m[1]);
  }
  return names;
}

/** Decode the five predefined XML character entities in an attribute value. */
function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Extract only visible sheet names (excludes state="hidden" and state="veryHidden").
 * Used for the sheet-selection UI so users never see hidden utility sheets.
 * Also decodes XML character entities so sheet names like "Q&amp;A" render as "Q&A".
 */
function extractVisibleSheetNames(workbookXml: string): string[] {
  const normalized = normalizeXmlNs(workbookXml);
  const names: string[] = [];
  for (const m of normalized.matchAll(/<sheet\b([^>]*?)\/?>/gi)) {
    const attrs = m[1];
    if (/\bstate\s*=\s*["'](hidden|veryHidden)["']/i.test(attrs)) continue;
    const nameMatch = attrs.match(/\bname\s*=\s*"([^"]*)"/i);
    if (nameMatch) names.push(decodeXmlEntities(nameMatch[1]));
  }
  return names;
}

/** Fast sheet-name discovery without loading the full workbook via ExcelJS. */
async function listExcelSheetNames(buffer: ArrayBuffer): Promise<string[] | null> {
  try {
    const bytes = new Uint8Array(buffer);
    const workbookXml = await extractZipEntryText(bytes, "xl/workbook.xml");
    if (!workbookXml) return null;
    const names = extractVisibleSheetNames(workbookXml);
    return names.length > 0 ? names : null;
  } catch {
    return null;
  }
}

/**
 * Find the "real" header row: the first row (in first 30) with the most cells.
 * Bank/credit exports often have 1–3 metadata rows at the top with only 1 cell.
 */
function findBestHeaderRowNum(rowMap: Map<number, Map<number, unknown>>): number {
  const sortedNums = Array.from(rowMap.keys()).sort((a, b) => a - b);
  const candidates = sortedNums.slice(0, 30);
  let best = candidates[0] ?? 1;
  let bestCount = 0;
  for (const rn of candidates) {
    const count = Array.from(rowMap.get(rn)!.values()).filter(
      (value) => String(value ?? "").trim() !== ""
    ).length;
    if (count > bestCount) { bestCount = count; best = rn; }
  }
  return best;
}

/**
 * Parse sheet XML to rows using regex — avoids DOMParser which can behave
 * inconsistently across Tauri/browser environments with namespace-heavy XML.
 */
function parseSheetXmlDirect(
  sheetXml: string,
  sharedStrings: string[]
): { headers: string[]; rows: Record<string, unknown>[] } {
  // Normalise namespace prefixes so we match bare tag names (<row>, <c>, <v>)
  const xml = normalizeXmlNs(sheetXml);

  const rowMap = new Map<number, Map<number, unknown>>();
  let maxCol = 0;

  // Match every <row r="N">…</row> block
  const rowRe = /<row\b[^>]*\br="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rowM: RegExpExecArray | null;
  while ((rowM = rowRe.exec(xml)) !== null) {
    const rowNum = parseInt(rowM[1]);
    if (!rowNum) continue;
    const rowContent = rowM[2];
    const cells = new Map<number, unknown>();

    // Match every <c …>…</c> inside this row
    const cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    let cellM: RegExpExecArray | null;
    while ((cellM = cellRe.exec(rowContent)) !== null) {
      const attrs = cellM[1];
      const cellBody = cellM[2];

      const refM = /\br="([A-Za-z]+\d+)"/.exec(attrs);
      if (!refM) continue;
      const { col } = parseCellRef(refM[1]);
      if (!col) continue;

      const typeM = /\bt="([^"]+)"/.exec(attrs);
      const type = typeM ? typeM[1] : "n";

      // Value is inside <v>…</v>; for inline strings also check <is><t>
      const vM = /<v>([\s\S]*?)<\/v>/.exec(cellBody);
      const isM = /<is>[\s\S]*?<t>([\s\S]*?)<\/t>/.exec(cellBody);
      const rawVal = vM ? vM[1] : isM ? isM[1] : null;
      if (rawVal === null) continue;

      let value: unknown;
      if (type === "str" || type === "inlineStr") {
        value = rawVal;
      } else if (type === "s") {
        value = sharedStrings[parseInt(rawVal)] ?? rawVal;
      } else if (type === "b") {
        value = rawVal === "1";
      } else {
        const n = parseFloat(rawVal);
        value = isNaN(n) ? rawVal : n;
      }

      cells.set(col, value);
      if (col > maxCol) maxCol = col;
    }

    if (cells.size > 0) rowMap.set(rowNum, cells);
  }

  if (rowMap.size === 0) return { headers: [], rows: [] };

  const headerRowNum = findBestHeaderRowNum(rowMap);
  const headerRow = rowMap.get(headerRowNum) ?? new Map();

  const headers: string[] = [];
  for (let c = 1; c <= maxCol; c++) {
    const v = headerRow.get(c);
    headers.push(v !== undefined ? String(v).trim() : "");
  }
  while (headers.length > 0 && headers[headers.length - 1] === "") headers.pop();

  const sortedNums = Array.from(rowMap.keys()).sort((a, b) => a - b);
  const rows: Record<string, unknown>[] = [];
  for (const rn of sortedNums) {
    if (rn <= headerRowNum) continue;
    const cells = rowMap.get(rn)!;
    const row: Record<string, unknown> = {};
    let hasValue = false;
    for (let c = 0; c < headers.length; c++) {
      const h = headers[c];
      if (!h) continue;
      const v = cells.get(c + 1) ?? null;
      row[h] = v;
      if (v !== null && v !== "") hasValue = true;
    }
    if (hasValue) rows.push(row);
  }

  return { headers, rows };
}

/** Full fallback for ExcelJS failures: parse ZIP + XML directly. */
async function parseExcelBufferFallback(
  buffer: ArrayBuffer,
  sheetName?: string
): Promise<{ availableSheets: string[]; selected: ExcelSheetPreview } | null> {
  try {
    const bytes = new Uint8Array(buffer);
    const workbookXml = (await extractZipEntryText(bytes, "xl/workbook.xml")) ?? "";
    const relsXml = (await extractZipEntryText(bytes, "xl/_rels/workbook.xml.rels")) ?? "";
    const sharedStrXml = (await extractZipEntryText(bytes, "xl/sharedStrings.xml")) ?? "";

    const availableSheets = extractSheetNames(workbookXml);
    if (availableSheets.length === 0) return null;

    const sheetPaths = buildSheetPaths(workbookXml, relsXml);
    const targetName = sheetName ?? availableSheets[0];
    const sheetPath = sheetPaths.get(targetName) ?? `xl/worksheets/sheet1.xml`;
    const sheetXml = await extractZipEntryText(bytes, sheetPath);
    if (!sheetXml) return null;

    const sharedStrings = parseSharedStrings(sharedStrXml);
    const { headers, rows } = parseSheetXmlDirect(sheetXml, sharedStrings);

    return {
      availableSheets,
      selected: { sheetName: targetName, headers, rows },
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Excel parser using ExcelJS (primary path)
// ---------------------------------------------------------------------------

export interface ExcelSheetPreview {
  sheetName: string;
  headers: string[];
  rows: Record<string, unknown>[];
}

function getCellValue(cell: import("exceljs").Cell): unknown {
  const { value, type } = cell;
  if (type === 6 /* Formula */) {
    const fv = value as { result?: unknown } | null;
    if (fv && typeof fv === "object" && "result" in fv) return fv.result ?? null;
    return null;
  }
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "object" && "richText" in value) {
    return (value as { richText: { text: string }[] }).richText.map((r) => r.text).join("");
  }
  if (typeof value === "object" && "hyperlink" in value) {
    const hl = value as { text?: string; hyperlink?: string };
    return hl.text ?? hl.hyperlink ?? "";
  }
  return value;
}

export async function parseExcelBuffer(
  buffer: ArrayBuffer,
  sheetName?: string
): Promise<{ availableSheets: string[]; selected: ExcelSheetPreview }> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();

  let useExcelJS = true;
  try {
    await workbook.xlsx.load(buffer as Buffer);
  } catch {
    useExcelJS = false;
  }

  // Some non-standard xlsx files (e.g. Israeli credit card exports that use
  // an `x:` namespace prefix in workbook.xml) cause ExcelJS to load silently
  // but return an empty workbook with no worksheets.
  if (useExcelJS && workbook.worksheets.length === 0) {
    useExcelJS = false;
  }

  // ExcelJS failed or produced empty workbook — try our own ZIP+XML fallback
  if (!useExcelJS) {
    const fallback = await parseExcelBufferFallback(buffer, sheetName);
    if (fallback) return fallback;
    throw new Error("parse_error");
  }

  const availableSheets = workbook.worksheets
    .filter((ws) => ws.state !== "hidden")
    .map((ws) => ws.name);

  let sheet = workbook.worksheets.find(
    (ws) => ws.state !== "hidden" && (!sheetName || ws.name === sheetName)
  );
  if (!sheet && workbook.worksheets.length > 0) {
    sheet = workbook.worksheets.find((ws) => ws.state !== "hidden");
  }
  if (!sheet) {
    return { availableSheets, selected: { sheetName: "", headers: [], rows: [] } };
  }

  const allRows = sheet.getRows(1, sheet.rowCount) ?? [];
  const nonEmptyRows = allRows.filter((row) =>
    row.values.slice(1).some((v) => v !== null && v !== undefined && v !== "")
  );
  if (nonEmptyRows.length === 0) {
    return { availableSheets, selected: { sheetName: sheet.name, headers: [], rows: [] } };
  }

  // Smart header detection: use the row with the most non-empty cells
  // (rather than always the first non-empty row, which is often a title/metadata row)
  const candidates = nonEmptyRows.slice(0, 30);
  let headerRow = candidates[0];
  let headerRowCellCount = 0;
  for (const row of candidates) {
    let count = 0;
    row.eachCell({ includeEmpty: false }, () => count++);
    if (count > headerRowCellCount) { headerRowCellCount = count; headerRow = row; }
  }

  // If ExcelJS found a sheet but no usable cells, it likely hit a non-standard
  // xlsx format (e.g. x: namespace prefix). Trigger the fallback parser.
  if (headerRowCellCount < 2) {
    const fallback = await parseExcelBufferFallback(buffer, sheetName);
    if (fallback && fallback.selected.headers.length > 0) return fallback;
  }

  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const val = getCellValue(cell);
    headers[colNumber - 1] = val !== null ? String(val).trim() : "";
  });
  while (headers.length > 0 && headers[headers.length - 1] === "") headers.pop();

  // Only keep rows that come AFTER the header row
  const headerRowNumber = headerRow.number;
  const dataRows = nonEmptyRows.filter((r) => r.number > headerRowNumber);

  const rows: Record<string, unknown>[] = [];
  for (const excelRow of dataRows) {
    const row: Record<string, unknown> = {};
    let hasValue = false;
    excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const headerIndex = colNumber - 1;
      if (headerIndex >= headers.length) return;
      const header = headers[headerIndex];
      if (!header) return;
      const val = getCellValue(cell);
      row[header] = val;
      if (val !== null && val !== "") hasValue = true;
      if (cell.type === 6) row[`__formula_${header}`] = true;
    });
    if (hasValue) rows.push(row);
  }

  return {
    availableSheets,
    selected: { sheetName: sheet.name, headers, rows },
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function parseFile(file: File, selectedSheet?: string): Promise<ParseFileResult> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: "too_large",
      detail: String(Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)),
    };
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "xls") return { ok: false, error: "xls_not_supported" };
  if (ext !== "csv" && ext !== "xlsx") return { ok: false, error: "unsupported_format" };
  try {
    return ext === "csv"
      ? await parseCSVFile(file)
      : await parseExcelFile(file, selectedSheet);
  } catch {
    return { ok: false, error: "parse_error" };
  }
}

async function parseCSVFile(file: File): Promise<ParseFileResult> {
  const text = await file.text();
  const { headers, rows } = parseCSVText(text);
  if (headers.length === 0) {
    const hasQuoteInFirstLine = text.split("\n")[0]?.includes('"');
    return {
      ok: false,
      error: "no_headers",
      diagnostic: hasQuoteInFirstLine
        ? "First line contains double-quote characters — possible unescaped header"
        : "No non-empty header row found",
    };
  }
  if (looksLikeDataHeader(headers)) {
    const headerless = remapHeaderlessRows(headers, rows);
    if (headerless.rows.length > MAX_ROWS) return { ok: false, error: "too_many_rows", detail: String(MAX_ROWS) };
    return {
      ok: true,
      file: {
        headers: headerless.headers,
        rows: headerless.rows,
        sampleRows: headerless.rows.slice(0, SAMPLE_ROWS),
        rowCount: headerless.rows.length,
        diagnostics: [{ code: "generated_headers", count: headerless.headers.length }],
      },
    };
  }
  if (rows.length === 0) {
    return {
      ok: false,
      error: "no_data",
      diagnostic: `Headers detected (${headers.length} columns) but no data rows followed`,
    };
  }
  if (rows.length > MAX_ROWS) return { ok: false, error: "too_many_rows", detail: String(MAX_ROWS) };
  return {
    ok: true,
    file: { headers, rows, sampleRows: rows.slice(0, SAMPLE_ROWS), rowCount: rows.length },
  };
}

async function parseExcelFile(file: File, selectedSheet?: string): Promise<ParseFileResult> {
  const buffer = await file.arrayBuffer();

  // Multi-sheet workbooks: list sheet names first without parsing cell data.
  if (!selectedSheet) {
    const quickSheets = await listExcelSheetNames(buffer);
    if (quickSheets && quickSheets.length > 1) {
      return {
        ok: true,
        file: {
          headers: [],
          rows: [],
          sampleRows: [],
          rowCount: 0,
          availableSheets: quickSheets,
          sheetName: undefined,
        },
      };
    }
  }

  const result = await parseExcelBuffer(buffer, selectedSheet);
  const { availableSheets, selected } = result;

  if (selected.headers.length === 0) {
    if (availableSheets.length > 1 && !selectedSheet) {
      return {
        ok: true,
        file: { headers: [], rows: [], sampleRows: [], rowCount: 0, availableSheets, sheetName: undefined },
      };
    }
    return {
      ok: false,
      error: "no_headers",
      diagnostic: availableSheets.length > 0
        ? `Sheets found: [${availableSheets.join(", ")}] but no header row identified in "${selected.sheetName}"`
        : "No sheets or headers found in workbook",
    };
  }
  if (looksLikeDataHeader(selected.headers)) {
    const headerless = remapHeaderlessRows(selected.headers, selected.rows);
    if (headerless.rows.length > MAX_ROWS) return { ok: false, error: "too_many_rows", detail: String(MAX_ROWS) };
    return {
      ok: true,
      file: {
        headers: headerless.headers,
        rows: headerless.rows,
        sampleRows: headerless.rows.slice(0, SAMPLE_ROWS),
        rowCount: headerless.rows.length,
        sheetName: selected.sheetName,
        availableSheets: availableSheets.length > 1 ? availableSheets : undefined,
        diagnostics: [{ code: "generated_headers", count: headerless.headers.length }],
      },
    };
  }
  if (selected.rows.length === 0) {
    return {
      ok: false,
      error: "no_data",
      diagnostic: `Sheet "${selected.sheetName}": ${selected.headers.length} headers detected but no data rows below header row`,
    };
  }
  if (selected.rows.length > MAX_ROWS) return { ok: false, error: "too_many_rows", detail: String(MAX_ROWS) };

  return {
    ok: true,
    file: {
      headers: selected.headers,
      rows: selected.rows,
      sampleRows: selected.rows.slice(0, SAMPLE_ROWS),
      rowCount: selected.rows.length,
      sheetName: selected.sheetName,
      availableSheets: availableSheets.length > 1 ? availableSheets : undefined,
    },
  };
}
