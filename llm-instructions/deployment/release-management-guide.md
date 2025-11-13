# Release Management Guide - Ten10 Desktop App

## Overview

This guide explains the complete process for managing releases of the Ten10 desktop application, including version management, building, signing, and deploying updates to users.

## System Architecture

### Components

1. **Tauri Updater Plugin** (`tauri-plugin-updater`)

   - Handles update checking and installation
   - Verifies signatures using RSA public key
   - Downloads and applies updates automatically

2. **GitHub Actions Workflow** (`.github/workflows/release.yml`)

   - Triggers on version tags (e.g., `v0.3.0`)
   - Builds application for Windows
   - Signs installers with Tauri signer
   - Creates GitHub Release with assets
   - Generates `latest.json` for updater

3. **Frontend Components**

   - `VersionInfoCard` - Displays version and checks for updates (Settings page)
   - `useLatestRelease` - Fetches release info from GitHub API (Landing page)
   - `DownloadSection` - Shows dynamic download links (Landing page)

4. **Backend Commands**
   - `get_app_version` - Returns current version from Cargo.toml

## Prerequisites

Before you can create releases, complete these setup steps once:

### 1. Generate Updater Signing Keys

```bash
npm run tauri signer generate -- -w ~/.tauri/ten10.key
```

This creates:

- **Private key**: `~/.tauri/ten10.key` (keep SECRET!)
- **Public key**: Displayed in terminal output

**Important**: Save both keys securely. The private key is needed for signing, and the public key must be in `tauri.conf.json`.

### 2. Configure GitHub Secrets

Go to: `https://github.com/yossi-weinberger/ten10/settings/secrets/actions`

Add these secrets:

| Secret Name              | Value                           | Purpose                   |
| ------------------------ | ------------------------------- | ------------------------- |
| `TAURI_PRIVATE_KEY`      | Content of `~/.tauri/ten10.key` | Sign updates              |
| `TAURI_KEY_PASSWORD`     | Password for private key        | Decrypt signing key       |
| `TAURI_PUBLIC_KEY`       | Public key from terminal        | Verification (backup)     |
| `VITE_SUPABASE_URL`      | Your Supabase project URL       | Build process (from .env) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key          | Build process (from .env) |

**Important Note on Supabase Secrets**:

- Desktop app is **fully offline** and doesn't use Supabase at runtime
- However, `supabaseClient.ts` is imported during the build process
- Vite needs these env vars to complete the build without errors
- The values are embedded in the bundle but never used on desktop (platform detection prevents it)

### 3. Update tauri.conf.json

Replace the placeholder public key:

```json
{
  "plugins": {
    "updater": {
      "pubkey": "YOUR_ACTUAL_PUBLIC_KEY_HERE"
    }
  }
}
```

**Important**: In Tauri V2, updater config is under `plugins`, not `bundle`.

**Commit this change** - the public key is safe to commit.

### 4. Optional: Code Signing Certificate

For production releases, purchase a Windows code signing certificate (~$200-400/year).

See `code-signing-guide.md` for detailed instructions.

**Without certificate**: Users will see "Unknown publisher" warnings.
**With certificate**: Clean installation experience.

## Release Process

### Step 1: Update Version Numbers

Version numbers must be synchronized in **three files**:

1. **package.json**:

   ```json
   {
     "version": "0.3.0"
   }
   ```

2. **src-tauri/Cargo.toml**:

   ```toml
   [package]
   version = "0.3.0"
   ```

3. **src-tauri/tauri.conf.json**:
   ```json
   {
     "version": "0.3.0"
   }
   ```

**Tip**: Use a script or check all three files before committing.

### Step 2: Commit and Tag

```bash
# Stage changes
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json

# Commit with conventional commit message
git commit -m "chore: bump version to 0.3.0"

# Create annotated tag
git tag -a v0.3.0 -m "Release v0.3.0"

# Push to GitHub
git push origin main
git push origin v0.3.0
```

**Important**:

- Tag must start with `v` (e.g., `v0.3.0`, not `0.3.0`)
- This triggers the GitHub Actions workflow

### Step 3: Monitor Build

1. Go to: `https://github.com/yossi-weinberger/ten10/actions`
2. Find the "Release Desktop App" workflow for your tag
3. Monitor the build progress (takes ~5-15 minutes)

**Workflow Steps**:

- Checkout code
- Setup Node.js and Rust
- Install dependencies
- Build frontend
- Build Tauri app
- Sign installers
- Create GitHub Release
- Upload assets and `latest.json`

### Step 4: Verify Release

After the workflow completes (wait 5-15 minutes):

1. **Check GitHub Release**:

   - Go to: `https://github.com/yossi-weinberger/ten10/releases`
   - Find your new release
   - Verify it contains:
     - Windows installer (`.msi` or `.exe`)
     - Signature file (`.sig`)
     - `latest.json` file
     - Release notes (auto-generated)

2. **Download and Install**:

   - Download the `.msi` file
   - Install it on a test machine
   - Verify the app launches correctly

