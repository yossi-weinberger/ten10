#!/usr/bin/env node

/**
 * Find Console Usage Script
 *
 * This script finds all console.* usage in the codebase
 * and generates a report for migration to the logger utility.
 *
 * Usage:
 *   node scripts/find-console-usage.js
 */

const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "..", "src");
const CONSOLE_REGEX =
  /console\.(log|error|warn|info|debug|table|group|groupEnd|time|timeEnd)/g;

const results = {
  totalFiles: 0,
  totalConsoleUsage: 0,
  fileDetails: [],
};

function walkDir(dir) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== "dist" && file !== "build") {
        walkDir(filePath);
      }
    } else if (
      file.endsWith(".ts") ||
      file.endsWith(".tsx") ||
      file.endsWith(".js") ||
      file.endsWith(".jsx")
    ) {
      processFile(filePath);
    }
  });
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const matches = content.match(CONSOLE_REGEX);

  if (matches && matches.length > 0) {
    const relativePath = path.relative(process.cwd(), filePath);

    // Count occurrences by line
    const lines = content.split("\n");
    const lineNumbers = [];

    lines.forEach((line, index) => {
      if (CONSOLE_REGEX.test(line)) {
        lineNumbers.push(index + 1);
      }
      // Reset regex lastIndex
      CONSOLE_REGEX.lastIndex = 0;
    });

    results.fileDetails.push({
      file: relativePath,
      count: matches.length,
      lines: lineNumbers,
    });

    results.totalFiles++;
    results.totalConsoleUsage += matches.length;
  }
}

// Run the scan
console.log("🔍 Scanning for console.* usage...\n");
walkDir(SRC_DIR);

// Print results
console.log("📊 Results:");
console.log("━".repeat(60));
console.log(`Total files with console usage: ${results.totalFiles}`);
console.log(`Total console statements: ${results.totalConsoleUsage}`);
console.log("━".repeat(60));
console.log("\n📁 Files needing migration:\n");

// Sort by count (most usage first)
results.fileDetails.sort((a, b) => b.count - a.count);

results.fileDetails.forEach(({ file, count, lines }) => {
  console.log(`  ${file}`);
  console.log(`    Count: ${count}`);
  console.log(
    `    Lines: ${lines.slice(0, 5).join(", ")}${lines.length > 5 ? "..." : ""}`
  );
  console.log("");
});

// Generate migration checklist
console.log("\n✅ Migration Checklist:");
console.log("━".repeat(60));
console.log('1. Import logger: import { logger } from "@/lib/logger";');
console.log("2. Replace console.log → logger.log");
console.log("3. Replace console.error → logger.error");
console.log("4. Replace console.warn → logger.warn");
console.log("5. Replace console.info → logger.info");
console.log("6. Replace console.debug → logger.debug");
console.log("━".repeat(60));

// Save to file
const reportPath = path.join(__dirname, "..", "console-usage-report.json");
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`\n💾 Full report saved to: ${reportPath}`);
