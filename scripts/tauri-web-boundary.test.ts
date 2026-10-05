import {
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

function collectProductionSources(
  directory: string,
  sources: string[] = [],
): string[] {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      collectProductionSources(path, sources);
    } else if (
      /\.(ts|tsx)$/.test(entry) &&
      !entry.includes(".test.") &&
      !entry.includes(".spec.")
    ) {
      sources.push(path);
    }
  }
  return sources;
}

describe("web Tauri import boundary", () => {
  it("keeps Tauri package imports lazy in production source", () => {
    const offenders = collectProductionSources("src").flatMap((path) => {
      const source = readFileSync(path, "utf8");
      const sourceFile = ts.createSourceFile(
        path,
        source,
        ts.ScriptTarget.Latest,
        true,
      );
      const hasStaticTauriImport = sourceFile.statements.some(
        (statement) =>
          ts.isImportDeclaration(statement) &&
          ts.isStringLiteral(statement.moduleSpecifier) &&
          statement.moduleSpecifier.text.startsWith("@tauri-apps/"),
      );
      return hasStaticTauriImport ? [relative(".", path)] : [];
    });

    expect(offenders).toEqual([]);
  });
});