3. **Check Settings Page**:

   - Open Settings in the installed app
   - Verify version number is correct
   - Verify "Version Info" card appears below Language & Display
   - Click "Check for Updates" (if newer version exists)

4. **Test Update Flow** (if previous version exists):

   - Install the previous version on a test machine
   - Launch the app - it should detect the update automatically
   - Or manually check: Settings > Version Info > Check for Updates
   - Verify the update downloads and installs correctly
   - Check that the app launches with the new version

5. **Check Landing Page**:
   - Visit: `https://ten10-app.com/landing`
   - Scroll to download section
   - Verify correct version is displayed
   - Verify download link works

## File Structure

### Generated Files (in GitHub Release)

- `Ten10_0.3.0_x64.msi` - Windows installer (MSI)
- `Ten10_0.3.0_x64-setup.exe` - Windows installer (NSIS, if configured)
- `Ten10_0.3.0_x64.msi.sig` - Signature for MSI
- `Ten10_0.3.0_x64-setup.exe.sig` - Signature for NSIS
- `latest.json` - Update manifest

### latest.json Structure

```json
{
  "version": "0.3.0",
  "pub_date": "2025-01-09T10:30:00Z",
  "url": "https://github.com/yossi-weinberger/ten10/releases/download/v0.3.0/Ten10_0.3.0_x64.msi.zip",
  "signature": "dW50cnVzdGVkIGNvbW1lbnQ6...",
  "notes": "Release notes here"
}
```

## Update Flow

### Desktop App Startup

1. App launches
2. Updater plugin checks: `https://github.com/yossi-weinberger/ten10/releases/latest/download/latest.json`
3. Compares `version` in JSON with current version
4. If newer version found:
   - Verifies signature using public key
   - Shows notification or dialog
   - User can install immediately or later

### Manual Check

1. User goes to Settings > Version Info
2. Clicks "Check for Updates"
3. Frontend calls `checkForUpdates()` from `updater.service.ts`
4. Same flow as above
5. If update available, shows "Install Update" button

### Landing Page

1. User visits `/landing`
2. `useLatestRelease` hook fetches from GitHub API
3. Shows Windows download button with latest version badge
4. Direct download link from GitHub Release

## Troubleshooting

### Build Fails on GitHub Actions

**Error**: "TAURI_PRIVATE_KEY not found"

- **Fix**: Ensure `TAURI_PRIVATE_KEY` secret is set correctly in GitHub

**Error**: "Invalid signature"

- **Fix**: Regenerate keys and update `tauri.conf.json` and GitHub Secrets

**Error**: "Failed to build"

- **Fix**: Check workflow logs, ensure all dependencies are installed

### Update Check Fails

**Error**: "Failed to check for updates"

- **Fix**: Check that `latest.json` exists in GitHub Release
- **Fix**: Verify updater endpoint URL in `tauri.conf.json`

**Error**: "Invalid signature"

- **Fix**: Ensure public key in `tauri.conf.json` matches private key used to sign

### Version Mismatch

**Problem**: App shows wrong version

- **Fix**: Ensure all three version files are synchronized
- **Fix**: Rebuild the app after version update

**Error**: "Found version mismatched Tauri packages"

```
tauri-plugin-updater (v2.0.0) : @tauri-apps/plugin-updater (v2.9.0)
```

- **Cause**: Rust crate versions don't match npm package versions
- **Fix**: Update versions in `Cargo.toml` to match `package.json`
- Run `npm install` after updating dependencies

### Environment Variable Errors

**Error**: "Missing environment variable: VITE_SUPABASE_URL" (in installed app)

- **Cause**: GitHub Actions build doesn't have access to `.env` file
- **Fix**: Add to GitHub Secrets:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- **Why**: Desktop app is offline, but `supabaseClient.ts` is imported during build and validates these vars

**Error**: "Failed to resolve import @tauri-apps/..." (during GitHub Actions build)

- **Cause**: Standalone `npm run build` in CI tries to bundle Tauri modules
- **Fix**: Already handled in `vite.config.ts`:
  ```typescript
  const isCIBuild = process.env.CI === "true";
  external: isVercel || isCIBuild ? [/^@tauri-apps\//] : [];
  ```
- Vite automatically excludes Tauri modules in CI builds

### Permission Errors

**Error**: "updater.check not allowed. Permissions: updater:allow-check"

- **Cause**: Missing updater permissions in Tauri v2 capabilities
- **Fix**: Add to `src-tauri/capabilities/migrated.json` permissions array:
  ```json
  "updater:default",
  "updater:allow-check",
  "updater:allow-download",
  "updater:allow-install"
  ```

**Error**: "Could not fetch a valid release JSON from the remote"

- **Cause**: No release exists yet, or network issue
- **Fix**: Create at least one release first
- Verify endpoint URL in `tauri.conf.json` under `plugins.updater.endpoints`

## Versioning Strategy

