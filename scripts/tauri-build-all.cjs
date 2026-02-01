#!/usr/bin/env node

/**
 * Builds all desktop installers locally: standard NSIS, MSI, and full NSIS with WebView2.
 * 1. Runs normal tauri build (standard EXE + MSI)
 * 2. Builds again with WebView2 bundled (offline installer)
 * 3. Keeps both EXEs: standard and with_WebView2
 *
 * Invoked by: npm run tauri build (wrapper in package.json).
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const TAURI_CONF = path.join(ROOT, "src-tauri", "tauri.conf.json");
const NSIS_DIR = path.join(
  ROOT,
  "src-tauri",
  "target",
  "release",
  "bundle",
  "nsis"
);

function getVersion() {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
  );
  return pkg.version;
}

function findNsisExe() {
  if (!fs.existsSync(NSIS_DIR)) return null;
  const files = fs.readdirSync(NSIS_DIR);
  const exe = files.find((f) => f.endsWith(".exe") && !f.endsWith(".sig"));
  return exe ? path.join(NSIS_DIR, exe) : null;
}

function findNsisSig() {
  if (!fs.existsSync(NSIS_DIR)) return null;
  const files = fs.readdirSync(NSIS_DIR);
  const sig = files.find((f) => f.endsWith(".exe.sig"));
  return sig ? path.join(NSIS_DIR, sig) : null;
}

function patchTauriConf(add) {
  const j = JSON.parse(fs.readFileSync(TAURI_CONF, "utf8"));
  if (add) {
    j.bundle.windows = j.bundle.windows || {};
    j.bundle.windows.webviewInstallMode = { type: "offlineInstaller" };
    // Avoid signing failure when no private key (local dev); CI has TAURI_SIGNING_PRIVATE_KEY
    if (!process.env.TAURI_SIGNING_PRIVATE_KEY) {
      j.bundle.createUpdaterArtifacts = false;
    }
  } else {
    if (j.bundle.windows) delete j.bundle.windows.webviewInstallMode;
    if (savedCreateUpdaterArtifacts !== undefined) {
      j.bundle.createUpdaterArtifacts = savedCreateUpdaterArtifacts;
    }
  }
  fs.writeFileSync(TAURI_CONF, JSON.stringify(j, null, 2));
}

let savedCreateUpdaterArtifacts;
function saveAndPatchForWebView2() {
  const j = JSON.parse(fs.readFileSync(TAURI_CONF, "utf8"));
  savedCreateUpdaterArtifacts = j.bundle.createUpdaterArtifacts;
  patchTauriConf(true);
}

function runTauriBuild() {
  execSync("npx tauri build", { cwd: ROOT, stdio: "inherit" });
}

const version = getVersion();
const standardExeName = `Ten10_${version}_x64_standard-setup.exe`;
const webview2ExeName = `Ten10_${version}_x64_with_WebView2-setup.exe`;

// When no signing key (local dev), disable updater artifacts for both builds to avoid "public key found, no private key" error
const needSigningWorkaround = !process.env.TAURI_SIGNING_PRIVATE_KEY;
if (needSigningWorkaround) {
  const j = JSON.parse(fs.readFileSync(TAURI_CONF, "utf8"));
  savedCreateUpdaterArtifacts = j.bundle.createUpdaterArtifacts;
  j.bundle.createUpdaterArtifacts = false;
  fs.writeFileSync(TAURI_CONF, JSON.stringify(j, null, 2));
}

console.log("Building standard installers (NSIS + MSI)...\n");

// Clean up old artifacts to avoid confusion if build fails
if (fs.existsSync(path.join(NSIS_DIR, webview2ExeName))) {
  try {
    fs.unlinkSync(path.join(NSIS_DIR, webview2ExeName));
  } catch (e) {}
}
if (fs.existsSync(path.join(NSIS_DIR, standardExeName))) {
  try {
    fs.unlinkSync(path.join(NSIS_DIR, standardExeName));
  } catch (e) {}
}

try {
  runTauriBuild();
} finally {
  if (needSigningWorkaround) {
    patchTauriConf(false);
  }
}

const standardExePath = findNsisExe();
if (!standardExePath) {
  console.error("Expected NSIS EXE not found after first build.");
  process.exit(1);
}

const standardBackupPath = path.join(NSIS_DIR, standardExeName);
const standardSigPath = findNsisSig();
const standardSigBackupPath = standardSigPath
  ? path.join(NSIS_DIR, standardExeName.replace(".exe", ".exe.sig"))
  : null;

fs.copyFileSync(standardExePath, standardBackupPath);
if (standardSigPath) fs.copyFileSync(standardSigPath, standardSigBackupPath);
console.log(`Saved standard EXE as ${standardExeName}\n`);

console.log("Building full installer with WebView2 (offline)...\n");
saveAndPatchForWebView2();
try {
  runTauriBuild();
} finally {
  patchTauriConf(false);
  console.log("Restored tauri.conf.json\n");
}

const currentExePath = findNsisExe();
if (!currentExePath) {
  console.error("Expected NSIS EXE not found after second build.");
  process.exit(1);
}

const webview2Path = path.join(NSIS_DIR, webview2ExeName);
const webview2SigPath = path.join(NSIS_DIR, webview2ExeName + ".sig");
const currentSigPath = findNsisSig();

fs.renameSync(currentExePath, webview2Path);
if (currentSigPath) fs.renameSync(currentSigPath, webview2SigPath);
fs.copyFileSync(standardBackupPath, standardExePath);
fs.unlinkSync(standardBackupPath);
if (standardSigBackupPath && fs.existsSync(standardSigBackupPath)) {
  const origSig = path.join(NSIS_DIR, path.basename(standardExePath) + ".sig");
  fs.copyFileSync(standardSigBackupPath, origSig);
  fs.unlinkSync(standardSigBackupPath);
}

console.log("Done. Bundles:");
console.log(`  ${path.basename(standardExePath)} (standard)`);
console.log(`  ${webview2ExeName} (with WebView2)`);
console.log(`  src-tauri/target/release/bundle/msi/*.msi`);
