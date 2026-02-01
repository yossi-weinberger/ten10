# Desktop Release System - Complete Guide

**Last Updated**: January 2026  
**Status**: ✅ Fully Implemented and Working

---

## Overview

The Ten10 desktop application has a complete automated release management system that handles:

- ✅ Automatic version updates via Tauri updater plugin
- ✅ GitHub Actions for automated builds
- ✅ One-command release process (`npm run release`)
- ✅ Version display in Settings page
- ✅ Manual update checks
- ✅ Dynamic download links on Landing page

---

## System Components

### 1. Tauri Updater Plugin

**Package**: `tauri-plugin-updater@2.9.0` (Rust) + `@tauri-apps/plugin-updater@2.0.0` (npm)

**Location**:

- Rust: `src-tauri/Cargo.toml`
- npm: `package.json`
- Initialized: `src-tauri/src/main.rs`

**What it does**:

- Checks for new versions from GitHub Releases
- Downloads and verifies signed updates
- Installs updates and restarts app

**Configuration**: `src-tauri/tauri.conf.json` under `plugins.updater`

### 2. GitHub Actions Workflow

**File**: `.github/workflows/release.yml`

**Triggered by**: Git tags matching `v*` (e.g., `v0.3.0`)

**What it does**:

1. Builds the frontend (Vite)
2. Builds the Tauri app (Rust + bundling) – NSIS (EXE) + MSI
3. Signs installers with Tauri signer
4. Creates GitHub Release and uploads installers + `latest.json` (updater prefers **EXE**)
5. Builds a second installer with WebView2 embedded (`offlineInstaller`) and uploads it as `Ten10_<version>_x64_with_WebView2-setup.exe`

**Required Secrets**:

- `TAURI_PRIVATE_KEY` - Private signing key
- `TAURI_KEY_PASSWORD` - Key password
- `VITE_SUPABASE_URL` - Supabase URL (for build process)
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key (for build process)

**Note**: Desktop app doesn't use Supabase at runtime (it's offline with SQLite), but the build process needs these env vars because `supabaseClient.ts` is imported during bundling.

### 3. Frontend Components

**VersionInfoCard**: `src/components/settings/VersionInfoCard.tsx`

- Displays current version
- "Check for Updates" button
- "Install Update" button (when available)
- Shows update status and errors
- Desktop only (hidden on web)

**useLatestRelease**: `src/hooks/useLatestRelease.ts`

- Fetches latest release from GitHub API
- Parses download links for installers
- Used in Landing page

**DownloadSection**: `src/pages/landing/sections/DownloadSection.tsx`

- Shows **three Windows download options** with short explanations:
  1. **EXE (Standard install)** – labelled "Recommended"; install without admin, for most users
  2. **MSI** – system-wide (Program Files), for IT or shared computers
  3. **Full install with WebView2** – for computers without internet or older Windows (offline installer)
- Dynamic links from GitHub Releases via `useLatestRelease`
- Coming soon message for macOS/Linux

### 4. Backend Service

**updater.service.ts**: `src/lib/data-layer/updater.service.ts`

Functions:

- `getCurrentVersion()` - Gets version from Rust
- `checkForUpdates()` - Checks GitHub for new version
- `downloadAndInstallUpdate()` - Downloads and installs
- `isDesktopPlatform()` - Platform check

**Pattern**: Uses dynamic imports to avoid loading Tauri modules in web environment.

### 5. Rust Backend

**Command**: `get_app_version` in `src-tauri/src/commands/db_commands.rs`

- Returns version from `Cargo.toml` at compile time
- Exposed via Tauri IPC

---

## Release Process (Developer)

### Quick Command (Recommended)

```bash
npm run release 0.3.0
```

This single command does **everything**:

1. ✅ Updates version in 3 files (package.json, Cargo.toml, tauri.conf.json)
2. ✅ Commits changes
3. ✅ Creates git tag
4. ✅ Pushes to GitHub
5. ✅ GitHub Actions builds automatically

