#!/usr/bin/env node

/**
 * Builds all desktop installers locally: standard NSIS, MSI, and full NSIS with WebView2.
 * 1. Runs normal tauri build (standard EXE + MSI, ~50MB each)
 * 2. Backs up MSI; builds again with WebView2 bundled (offline installer)
 * 3. Keeps: Ten10_x_x64-setup.exe (standard), Ten10_x_with_WebView2-setup.exe, MSI (standard, no WebView2)
 *
 * Invoked by: npm run tauri build (wrapper in package.json).
 *
 * Old installers from previous versions may remain in the NSIS folder; the script
 * always picks the current-version output by name (Ten10_<version>_x64-setup.exe)
 * so old files do not affect the result.
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
  "nsis",
);
const MSI_DIR = path.join(
  ROOT,
  "src-tauri",
  "target",
  "release",
  "bundle",
  "msi",
);
const MSI_BACKUP_DIR = path.join(MSI_DIR, "..", "msi-backup");

function getVersion() {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
  );
  return pkg.version;
}

function findNsisExe(excludeFileName) {
  if (!fs.existsSync(NSIS_DIR)) return null;
  // Prefer the default Tauri output for current version so we don't pick an old build
  const defaultPath = path.join(NSIS_DIR, defaultNsisExeName);
  if (
    fs.existsSync(defaultPath) &&
    (!excludeFileName || defaultNsisExeName !== excludeFileName)
  ) {
    return defaultPath;
  }
  const files = fs.readdirSync(NSIS_DIR);
  const exe = files.find(
    (f) =>
      f.endsWith(".exe") &&
      !f.endsWith(".sig") &&
      (!excludeFileName || f !== excludeFileName),
  );
  return exe ? path.join(NSIS_DIR, exe) : null;
}

function findNsisSig(excludeFileName) {
  if (!fs.existsSync(NSIS_DIR)) return null;
  const defaultSigName = defaultNsisExeName + ".sig";
  const defaultSigPath = path.join(NSIS_DIR, defaultSigName);
  if (
    fs.existsSync(defaultSigPath) &&
    (!excludeFileName || defaultSigName !== excludeFileName)
  ) {
    return defaultSigPath;
  }
  const files = fs.readdirSync(NSIS_DIR);
  const sig = files.find(
    (f) =>
      f.endsWith(".exe.sig") && (!excludeFileName || f !== excludeFileName),
  );
  return sig ? path.join(NSIS_DIR, sig) : null;
}

function applySigningWorkaround(bundleConfig) {
  // Avoid signing failure when no private key (local dev); CI has TAURI_SIGNING_PRIVATE_KEY
  if (!process.env.TAURI_SIGNING_PRIVATE_KEY) {
    bundleConfig.createUpdaterArtifacts = false;
  }
}

function patchTauriConf(add) {
  const j = JSON.parse(fs.readFileSync(TAURI_CONF, "utf8"));
  if (add) {
    j.bundle.windows = j.bundle.windows || {};
    j.bundle.windows.webviewInstallMode = { type: "offlineInstaller" };
    applySigningWorkaround(j.bundle);
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
/** Default name Tauri outputs for NSIS (same in both builds until we rename). */
const defaultNsisExeName = `Ten10_${version}_x64-setup.exe`;
const standardExeName = `Ten10_${version}_x64_standard-setup.exe`;
const webview2ExeName = `Ten10_${version}_x64_with_WebView2-setup.exe`;

// When no signing key (local dev), disable updater artifacts for both builds
const needSigningWorkaround = !process.env.TAURI_SIGNING_PRIVATE_KEY;
if (needSigningWorkaround) {
  const j = JSON.parse(fs.readFileSync(TAURI_CONF, "utf8"));
  savedCreateUpdaterArtifacts = j.bundle.createUpdaterArtifacts;
  applySigningWorkaround(j.bundle);
  fs.writeFileSync(TAURI_CONF, JSON.stringify(j, null, 2));
}

// Ensure first build runs WITHOUT webviewInstallMode (standard installer, ~50MB)
// Config may have it left from previous run; remove before first build
const preBuildConf = JSON.parse(fs.readFileSync(TAURI_CONF, "utf8"));
if (preBuildConf.bundle?.windows?.webviewInstallMode) {
  delete preBuildConf.bundle.windows.webviewInstallMode;
  fs.writeFileSync(TAURI_CONF, JSON.stringify(preBuildConf, null, 2));
}

console.log("Building standard installers (NSIS + MSI)...\n");

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

// Backup MSI from first build (standard, ~50MB); second build overwrites with WebView2 (~200MB)
if (fs.existsSync(MSI_DIR)) {
  fs.mkdirSync(MSI_BACKUP_DIR, { recursive: true });
  for (const f of fs.readdirSync(MSI_DIR)) {
    if (f.endsWith(".msi") || f.endsWith(".msi.sig") || f.endsWith(".zip")) {
      fs.copyFileSync(path.join(MSI_DIR, f), path.join(MSI_BACKUP_DIR, f));
    }
  }
  console.log("Backed up standard MSI files.\n");
}

console.log("Building full installer with WebView2 (offline)...\n");
saveAndPatchForWebView2();
try {
  runTauriBuild();
} finally {
  patchTauriConf(false);
  console.log("Restored tauri.conf.json\n");
}

// After second build, Tauri overwrote the default-named exe (WebView2). Ignore our backup name.
const currentExePath = findNsisExe(standardExeName);
if (!currentExePath) {
  console.error("Expected NSIS EXE not found after second build.");
  process.exit(1);
}

const webview2Path = path.join(NSIS_DIR, webview2ExeName);
const webview2SigPath = path.join(NSIS_DIR, webview2ExeName + ".sig");
const standardSigExclude = standardExeName + ".sig";
const currentSigPath = findNsisSig(standardSigExclude);

fs.renameSync(currentExePath, webview2Path);
if (currentSigPath) fs.renameSync(currentSigPath, webview2SigPath);

// Restore default-named exe for tauri-action (CI upload): it only looks for Ten10_<version>_x64-setup.exe.
const defaultExePath = path.join(NSIS_DIR, defaultNsisExeName);
const defaultSigPath = path.join(NSIS_DIR, defaultNsisExeName + ".sig");
fs.copyFileSync(standardBackupPath, defaultExePath);
if (standardSigBackupPath && fs.existsSync(standardSigBackupPath)) {
  fs.copyFileSync(standardSigBackupPath, defaultSigPath);
}

// Remove redundant standard-setup (we have it at default path now)
fs.unlinkSync(standardBackupPath);
if (standardSigBackupPath && fs.existsSync(standardSigBackupPath)) {
  fs.unlinkSync(standardSigBackupPath);
}

// Restore MSI from first build (standard, ~50MB) – second build overwrote with WebView2 (~200MB)
if (fs.existsSync(MSI_BACKUP_DIR)) {
  for (const f of fs.readdirSync(MSI_BACKUP_DIR)) {
    fs.copyFileSync(path.join(MSI_BACKUP_DIR, f), path.join(MSI_DIR, f));
  }
  fs.rmSync(MSI_BACKUP_DIR, { recursive: true });
  console.log("Restored standard MSI (no WebView2 bundled).\n");
}

console.log("Done. Bundles:");
console.log(`  ${defaultNsisExeName} (standard)`);
console.log(`  ${webview2ExeName} (with WebView2)`);
console.log(`  src-tauri/target/release/bundle/msi/*.msi (standard)`);
