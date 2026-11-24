/** Max `<table` openings allowed in an HTML-disguised spreadsheet before we refuse. */
export const MAX_HTML_TABLE_OPENS = 32;

/**
 * Linear scan that rejects pathological HTML-as-.xls payloads which would
 * otherwise stress the HTML table extractor. Returns true when the file looks safe enough to parse.
 */
export function htmlXlsLooksBounded(text: string, maxTables = MAX_HTML_TABLE_OPENS): boolean {
  const lower = text.toLowerCase();
  let opens = 0;
  let index = 0;
  while (opens <= maxTables) {
    const next = lower.indexOf("<table", index);
    if (next === -1) return true;
    opens += 1;
    index = next + 6;
  }
  return false;
}

export function shouldApplyHtmlXlsGuard(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".xls");
}
