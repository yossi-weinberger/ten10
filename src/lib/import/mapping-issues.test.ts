import { describe, expect, it } from "vitest";
import type { ColumnMapping } from "./import-session.types";
import { validateMappings } from "./mapping";
import {
  HEADER_DISPLAY_MAX,
  MAPPING_MESSAGE_MAX_LEN,
  MAX_STORED_ISSUE_COLUMNS,
  buildDuplicateInlineOtherByColumn,
  formatDuplicateColumnsSummary,
  getMappingIssues,
  issueColumns,
  mappingIssueErrorCodes,
  truncateHeader,
} from "./mapping-issues";

function map(
  sourceColumn: string,
  targetField: ColumnMapping["targetField"]
): ColumnMapping {
  return { sourceColumn, targetField };
}

/** Hand-built Leumi-like duplicate date mapping (not matcher output). */
const LEUMI_HAND_BUILT: ColumnMapping[] = [
  map("תאריך", "date"),
  map("תאריך ערך", "date"),
  map("סכום", "amount"),
  map("תיאור", "description"),
  map("יתרה", null),
];

const FIXTURES: ColumnMapping[][] = [
  [],
  [map("date", "date"), map("amount", "amount")],
  LEUMI_HAND_BUILT,
  [
    map("תאריך", "date"),
    map("סכום", "amount"),
    map("חיוב", "debit"),
  ],
  [map("תיאור", "description")],
  [
    map("a", "date"),
    map("b", "date"),
    map("c", "amount"),
    map("d", "amount"),
  ],
  [
    map("d1", "description"),
    map("d2", "description"),
    map("date", "date"),
    map("amount", "amount"),
  ],
];

describe("getMappingIssues", () => {
  it("lists each duplicate field with capped truncated samples and indexes", () => {
    const issues = getMappingIssues(LEUMI_HAND_BUILT);
    expect(mappingIssueErrorCodes(issues)).toEqual(["duplicateTarget"]);
    expect(issues).toEqual([
      {
        code: "duplicateTarget",
        field: "date",
        columns: ["תאריך", "תאריך ערך"],
        totalCount: 2,
        mappingIndexes: [0, 1],
      },
    ]);
    expect(issueColumns(issues, LEUMI_HAND_BUILT)).toEqual(
      new Set(["תאריך", "תאריך ערך"])
    );
  });

  it("exempts description from duplicate targets", () => {
    const issues = getMappingIssues([
      map("d1", "description"),
      map("d2", "description"),
      map("date", "date"),
      map("amount", "amount"),
    ]);
    expect(issues).toEqual([]);
  });

  it("reports missing date and amount", () => {
    const issues = getMappingIssues([map("note", "description")]);
    expect(mappingIssueErrorCodes(issues).sort()).toEqual([
      "amountMissing",
      "dateMissing",
    ]);
  });

  it("reports amount + debit/credit conflict with capped columns", () => {
    const mappings = [
      map("תאריך", "date"),
      map("סכום", "amount"),
      map("חיוב", "debit"),
    ];
    const issues = getMappingIssues(mappings);
    expect(issues).toContainEqual({
      code: "amountAndDebitCredit",
      columns: ["סכום", "חיוב"],
      totalCount: 2,
      mappingIndexes: [1, 2],
    });
  });

  it("stays in parity with validateMappings across fixtures", () => {
    for (const mappings of FIXTURES) {
      const issues = getMappingIssues(mappings);
      const validation = validateMappings(mappings);
      expect(issues.length === 0).toBe(validation.valid);
    }
  });

  it("keeps duplicate messages bounded with 1000 long headers", () => {
    const longHeader = "H".repeat(4000);
    const mappings: ColumnMapping[] = [];
    for (let i = 0; i < 1000; i++) {
      mappings.push(map(`${longHeader}_${i}`, "date"));
    }
    mappings.push(map("amount_col", "amount"));

    const issues = getMappingIssues(mappings);
    const dup = issues.find((issue) => issue.code === "duplicateTarget");
    expect(dup).toBeDefined();
    if (!dup || dup.code !== "duplicateTarget") throw new Error("expected duplicate");

    expect(dup.totalCount).toBe(1000);
    expect(dup.mappingIndexes).toHaveLength(1000);
    expect(dup.columns.length).toBeLessThanOrEqual(MAX_STORED_ISSUE_COLUMNS);
    for (const sample of dup.columns) {
      expect(sample.length).toBeLessThanOrEqual(HEADER_DISPLAY_MAX);
    }

    const formatMore = (other: string, count: number) => `${other} +${count}`;
    const others = buildDuplicateInlineOtherByColumn(dup, mappings, formatMore);
    expect(others.size).toBe(1000);

    const field = "date";
    for (const [column, other] of others) {
      expect(other.length).toBeLessThan(MAPPING_MESSAGE_MAX_LEN);
      const message = `גם ${other} מסומנת כ${field}. השאירו אחת, ובשנייה בחרו "לא לייבא".`;
      expect(message.length).toBeLessThan(MAPPING_MESSAGE_MAX_LEN);
      // Never embed the raw 4000-char header in the message text.
      expect(message.includes(longHeader)).toBe(false);
      expect(column.startsWith(longHeader)).toBe(true);
    }

    const summaryColumns = formatDuplicateColumnsSummary(dup, formatMore);
    expect(summaryColumns.length).toBeLessThan(MAPPING_MESSAGE_MAX_LEN);
    expect(summaryColumns.includes(longHeader)).toBe(false);
    expect(summaryColumns).toContain("+998");
  });
});

describe("truncateHeader", () => {
  it("leaves short names alone and ellipsizes long ones at 40", () => {
    expect(truncateHeader("תאריך")).toBe("תאריך");
    const long = "x".repeat(50);
    expect(truncateHeader(long)).toBe(`${"x".repeat(39)}…`);
    expect(truncateHeader(long).length).toBe(HEADER_DISPLAY_MAX);
  });
});
