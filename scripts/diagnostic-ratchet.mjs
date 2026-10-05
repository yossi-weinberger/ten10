import { readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import ts from "typescript";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = resolve(
  repositoryRoot,
  "scripts/quality-diagnostic-baseline.json",
);
const eslintTargets = [
  "src",
  "supabase/functions",
  "vite.config.ts",
  "vitest.config.ts",
];

function normalizePath(filePath) {
  return relative(repositoryRoot, filePath).split(sep).join("/");
}

function normalizeMessage(message) {
  const repositoryPathVariants = [
    repositoryRoot,
    repositoryRoot.replaceAll("\\", "/"),
    repositoryRoot.replaceAll("/", "\\"),
  ];
  let normalized = message;

  for (const repositoryPath of repositoryPathVariants) {
    normalized = normalized.replaceAll(repositoryPath, "<repo>");
  }

  return normalized
    .replace(/\s+<repo>[\\/].*$/s, "")
    .replace(/\s+/g, " ")
    .trim();
}

function aggregateDiagnostics(diagnostics) {
  const aggregated = new Map();

  for (const diagnostic of diagnostics) {
    const key = [
      diagnostic.file,
      diagnostic.severity,
      diagnostic.code,
      diagnostic.message,
    ].join("|");
    const existing = aggregated.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      aggregated.set(key, { ...diagnostic, count: 1 });
    }
  }

  return [...aggregated.values()].sort((left, right) => {
    const leftKey = `${left.file}|${left.severity}|${left.code}|${left.message}`;
    const rightKey = `${right.file}|${right.severity}|${right.code}|${right.message}`;
    return leftKey.localeCompare(rightKey);
  });
}

function summarize(diagnostics) {
  const categories = {};
  const severities = {};
  let total = 0;

  for (const diagnostic of diagnostics) {
    categories[diagnostic.code] =
      (categories[diagnostic.code] ?? 0) + diagnostic.count;
    severities[diagnostic.severity] =
      (severities[diagnostic.severity] ?? 0) + diagnostic.count;
    total += diagnostic.count;
  }

  return {
    categories: Object.fromEntries(
      Object.entries(categories).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    diagnostics,
    severities: Object.fromEntries(
      Object.entries(severities).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    total,
  };
}

function collectTypeScriptDiagnostics() {
  const configPath = resolve(repositoryRoot, "tsconfig.app.json");
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const configDiagnostics = configFile.error ? [configFile.error] : [];
  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config ?? {},
    ts.sys,
    repositoryRoot,
    undefined,
    configPath,
  );
  const program = ts.createProgram({
    options: parsedConfig.options,
    projectReferences: parsedConfig.projectReferences,
    rootNames: parsedConfig.fileNames,
  });
  const diagnostics = [
    ...configDiagnostics,
    ...parsedConfig.errors,
    ...ts.getPreEmitDiagnostics(program),
  ];

  return aggregateDiagnostics(
    diagnostics.map((diagnostic) => ({
      code: `TS${diagnostic.code}`,
      file: diagnostic.file
        ? normalizePath(diagnostic.file.fileName)
        : "<config>",
      message: normalizeMessage(
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
      ),
      severity: ts.DiagnosticCategory[diagnostic.category].toLowerCase(),
    })),
  );
}

async function collectEslintDiagnostics() {
  const eslint = new ESLint({ cwd: repositoryRoot });
  const results = await eslint.lintFiles(eslintTargets);

  return aggregateDiagnostics(
    results.flatMap((result) =>
      result.messages.map((message) => ({
        code: message.ruleId ?? (message.fatal ? "fatal" : "unknown"),
        file: normalizePath(result.filePath),
        message: normalizeMessage(message.message),
        severity: message.severity === 2 ? "error" : "warning",
      })),
    ),
  );
}

function readBaseline() {
  return JSON.parse(readFileSync(baselinePath, "utf8"));
}

function diagnosticKey(diagnostic) {
  return [
    diagnostic.file,
    diagnostic.severity,
    diagnostic.code,
    diagnostic.message,
  ].join("|");
}

function compareDiagnostics(expected, actual) {
  const expectedCounts = new Map(
    expected.map((diagnostic) => [diagnosticKey(diagnostic), diagnostic.count]),
  );
  const actualCounts = new Map(
    actual.map((diagnostic) => [diagnosticKey(diagnostic), diagnostic.count]),
  );
  const additions = [];
  const removals = [];

  for (const diagnostic of actual) {
    const difference =
      diagnostic.count - (expectedCounts.get(diagnosticKey(diagnostic)) ?? 0);
    if (difference > 0) additions.push({ ...diagnostic, count: difference });
  }

  for (const diagnostic of expected) {
    const difference =
      diagnostic.count - (actualCounts.get(diagnosticKey(diagnostic)) ?? 0);
    if (difference > 0) removals.push({ ...diagnostic, count: difference });
  }

  return { additions, removals };
}

function printDiagnostics(label, diagnostics) {
  console.log(`${label}: ${diagnostics.length}`);
  for (const diagnostic of diagnostics) {
    console.log(
      `  ${diagnostic.count}x ${diagnostic.file} [${diagnostic.severity} ${diagnostic.code}] ${diagnostic.message}`,
    );
  }
}

function updateBaseline(scope, command, summary) {
  let baseline;

  try {
    baseline = readBaseline();
  } catch {
    baseline = { scopes: {}, version: 1 };
  }

  baseline.scopes[scope] = { command, ...summary };
  const orderedScopes = Object.fromEntries(
    Object.entries(baseline.scopes).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );

  writeFileSync(
    baselinePath,
    `${JSON.stringify({ ...baseline, scopes: orderedScopes }, null, 2)}\n`,
    "utf8",
  );
  console.log(`Updated ${scope} baseline with ${summary.total} diagnostics.`);
}

async function main() {
  const scopeArgument = process.argv[2];
  const shouldUpdate = process.argv.includes("--update");
  let scope;
  let command;
  let diagnostics;

  switch (scopeArgument) {
    case "typecheck":
      scope = "typecheck:app";
      command = "tsc -p tsconfig.app.json --noEmit --pretty false";
      diagnostics = collectTypeScriptDiagnostics();
      break;
    case "lint":
      scope = "eslint";
      command =
        "eslint src supabase/functions vite.config.ts vitest.config.ts";
      diagnostics = await collectEslintDiagnostics();
      break;
    default:
      throw new Error("Usage: diagnostic-ratchet.mjs <typecheck|lint> [--update]");
  }

  const summary = summarize(diagnostics);

  if (shouldUpdate) {
    updateBaseline(scope, command, summary);
    return;
  }

  const baseline = readBaseline();
  const expected = baseline.scopes[scope];

  if (!expected) {
    throw new Error(`Missing diagnostic baseline for ${scope}`);
  }

  const { additions, removals } = compareDiagnostics(
    expected.diagnostics,
    diagnostics,
  );

  console.log(
    `${scope}: ${summary.total} current diagnostics; ${expected.total} legacy baseline diagnostics.`,
  );
  console.log(
    `Legacy debt remains ratcheted by ${Object.keys(summary.categories).length} categories.`,
  );
  printDiagnostics("Additions", additions);
  printDiagnostics("Removals", removals);

  if (additions.length > 0 || removals.length > 0) {
    console.error(
      "Diagnostic baseline drifted. Review the changes and run npm run diagnostics:update only when the new baseline is intentional.",
    );
    process.exitCode = 1;
  } else {
    console.log("Diagnostic baseline is unchanged.");
  }
}

await main();
