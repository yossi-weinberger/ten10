#!/usr/bin/env node

/**
 * Release Script for Ten10
 *
 * Automates the release process:
 * 1. Updates version in all 3 files
 * 2. Commits the bump on release/vX.Y.Z
 * 3. Pushes that branch and opens a pull request
 * 4. After the pull request merges, tag the merge commit manually
 *
 * Usage: npm run release 0.3.0
 */

const fs = require("fs");
const { execSync, spawnSync } = require("child_process");
const path = require("path");
const {
  getCurrentBranch,
  getMainBranchError,
} = require("./branch-guard.cjs");

const currentBranch = getCurrentBranch();
const branchError = getMainBranchError("create a release", currentBranch);

if (branchError) {
  console.error(`❌ Error: ${branchError}`);
  process.exit(1);
}

// Get version from command line
const newVersion = process.argv[2];

if (!newVersion) {
  console.error("❌ Error: Please provide a version number");
  console.log("Usage: npm run release 0.3.0");
  process.exit(1);
}

// Validate version format (x.y.z)
const versionRegex = /^\d+\.\d+\.\d+(-\w+(\.\d+)?)?$/;
if (!versionRegex.test(newVersion)) {
  console.error("❌ Error: Invalid version format");
  console.log("Expected format: 0.3.0 or 0.3.0-beta.1");
  process.exit(1);
}

console.log(`🚀 Starting release process for version ${newVersion}\n`);

try {
  // 1. Update package.json
  console.log("📝 Updating package.json...");
  const packageJsonPath = path.join(__dirname, "../package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  packageJson.version = newVersion;
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + "\n"
  );
  console.log("   ✅ package.json updated\n");

  // 1.5. Update package-lock.json
  console.log("📝 Updating package-lock.json...");
  try {
    // Use npm install --package-lock-only to update lock file without installing
    execSync("npm install --package-lock-only", {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    });
    console.log("   ✅ package-lock.json updated\n");
  } catch (error) {
    console.log(
      "   ⚠️  Warning: Failed to update package-lock.json automatically"
    );
    console.log("   💡 You may need to run 'npm install' manually\n");
  }

  // 2. Update Cargo.toml
  console.log("📝 Updating Cargo.toml...");
  const cargoTomlPath = path.join(__dirname, "../src-tauri/Cargo.toml");
  let cargoToml = fs.readFileSync(cargoTomlPath, "utf8");
  cargoToml = cargoToml.replace(
    /^version = ".*"$/m,
    `version = "${newVersion}"`
  );
  fs.writeFileSync(cargoTomlPath, cargoToml);
  console.log("   ✅ Cargo.toml updated\n");

  // 3. Update tauri.conf.json
  console.log("📝 Updating tauri.conf.json...");
  const tauriConfPath = path.join(__dirname, "../src-tauri/tauri.conf.json");
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf8"));
  tauriConf.version = newVersion;
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + "\n");
  console.log("   ✅ tauri.conf.json updated\n");

  // 4. Check git status
  console.log("📊 Checking git status...");
  const status = execSync("git status --porcelain", { encoding: "utf8" });
  if (
    !status.includes("package.json") &&
    !status.includes("package-lock.json") &&
    !status.includes("Cargo.toml") &&
    !status.includes("tauri.conf.json")
  ) {
    console.log(
      "⚠️  Warning: No version files were modified. They might already be at this version."
    );
  }

  // 5. Git add
  console.log("📦 Staging changes...");
  execSync(
    "git add package.json package-lock.json src-tauri/Cargo.toml src-tauri/tauri.conf.json",
    { stdio: "inherit" }
  );
  console.log("   ✅ Files staged\n");

  const releaseBranch = `release/v${newVersion}`;
  console.log(`🌿 Creating ${releaseBranch}...`);
  execSync(`git checkout -b ${releaseBranch}`, { stdio: "inherit" });
  console.log("   ✅ Branch created\n");

  // 6. Git commit
  console.log("💾 Committing changes...");
  try {
    execSync(`git commit -m "chore: bump version to ${newVersion}"`, {
      stdio: "inherit",
    });
    console.log("   ✅ Changes committed\n");
  } catch (error) {
    console.log(
      "   ⚠️  No changes to commit (files might already be at this version)\n"
    );
  }

  // 7. Push the release branch and open a PR. main rejects direct pushes.
  console.log("☁️  Pushing release branch...");
  execSync(`git push -u origin ${releaseBranch}`, { stdio: "inherit" });
  console.log("   ✅ Branch pushed\n");

  console.log("🔀 Opening pull request...");
  const prBody = [
    `Version bump for v${newVersion}.`,
    "",
    "After this pull request merges, tag that merge commit:",
    "",
    "```",
    "git checkout main",
    "git pull",
    `git tag -a v${newVersion} -m "Release v${newVersion}"`,
    `git push origin v${newVersion}`,
    "```",
  ].join("\n");
  const pullRequest = spawnSync(
    "gh",
    [
      "pr",
      "create",
      "--base",
      "main",
      "--head",
      releaseBranch,
      "--title",
      `chore: release v${newVersion}`,
      "--body",
      prBody,
    ],
    { stdio: "inherit" }
  );
  if (pullRequest.status !== 0) {
    throw new Error("gh pr create failed");
  }

  console.log("═══════════════════════════════════════════════════");
  console.log("🎉 Release pull request opened");
  console.log("═══════════════════════════════════════════════════");
  console.log(`\n📦 Version: ${newVersion}`);
  console.log(`🌿 Branch: ${releaseBranch}`);
  console.log("\nThe desktop build starts only after the pull request merges and the tag is pushed.");
  console.log("═══════════════════════════════════════════════════\n");
} catch (error) {
  console.error("\n❌ Error during release process:", error.message);
  console.log(
    "\n💡 You can manually fix the issue and continue from where it failed."
  );
  process.exit(1);
}
