import { describe, expect, it } from "vitest";
import type { ColumnMapping } from "./import-session.types";
import { validateMappings } from "./mapping";
import {
  getMappingIssues,
  issueColumns,
  mappingIssueErrorCodes,
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
  it("lists each duplicate field and names its columns", () => {
    const issues = getMappingIssues(LEUMI_HAND_BUILT);
    expect(mappingIssueErrorCodes(issues)).toEqual(["duplicateTarget"]);
    expect(issues).toEqual([
      {
        code: "duplicateTarget",
        field: "date",
        columns: ["תאריך", "תאריך ערך"],
      },
    ]);
    expect(issueColumns(issues)).toEqual(new Set(["תאריך", "תאריך ערך"]));
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

  it("reports amount + debit/credit conflict with columns", () => {
    const issues = getMappingIssues([
      map("תאריך", "date"),
      map("סכום", "amount"),
      map("חיוב", "debit"),
    ]);
    expect(issues).toContainEqual({
      code: "amountAndDebitCredit",
      columns: ["סכום", "חיוב"],
    });
  });

  it("stays in parity with validateMappings across fixtures", () => {
    for (const mappings of FIXTURES) {
      const issues = getMappingIssues(mappings);
      const validation = validateMappings(mappings);
      expect(issues.length === 0).toBe(validation.valid);
    }
  });
});
