import type {
  ColumnMapping,
  ImportTargetField,
} from "./import-session.types";
import { validateMappings } from "./mapping";

/**
 * Wizard-layer mapping issues. Mirrors validateMappings without editing mapping.ts.
 * Parity rule: getMappingIssues(m).length === 0 ⇔ validateMappings(m).valid
 *
 * Display payloads stay linear and bounded: stored header samples are truncated and
 * capped; full conflict membership uses mapping indexes (ints), not full strings.
 */
export const HEADER_DISPLAY_MAX = 40;
/** Max truncated header samples kept on an issue for summaries. */
export const MAX_STORED_ISSUE_COLUMNS = 4;
/** Soft upper bound for any single UI/error string we build from headers. */
export const MAPPING_MESSAGE_MAX_LEN = 160;

export type MappingIssue =
  | { code: "dateMissing" }
  | { code: "amountMissing" }
  | {
      code: "duplicateTarget";
      field: ImportTargetField;
      /** Truncated, capped samples for summaries. */
      columns: string[];
      totalCount: number;
      /** Indexes into the mappings array for every conflicting column. */
      mappingIndexes: number[];
    }
  | {
      code: "amountAndDebitCredit";
      columns: string[];
      totalCount: number;
      mappingIndexes: number[];
    };

export function truncateHeader(
  name: string,
  max: number = HEADER_DISPLAY_MAX
): string {
  if (name.length <= max) return name;
  return `${name.slice(0, Math.max(0, max - 1))}…`;
}

export function getMappingIssues(mappings: ColumnMapping[]): MappingIssue[] {
  const validation = validateMappings(mappings);
  if (validation.valid) return [];

  const issues: MappingIssue[] = [];

  for (const code of validation.errors) {
    switch (code) {
      case "dateMissing":
        issues.push({ code: "dateMissing" });
        break;
      case "amountMissing":
        issues.push({ code: "amountMissing" });
        break;
      case "duplicateTarget":
        issues.push(...duplicateTargetIssues(mappings));
        break;
      case "amountAndDebitCredit": {
        const mappingIndexes: number[] = [];
        for (let i = 0; i < mappings.length; i++) {
          const field = mappings[i]!.targetField;
          if (field === "amount" || field === "debit" || field === "credit") {
            mappingIndexes.push(i);
          }
        }
        issues.push(columnIssue("amountAndDebitCredit", mappings, mappingIndexes));
        break;
      }
      default: {
        const _exhaustive: never = code;
        void _exhaustive;
        break;
      }
    }
  }

  return issues;
}

function duplicateTargetIssues(
  mappings: ColumnMapping[]
): Array<Extract<MappingIssue, { code: "duplicateTarget" }>> {
  const byField = new Map<ImportTargetField, number[]>();
  for (let i = 0; i < mappings.length; i++) {
    const mapping = mappings[i]!;
    if (!mapping.targetField || mapping.targetField === "description") continue;
    const list = byField.get(mapping.targetField) ?? [];
    list.push(i);
    byField.set(mapping.targetField, list);
  }

  const issues: Array<Extract<MappingIssue, { code: "duplicateTarget" }>> = [];
  for (const [field, mappingIndexes] of byField) {
    if (mappingIndexes.length < 2) continue;
    const base = columnIssue("duplicateTarget", mappings, mappingIndexes);
    issues.push({ ...base, field });
  }
  return issues;
}

function columnIssue<C extends "duplicateTarget" | "amountAndDebitCredit">(
  code: C,
  mappings: ColumnMapping[],
  mappingIndexes: number[]
): {
  code: C;
  columns: string[];
  totalCount: number;
  mappingIndexes: number[];
} {
  const columns: string[] = [];
  for (let i = 0; i < mappingIndexes.length && columns.length < MAX_STORED_ISSUE_COLUMNS; i++) {
    const name = mappings[mappingIndexes[i]!]!.sourceColumn;
    columns.push(truncateHeader(name));
  }
  return {
    code,
    columns,
    totalCount: mappingIndexes.length,
    mappingIndexes,
  };
}

export function issueColumns(
  issues: MappingIssue[],
  mappings: ColumnMapping[]
): Set<string> {
  const columns = new Set<string>();
  for (const issue of issues) {
    if (issue.code !== "duplicateTarget" && issue.code !== "amountAndDebitCredit") {
      continue;
    }
    for (const idx of issue.mappingIndexes) {
      const name = mappings[idx]?.sourceColumn;
      if (name) columns.add(name);
    }
  }
  return columns;
}

type ColumnConflictIssue = Extract<
  MappingIssue,
  { code: "duplicateTarget" | "amountAndDebitCredit" }
>;

/**
 * Linear conflict "other" label for one group.
 * Built once: primary/secondary truncated samples + remaining count.
 */
export function conflictGroupOtherParts(issue: {
  columns: string[];
  totalCount: number;
}): {
  primary: string;
  secondary: string;
  moreCount: number;
} {
  const primary = issue.columns[0] ?? "";
  const secondary = issue.columns[1] ?? primary;
  const moreCount = Math.max(0, issue.totalCount - 2);
  return { primary, secondary, moreCount };
}

/** Summary `columns` value: at most two truncated names, plus +N when needed. */
export function formatDuplicateColumnsSummary(
  issue: Extract<MappingIssue, { code: "duplicateTarget" }>,
  formatMore: (other: string, count: number) => string
): string {
  const { primary, secondary, moreCount } = conflictGroupOtherParts(issue);
  if (!primary) return "";
  if (!issue.columns[1]) return primary;
  const pair = `${primary}, ${secondary}`;
  return moreCount > 0 ? formatMore(pair, moreCount) : pair;
}

/**
 * Build per-column inline "other" strings for a conflict group (O(n), bounded length).
 * Does not filter/join the full header list inside the loop.
 * Each column names at most one other sample, plus +N when there are more.
 */
export function buildConflictInlineOtherByColumn(
  issue: ColumnConflictIssue,
  mappings: ColumnMapping[],
  formatMore: (other: string, count: number) => string
): Map<string, string> {
  const { primary, secondary, moreCount } = conflictGroupOtherParts(issue);
  const withMore = (other: string) =>
    moreCount > 0 ? formatMore(other, moreCount) : other;
  const otherForFirst = withMore(secondary);
  const otherForRest = withMore(primary);

  const result = new Map<string, string>();
  for (let i = 0; i < issue.mappingIndexes.length; i++) {
    const name = mappings[issue.mappingIndexes[i]!]!.sourceColumn;
    result.set(name, i === 0 ? otherForFirst : otherForRest);
  }
  return result;
}

export function mappingIssueErrorCodes(issues: MappingIssue[]): string[] {
  return [...new Set(issues.map((issue) => issue.code))];
}

export function hasAmountDebitCreditIssue(issues: MappingIssue[]): boolean {
  return issues.some((issue) => issue.code === "amountAndDebitCredit");
}
