#!/usr/bin/env node

/**
 * Wrapper for Tauri CLI. For "tauri build" runs the full build (EXE + MSI + WebView2 EXE);
 * for any other command (dev, --help, etc.) delegates to the real tauri CLI.
 */

const { execSync } = require("child_process");
const path = require("path");

const args = process.argv.slice(2);
const isBuild = args[0] === "build";

if (isBuild) {
  require(path.join(__dirname, "tauri-build-all.cjs"));
} else {
  execSync(`npx tauri ${args.join(" ")}`, {
    stdio: "inherit",
    cwd: path.resolve(__dirname, ".."),
  });
}