**Wait time**: 5-15 minutes for GitHub Actions to complete

### What Happens Behind the Scenes

When you run `npm run release 0.3.0`, the following process occurs:

#### 1. Script Updates Version (Local)

```
├─ package.json → "version": "0.3.0"
├─ src-tauri/Cargo.toml → version = "0.3.0"
└─ src-tauri/tauri.conf.json → "version": "0.3.0"
```

#### 2. Git Operations (Local)

- Commit: "chore: bump version to 0.3.0"
- Tag: v0.3.0
- Push to GitHub

#### 3. GitHub Actions Workflow (CI/CD)

The workflow is triggered by the tag `v*` and performs:

1. **Checkout code**

   - Clones repository
   - Checks out the tagged version

2. **Setup environment**

   - Setup Node.js
   - Setup Rust toolchain
   - Install dependencies (`npm ci`)

3. **Build frontend** (`npm run build`)

   - Vite reads `VITE_SUPABASE_*` from GitHub Secrets
   - Vite detects `CI=true` environment
   - Excludes `@tauri-apps` modules (external)
   - Builds `dist/` directory ✅

4. **Build Tauri app** (via `tauri-action`)

   - Runs `tauri build`
   - Cargo downloads Rust dependencies
   - Builds Rust backend
   - Signs installers with `TAURI_PRIVATE_KEY`
   - Creates `.msi` installers (Hebrew + English)
   - Creates `.sig` signature files
   - Generates `latest.json` ✅

5. **Create GitHub Release**

   - Auto-generates release notes
   - Uploads installers
   - Uploads signatures
   - Uploads `latest.json` ✅

6. **Update landing page** (automatic) 🎉
   - Landing page fetches latest release from GitHub API
   - Download section updates automatically

### Manual Process (If Needed)

```bash
# 1. Update versions manually in:
#    - package.json
#    - src-tauri/Cargo.toml
#    - src-tauri/tauri.conf.json

# 2. Commit
git add .
git commit -m "chore: bump version to 0.3.0"

# 3. Tag and push
git tag v0.3.0
git push origin main
git push origin v0.3.0
```

---

## Update Flow (End User)

### Automatic Check (On Startup)

1. User launches desktop app
2. Updater plugin checks: `https://github.com/USER/REPO/releases/latest/download/latest.json`
3. Compares version in JSON with current version
4. If newer:
   - Shows dialog: "Update available: v0.3.0"
   - User can install now or later

### Manual Check (In Settings)

1. User opens Settings page
2. Scrolls to "Version Info" card (below Language & Display)
3. Clicks "Check for Updates"
4. If update available:
   - Shows update info
   - "Install Update" button appears
5. Click "Install Update":
   - Downloads in background
   - Installs automatically
   - App restarts with new version

### First Install (From Landing Page)

1. User visits: `https://ten10-app.com/landing`
2. Sees Windows card with **three download options** (EXE recommended, MSI, With WebView2) and version badge
3. Chooses the appropriate installer (EXE for most users; WebView2 for offline/old Windows)
4. Clicks to download from GitHub Release and installs
5. Done!

---

## Security & Signing

### Tauri Signer (For Updates)

**Purpose**: Signs update packages so desktop app can verify authenticity

**Keys**:

- Private key: Stored in `~/.tauri/ten10.key` (local) and GitHub Secret `TAURI_PRIVATE_KEY`
- Public key: Embedded in `tauri.conf.json` under `plugins.updater.pubkey`

**Generation**:

```bash
npx @tauri-apps/cli signer generate -w ~/.tauri/ten10.key
```

**Setup Guide**: See `../deployment/setup-updater-keys.md`

### Code Signing Certificate (Optional)

**Purpose**: Prevents "Unknown Publisher" warnings in Windows

**Status**: Not yet configured (placeholder in workflow)

