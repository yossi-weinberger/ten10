import type {
  ColumnMapping,
  ImportTargetField,
} from "./import-session.types";
import { validateMappings } from "./mapping";

/**
 * Wizard-layer mapping issues. Mirrors validateMappings without editing mapping.ts.
 * Parity rule: getMappingIssues(m).length === 0 ⇔ validateMappings(m).valid
 */
export type MappingIssue =
  | { code: "dateMissing" }
  | { code: "amountMissing" }
  | { code: "duplicateTarget"; field: ImportTargetField; columns: string[] }
  | { code: "amountAndDebitCredit"; columns: string[] };

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
        const columns = mappings
          .filter(
            (m) =>
              m.targetField === "amount" ||
              m.targetField === "debit" ||
              m.targetField === "credit"
          )
          .map((m) => m.sourceColumn);
        issues.push({ code: "amountAndDebitCredit", columns });
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
  const byField = new Map<ImportTargetField, string[]>();
  for (const mapping of mappings) {
    if (!mapping.targetField || mapping.targetField === "description") continue;
    const list = byField.get(mapping.targetField) ?? [];
    list.push(mapping.sourceColumn);
    byField.set(mapping.targetField, list);
  }

  const issues: Array<Extract<MappingIssue, { code: "duplicateTarget" }>> = [];
  for (const [field, columns] of byField) {
    if (columns.length < 2) continue;
    issues.push({ code: "duplicateTarget", field, columns });
  }
  return issues;
}

export function issueColumns(issues: MappingIssue[]): Set<string> {
  const columns = new Set<string>();
  for (const issue of issues) {
    if (issue.code === "duplicateTarget" || issue.code === "amountAndDebitCredit") {
      for (const column of issue.columns) columns.add(column);
    }
  }
  return columns;
}

export function mappingIssueErrorCodes(issues: MappingIssue[]): string[] {
  return [...new Set(issues.map((issue) => issue.code))];
}

export function hasAmountDebitCreditIssue(issues: MappingIssue[]): boolean {
  return issues.some((issue) => issue.code === "amountAndDebitCredit");
}
