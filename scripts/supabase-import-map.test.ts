import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const FUNCTIONS_DIR = "supabase/functions";
const DENO_JSON_PATH = "supabase/functions/deno.json";
const CONFIG_TOML_PATH = "supabase/config.toml";
const DEPLOY_SCRIPT_PATH = "supabase/scripts/deploy-changed-functions.sh";
const EXPECTED_IMPORT_MAP = "./functions/deno.json";

const SELF_RESOLVING_PREFIXES = ["npm:", "jsr:", "https://", "node:"] as const;

function readDenoImportKeys(): Set<string> {
  const parsed = JSON.parse(readFileSync(DENO_JSON_PATH, "utf8")) as {
    imports?: Record<string, string>;
  };
  return new Set(Object.keys(parsed.imports ?? {}));
}

function parseFunctionImportMaps(tomlText: string): Map<string, string> {
  const result = new Map<string, string>();
  let currentFunction: string | null = null;

  for (const rawLine of tomlText.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;

    const sectionMatch = /^\[([^\]]+)\]$/.exec(line);
    if (sectionMatch) {
      const section = sectionMatch[1].trim();
      currentFunction = section.startsWith("functions.")
        ? section.slice("functions.".length)
        : null;
      continue;
    }

    if (currentFunction) {
      const importMapMatch = /^import_map\s*=\s*"([^"]+)"$/.exec(line);
      if (importMapMatch) {
        result.set(currentFunction, importMapMatch[1]);
      }
    }
  }

  return result;
}

function parseBashArray(scriptText: string, arrayName: string): string[] {
  const regex = new RegExp(`${arrayName}=\\(([\\s\\S]*?)\\)`, "m");
  const match = regex.exec(scriptText);
  if (!match) return [];
  return match[1]
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, "").trim())
    .filter((line) => line.length > 0);
}

function resolveRelativeImport(fromFile: string, specifier: string): string {
  const base = resolve(dirname(fromFile), specifier);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }
  throw new Error(`Unresolved relative import "${specifier}" in ${fromFile}`);
}

function extractModuleSpecifiers(filePath: string): string[] {
  const source = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const specifiers: string[] = [];

  function visit(node: ts.Node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

function collectTransitiveExternalSpecifiers(entryPath: string): string[] {
  const visited = new Set<string>();
  const externals = new Set<string>();
  const stack = [resolve(entryPath)];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const specifier of extractModuleSpecifiers(current)) {
      if (specifier.startsWith(".")) {
        stack.push(resolveRelativeImport(current, specifier));
      } else {
        externals.add(specifier);
      }
    }
  }

  return [...externals].sort();
}

function matchesImportKey(specifier: string, importKeys: Set<string>): boolean {
  if (importKeys.has(specifier)) return true;
  for (const key of importKeys) {
    if (key.endsWith("/") && specifier.startsWith(key)) return true;
  }
  return false;
}

function isSelfResolvingSpecifier(specifier: string): boolean {
  return SELF_RESOLVING_PREFIXES.some((prefix) => specifier.startsWith(prefix));
}

describe("Supabase Edge Function import_map & deployment configuration", () => {
  const functionDirs = readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .sort();

  const denoImportKeys = readDenoImportKeys();
  const configuredImportMaps = parseFunctionImportMaps(
    readFileSync(CONFIG_TOML_PATH, "utf8"),
  );
  const deployScript = readFileSync(DEPLOY_SCRIPT_PATH, "utf8");

  it("configures import_map in supabase/config.toml for every function transitively using deno.json imports", () => {
    const missingImportMap: string[] = [];
    const unmappedBareSpecifiers: string[] = [];

    for (const fnName of functionDirs) {
      const entry = join(FUNCTIONS_DIR, fnName, "index.ts");
      expect(existsSync(entry), `Missing entrypoint ${entry}`).toBe(true);

      const externals = collectTransitiveExternalSpecifiers(entry);
      const mappedUsed = externals.filter((spec) =>
        matchesImportKey(spec, denoImportKeys),
      );
      const unmapped = externals.filter(
        (spec) =>
          !matchesImportKey(spec, denoImportKeys) &&
          !isSelfResolvingSpecifier(spec),
      );

      if (mappedUsed.length > 0) {
        const actualMap = configuredImportMaps.get(fnName);
        if (actualMap !== EXPECTED_IMPORT_MAP) {
          missingImportMap.push(
            `${fnName} (imports ${mappedUsed.join(", ")}, got import_map=${String(actualMap)})`,
          );
        }
      }

      for (const spec of unmapped) {
        unmappedBareSpecifiers.push(`${fnName} -> ${spec}`);
      }
    }

    expect(unmappedBareSpecifiers).toEqual([]);
    expect(missingImportMap).toEqual([]);
  });

  it("keeps ALL_FUNCTIONS and deno.json triggers aligned in deploy-changed-functions.sh", () => {
    const allFunctions = parseBashArray(deployScript, "ALL_FUNCTIONS").sort();
    expect(allFunctions).toEqual(functionDirs);
    expect(deployScript).toContain("supabase/functions/deno.json");
  });
});