### Semantic Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR.MINOR.PATCH** (e.g., `1.2.3`)
- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards-compatible)
- **PATCH**: Bug fixes (backwards-compatible)

### Pre-release Versions

For testing:

- `v0.3.0-beta.1` - Beta release
- `v0.3.0-rc.1` - Release candidate
- `v0.3.0-test` - Test build

**Note**: Pre-release tags should not trigger production updates.

## Security Considerations

### Private Key Security

⚠️ **CRITICAL**: The private key (`TAURI_PRIVATE_KEY`) must be kept secret:

- ✅ Store in GitHub Secrets (encrypted)
- ✅ Keep local copy in secure location (encrypted drive)
- ✅ Never commit to repository
- ✅ Limit access to authorized personnel only
- ❌ Never share via email/chat
- ❌ Never store in plain text

If compromised:

1. Immediately revoke access
2. Generate new keys
3. Update all deployments
4. Invalidate old releases (if possible)

### Signature Verification

Every update is verified:

1. Updater downloads installer
2. Downloads signature file
3. Verifies signature using public key in `tauri.conf.json`
4. Only installs if signature is valid

This prevents:

- Man-in-the-middle attacks
- Tampered installers
- Unauthorized updates

## Best Practices

### Before Release

- ✅ Test on clean Windows installation
- ✅ Verify version numbers are synchronized
- ✅ Check that all features work
- ✅ Run linter and fix errors
- ✅ Update changelog (if you maintain one)
- ✅ Test update from previous version

### During Release

- ✅ Use descriptive tag messages
- ✅ Follow conventional commit format
- ✅ Monitor build process
- ✅ Verify artifacts after build

### After Release

- ✅ Test the update process
- ✅ Check download links on landing page
- ✅ Monitor for user issues
- ✅ Keep release notes updated

## Automation Opportunities

### Future Improvements

1. **Version Bump Script**

   ```bash
   ./scripts/bump-version.sh 0.3.0
   ```

   Automatically updates all three version files.

2. **Changelog Generation**

   - Auto-generate from commit messages
   - Use conventional commits
   - Include in release notes

3. **Multi-Platform Builds**

   - Add macOS build to workflow
   - Add Linux build to workflow
   - Conditional builds based on platform

4. **Release Notifications**
   - Send email to users
   - Post on social media
   - Update website automatically

## Resources

### Documentation

- [Tauri Updater Documentation](https://tauri.app/v1/guides/distribution/updater/)
- [Tauri v2 Migration Guide](https://beta.tauri.app/guides/migrate/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

### Internal Guides

- `setup-updater-keys.md` - Updater keys setup (detailed instructions)
- `code-signing-guide.md` - Windows code signing (not yet implemented)
- `../../README.md` - Project overview

### Tools

- [Tauri CLI](https://github.com/tauri-apps/tauri) - Build and sign
- [GitHub CLI](https://cli.github.com/) - Manage releases from terminal
- [semantic-release](https://github.com/semantic-release/semantic-release) - Automate versioning

## FAQ

**Q: How often should we release updates?**
A: Based on changes - typically every 2-4 weeks for minor releases, immediately for critical fixes.

**Q: Can users skip updates?**
A: Yes, updates are optional. Users can decline and check manually later.

**Q: What if a bad update is released?**
A: Create a hotfix release immediately with incremented version. The updater will detect the newer version.

**Q: How do we handle breaking changes?**
A: Increment MAJOR version, communicate clearly in release notes, consider data migration path.

**Q: Can we rollback a release?**
A: Delete the GitHub Release and tag. Users who already updated will need to reinstall manually.

## Setup Checklist for New Developers

Before creating your first release, complete this checklist:

- [ ] Generate signing keys with `npx @tauri-apps/cli signer generate -w $env:USERPROFILE\.tauri\ten10.key`
- [ ] Save the password you entered
- [ ] Save private key: `C:\Users\[YOU]\.tauri\ten10.key` (keep SECRET!)
- [ ] Get public key: `Get-Content $env:USERPROFILE\.tauri\ten10.key.pub`
- [ ] Add 4 secrets to GitHub: `TAURI_PRIVATE_KEY`, `TAURI_KEY_PASSWORD`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- [ ] Update `src-tauri/tauri.conf.json` with public key (line 39)
- [ ] Commit the updated `tauri.conf.json`: `git commit -m "chore: configure updater public key"`
- [ ] Test release: `npm run release 0.2.14-test` (use test version)
- [ ] Verify build succeeded in GitHub Actions
- [ ] Download and install the `.msi` file
- [ ] Verify app launches successfully
- [ ] Check Settings page - "Version Info" card appears below Language & Display
- [ ] Test "Check for Updates" button (if newer version exists)
- [ ] Verify landing page shows correct download link

**Note**: Use PowerShell commands on Windows. For Unix/Mac, use `~/.tauri/ten10.key` instead of `$env:USERPROFILE\.tauri\ten10.key`.

---

**Last Updated**: January 2025
**Maintainer**: Ten10 Development Team
**Version**: 1.0