**Guide**: See `../deployment/code-signing-guide.md` (not yet implemented)

---

## File Structure

### Configuration Files

```
src-tauri/tauri.conf.json
  └── plugins.updater
      ├── active: true
      ├── endpoints: [GitHub latest.json URL]
      ├── dialog: true
      └── pubkey: "..."

src-tauri/capabilities/migrated.json
  └── permissions
      ├── updater:default
      ├── updater:allow-check
      ├── updater:allow-download
      └── updater:allow-install
```

### Generated Files (In GitHub Release)

- `Ten10_0.3.0_x64-setup.exe` - NSIS installer (per-user, **default for updater**)
- `Ten10_0.3.0_x64_he-IL.msi` - Hebrew MSI installer
- `Ten10_0.3.0_x64_en-US.msi` - English MSI installer
- `Ten10_0.3.0_x64_with_WebView2-setup.exe` - NSIS installer with WebView2 embedded (offline)
- `*.sig` files - Signatures
- `latest.json` - Update manifest (points to EXE when `updaterJsonPreferNsis: true`)

### latest.json Structure

With `updaterJsonPreferNsis: true`, the updater URL points to the **EXE** (NSIS) so users can update without admin rights:

```json
{
  "version": "0.3.0",
  "pub_date": "2025-11-09T17:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "...",
      "url": "https://github.com/.../Ten10_0.3.0_x64-setup.exe"
    }
  }
}
```

### Install Options Policy

- **Updater**: Prefers EXE (NSIS) so updates work without administrator privileges.
- **Landing page**: Offers three choices – EXE (recommended), MSI, and With WebView2 – with short explanations.
- **Email download link** (process-email-request): Prefers standard EXE over MSI; excludes the WebView2/offline exe from the default link.

**When to use "Full install with WebView2"**: For computers without internet during install, older Windows (e.g. Windows 7), or when the standard installer fails with WebView2-related errors. The WebView2 variant adds ~127MB to the installer size.

---

## Troubleshooting

### "Missing environment variable: VITE_SUPABASE_URL"

**Cause**: GitHub Actions doesn't have Supabase credentials in Secrets

**Fix**: Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to GitHub Secrets

**Why needed**: Even though desktop is offline, `supabaseClient.ts` is imported during build and validates env vars

### "updater.check not allowed"

**Cause**: Missing updater permissions in capabilities

**Fix**: Add to `src-tauri/capabilities/migrated.json`:

```json
"updater:default",
"updater:allow-check",
"updater:allow-download",
"updater:allow-install"
```

### "Could not fetch valid release JSON"

**Causes**:

- No release exists yet
- Wrong endpoint URL in `tauri.conf.json`
- Network connectivity issue

**Fix**: Ensure at least one release exists in GitHub

### "Version mismatch" errors in build

**Cause**: Rust crate versions don't match npm package versions

**Fix**: Sync versions in `Cargo.toml` and `package.json`

Example:

```toml
# Cargo.toml
tauri-plugin-updater = { version = "2.9.0", default-features = false, features = ["native-tls", "zip"] }
```

```json
// package.json
"@tauri-apps/plugin-updater": "^2.0.0"
```

### "Failed to resolve @tauri-apps/..." in CI build

**Cause**: Vite tries to bundle Tauri modules in standalone web build

**Fix**: Already handled in `vite.config.ts`:

```typescript
const isCIBuild = process.env.CI === "true";
external: isVercel || isCIBuild ? [/^@tauri-apps\//] : [];
```

---

## Important Notes

### Version Synchronization

**CRITICAL**: Version must match in 3 files:

1. `package.json`
2. `src-tauri/Cargo.toml`
3. `src-tauri/tauri.conf.json`

**Always use `npm run release`** - it handles this automatically.

### Required GitHub Secrets

The following secrets must be configured in GitHub:

