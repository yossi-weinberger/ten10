/**
 * Script to check for unsafe Supabase client imports in Edge Functions
 * Ensures all imports use specific versions (not @2 or @latest)
 *
 * Usage: node scripts/check-supabase-imports.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FUNCTIONS_DIR = path.join(__dirname, "..", "supabase", "functions");
const SAFE_IMPORT = "npm:@supabase/supabase-js@2.116.0";
const SUPABASE_IMPORT_PATTERN =
  /from\s+["']([^"']*@supabase\/supabase-js[^"']*)["']/g;

function findTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and other common dirs
      if (!file.startsWith(".") && file !== "node_modules") {
        findTsFiles(filePath, fileList);
      }
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const issues = [];
  let match;

  while ((match = SUPABASE_IMPORT_PATTERN.exec(content)) !== null) {
    const importSpecifier = match[1];
    if (importSpecifier !== SAFE_IMPORT) {
      const lineNumber = content.substring(0, match.index).split("\n").length;
      issues.push({
        file: path.relative(process.cwd(), filePath),
        line: lineNumber,
        match: importSpecifier,
        issue: `Expected the pinned Edge import ${SAFE_IMPORT}`,
      });
    }
  }

  return issues;
}

function main() {
  console.log("Checking Supabase client imports in Edge Functions...\n");

  if (!fs.existsSync(FUNCTIONS_DIR)) {
    console.error(`Functions directory not found: ${FUNCTIONS_DIR}`);
    process.exit(1);
  }

  const files = findTsFiles(FUNCTIONS_DIR);
  const allIssues = [];

  files.forEach((file) => {
    const issues = checkFile(file);
    allIssues.push(...issues);
  });

  if (allIssues.length === 0) {
    console.log("✅ All Supabase imports use the pinned npm specifier!");
    console.log(`   Current safe import: ${SAFE_IMPORT}\n`);
    process.exit(0);
  }

  console.log(`❌ Found ${allIssues.length} unsafe import(s):\n`);
  allIssues.forEach((issue) => {
    console.log(`   ${issue.file}:${issue.line}`);
    console.log(`   Issue: ${issue.issue}`);
    console.log(`   Found: ${issue.match}`);
    console.log(`   Fix: Replace with ${SAFE_IMPORT}\n`);
  });

  console.log("\n💡 Always use the pinned npm specifier in Edge Functions:");
  console.log(`   ✅ ${SAFE_IMPORT}`);
  console.log(`   ❌ @supabase/supabase-js@2`);
  console.log(`   ❌ @supabase/supabase-js@latest`);
  console.log(
    `\nWhen updating, change the package dependency, Edge imports, and SAFE_IMPORT together.\n`,
  );

  process.exit(1);
}

main();
