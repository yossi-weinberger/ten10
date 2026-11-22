import { describe, expect, it } from "vitest";
import { extensionFromFileName, rowCountBucket } from "./import-analytics";

describe("extensionFromFileName", () => {
  it("returns coarse extensions without keeping the file name", () => {
    expect(extensionFromFileName("bank-export-secret.csv")).toBe("csv");
    expect(extensionFromFileName("Statement.XLSX")).toBe("xlsx");
    expect(extensionFromFileName("old.xls")).toBe("xls");
    expect(extensionFromFileName("notes.txt")).toBe("other");
  });
});

describe("rowCountBucket", () => {
  it("buckets row counts coarsely", () => {
    expect(rowCountBucket(0)).toBe("0");
    expect(rowCountBucket(3)).toBe("1-10");
    expect(rowCountBucket(40)).toBe("11-50");
    expect(rowCountBucket(120)).toBe("51-200");
    expect(rowCountBucket(500)).toBe("201-1000");
    expect(rowCountBucket(2500)).toBe("1001+");
  });
});