- `TAURI_PRIVATE_KEY` ← For signing installers
- `TAURI_KEY_PASSWORD` ← For decrypting the key
- `VITE_SUPABASE_URL` ← For build process (even though desktop is offline!)
- `VITE_SUPABASE_ANON_KEY` ← For build process

**Why Supabase secrets for desktop?**
Because `supabaseClient.ts` is imported during the build process, even though desktop doesn't use Supabase at runtime (it's offline with SQLite).

### Required Permissions

In `src-tauri/capabilities/migrated.json`:

```json
"updater:default",
"updater:allow-check",
"updater:allow-download",
"updater:allow-install"
```

### Build Context Detection

The system handles 3 build contexts:

1. **Vercel** (`VERCEL=1`):
   - Builds web version
   - Excludes Tauri modules
2. **GitHub Actions** (`CI=true`):
   - Standalone Vite build excludes Tauri
   - Tauri build (via tauri-action) includes Tauri
3. **Local** (no special flags):
   - `npm run build` → excludes Tauri (web-like)
   - `npm run tauri build` → includes Tauri (desktop)

**Note**: The `vite.config.ts` automatically detects these environments:

- `VERCEL=1` → Excludes Tauri modules
- `CI=true` → Excludes Tauri modules
- Otherwise → Includes Tauri modules (Tauri build)

**Do not modify this without thorough testing!**

### Dynamic Imports Pattern

All Tauri plugins use dynamic imports:

```typescript
// ❌ DON'T DO THIS (causes web build errors)
import { someFunction } from "@tauri-apps/plugin-name";

// ✅ DO THIS (works in all contexts)
// @ts-expect-error - __TAURI_INTERNALS__ is injected by Tauri
if (!window.__TAURI_INTERNALS__) {
  return; // Not on desktop
}

const { someFunction } = await import("@tauri-apps/plugin-name");
await someFunction();
```

This pattern is used in:

- `updater.service.ts`
- `notification.service.ts`
- `autostart.service.ts`
- `transactions.service.ts`
- `stats.service.ts`
- And all other data-layer services

---

## What End Users See

### Settings Page

**Location**: Below "Language & Display" card

**Desktop Users See**:

- Current version badge (e.g., "v0.2.13")
- "Check for Updates" button
- Update status messages
- "Install Update" button (when available)

**Web Users See**:

- Nothing (component is hidden)

### Landing Page

**Location**: Download section (`/landing`)

**All Visitors See**:

- Windows download button
- Version badge (e.g., "v0.2.13")
- Direct download link from GitHub Release
- "Coming soon" note for macOS/Linux

---

## Maintenance

### Creating a New Release

```bash
npm run release 0.3.0
```

Wait 5-15 minutes for GitHub Actions to build.

### Checking Build Status

```
https://github.com/yossi-weinberger/ten10/actions
```

### Viewing Releases

```
https://github.com/yossi-weinberger/ten10/releases
```

---

## Summary for LLM Agents

When working with the release system:

1. **Never modify `vite.config.ts` lightly** - the external config is critical for multi-platform builds
2. **Always use dynamic imports** for Tauri plugins
3. **Version must sync** in 3 files (use `npm run release` script)
4. **Permissions required** in `capabilities/migrated.json` for updater
5. **GitHub Secrets needed**: TAURI keys + VITE env vars (even for desktop builds)
6. **Test on branch first** - create tag on feature branch before merging to main

---

## Quick Reference

| Task                                     | Command                               |
| ---------------------------------------- | ------------------------------------- |
| Create release                           | `npm run release 0.3.0`               |
| Build locally (EXE + MSI + WebView2 EXE) | `npm run tauri build`                 |
| Dev mode                                 | `npm run tauri dev`                   |
| Check actions                            | https://github.com/USER/REPO/actions  |
| View releases                            | https://github.com/USER/REPO/releases |

---

**This is the definitive guide. All other release-related documentation should defer to this.**
