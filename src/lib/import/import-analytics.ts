/**
 * Coarse, content-free helpers for transaction-import analytics.
 * Never pass file names, headers, cell values, or amounts into these events.
 */

export type ImportFileExtension = "csv" | "xlsx" | "xls" | "other";

export type ImportRowCountBucket =
  | "0"
  | "1-10"
  | "11-50"
  | "51-200"
  | "201-1000"
  | "1001+";

export function extensionFromFileName(fileName: string): ImportFileExtension {
  const ext = fileName.includes(".")
    ? fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase()
    : "";
  switch (ext) {
    case "csv":
      return "csv";
    case "xlsx":
      return "xlsx";
    case "xls":
      return "xls";
    default:
      return "other";
  }
}

export function rowCountBucket(rowCount: number): ImportRowCountBucket {
  if (rowCount <= 0) return "0";
  if (rowCount <= 10) return "1-10";
  if (rowCount <= 50) return "11-50";
  if (rowCount <= 200) return "51-200";
  if (rowCount <= 1000) return "201-1000";
  return "1001+";
}
