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
const UNSAFE_PATTERNS = [
  /@supabase\/supabase-js@2["']/g, // @2 without specific version
  /@supabase\/supabase-js@latest["']/g, // @latest
  /@supabase\/supabase-js@\^/g, // @^ (caret range)
  /@supabase\/supabase-js@~/g, // @~ (tilde range)
];

const SAFE_VERSION = "@supabase/supabase-js@2.39.0";

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

  UNSAFE_PATTERNS.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        const lineNumber = content
          .substring(0, content.indexOf(match))
          .split("\n").length;
        issues.push({
          file: path.relative(process.cwd(), filePath),
          line: lineNumber,
          match: match,
          issue: getIssueDescription(index),
        });
      });
    }
  });

  return issues;
}

function getIssueDescription(index) {
  const descriptions = [
    "Using @2 without specific version - will break when esm.sh updates",
    "Using @latest - will break when esm.sh updates",
    "Using @^ (caret range) - not supported in esm.sh URLs",
    "Using @~ (tilde range) - not supported in esm.sh URLs",
  ];
  return descriptions[index] || "Unsafe version pattern";
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
    console.log("✅ All Supabase imports use specific versions!");
    console.log(`   Current safe version: ${SAFE_VERSION}\n`);
    process.exit(0);
  }

  console.log(`❌ Found ${allIssues.length} unsafe import(s):\n`);
  allIssues.forEach((issue) => {
    console.log(`   ${issue.file}:${issue.line}`);
    console.log(`   Issue: ${issue.issue}`);
    console.log(`   Found: ${issue.match}`);
    console.log(`   Fix: Replace with ${SAFE_VERSION}\n`);
  });

  console.log("\n💡 Tip: Always use specific versions in Edge Functions:");
  console.log(`   ✅ ${SAFE_VERSION}`);
  console.log(`   ❌ @supabase/supabase-js@2`);
  console.log(`   ❌ @supabase/supabase-js@latest`);
  console.log(
    `\nTo check for newer versions, visit: https://www.npmjs.com/package/@supabase/supabase-js`,
  );
  console.log(
    `If you update the version, remember to update SAFE_VERSION in this script.\n`,
  );

  process.exit(1);
}

main();
