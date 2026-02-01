# Public Stats Feature – Summary and Future Options

This document describes what was implemented (and later reverted) for "public stats" on the landing page, and what can be done in the future.

---

## Goal

- **Landing page stats:** Show real numbers for "downloads" and "website users" instead of hardcoded values.
- **Sources:**  
  - **Downloads:** Direct installer downloads (GitHub Releases MSI+EXE) + email download requests (Jumbo Mail) from DB table `download_requests` (status = 'sent').  
  - **Website users:** Count from `profiles` table in Supabase.
- **Security:** No direct DB access from the client; only a backend or a pre-generated file should expose these numbers.
- **Offline / fallback:** When the app cannot fetch (no network or file not yet updated), show sensible fallback numbers.

---

## What Was Implemented (Reverted)

### 1. Single JSON file + one workflow

- **File:** `.github/public-stats.json` with: `website_users`, `installer_downloads`, `email_downloads`, `total_downloads`, `updated_at`.
- **Workflow:** `.github/workflows/update-public-stats.yml`  
  - Triggers: schedule (weekly), `workflow_dispatch`, push to `main` (when workflow/script changed).  
  - Steps: checkout, `npm ci`, run `scripts/update-public-stats.js` (Supabase + GitHub API), then "Create Pull Request" (peter-evans/create-pull-request@v7) so the JSON is updated via PR instead of direct push to `main` (branch protection).
- **Script:** `scripts/update-public-stats.js`  
  - Fetches: `COUNT(profiles)`, `COUNT(download_requests WHERE status='sent')`, GitHub Releases MSI+EXE sum (with pagination).  
  - Writes `.github/public-stats.json`.  
  - Requires: `GITHUB_TOKEN`; optional: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (repo secrets).

### 2. Client

- **Hook:** `usePublicStats` – fetches `.github/public-stats.json` from `raw.githubusercontent.com/.../main/.github/public-stats.json`; on failure uses localStorage cache (7 days) or `FALLBACK_OFFLINE_STATS` (e.g. 2450 users, 1850 downloads). When the fetched data was "unpopulated" (0,0, no `updated_at`), the hook also used the same fallback.
- **StatsSection:** Used `usePublicStats` for both stats; "downloads" = `total_downloads`, "website users" = `website_users`; optional "As of {{date}}" / "נכון לתאריך {{date}}" from `updated_at`.
- **useCountUp:** Extended so that when `end` changed after the animation started, the animation was cancelled and the count updated to the new `end` (avoiding a race where the counter jumped back).

### 3. README badge

- Badge pointed at `.github/public-stats.json` and `$.installer_downloads` (same semantics as before, different file).

### 4. Why it was reverted

- Workflow visibility: the new workflow only appeared in the Actions list after it existed on `main`; running it manually sometimes failed (e.g. create-pull-request step; exact cause may depend on repo settings/branch state).
- Desire to step back and rethink the overall approach before keeping this in production.

---

## Current State (After Revert)

- **Landing:** "Downloads" comes from `useInstallerDownloadCount` (`.github/downloads.json`); "Website users" is hardcoded (2450).
- **Workflow:** Only `update-downloads-badge.yml` – updates `.github/downloads.json` (installer count from GitHub API); push to `main` may fail if branch protection requires PRs.
- **README badge:** Points at `.github/downloads.json` and `$.installer_downloads`.

Commits that added the public-stats feature remain in history; the working tree was reverted to the state before that feature.

---

## Future Options

1. **Reintroduce public-stats with the same design**  
   Restore: `.github/public-stats.json`, workflow, script, `usePublicStats`, StatsSection + "As of" text, and README badge. Fix workflow (e.g. branch name, permissions, or merge strategy) so the PR is created and merged reliably.

2. **Keep one file, simplify workflow**  
   Same JSON file and script; run the workflow on a schedule + manual; if branch protection blocks push, either:  
   - Use a repo setting that allows the Actions bot to push to `main` for specific paths (e.g. `.github/*.json`), or  
   - Keep creating a PR and merge it (manually or with auto-merge).

3. **Backend-only exposure**  
   Instead of a file in the repo: an Edge Function (or similar) that runs on a schedule, reads from DB + GitHub API, and writes to a single row in a table (e.g. `public_stats`) or to storage. Client calls that endpoint or reads from storage; no GitHub workflow writing to the repo.

4. **Only installer downloads (no DB)**  
   Keep the current `.github/downloads.json` + `update-downloads-badge.yml` for the badge and for "downloads" on the landing; leave "website users" hardcoded or remove it until a backend/public-stats solution is in place.

5. **Fallback and "As of" again**  
   When re-adding any live stats: keep a fallback (cache + default numbers) when fetch fails or data is unpopulated, and optional "As of &lt;date&gt;" when `updated_at` is present.

---

## Relevant Paths (for re-implementation)

| Item | Path |
|------|------|
| Workflow (reverted) | `.github/workflows/update-public-stats.yml` |
| Script (reverted) | `scripts/update-public-stats.js` |
| JSON (reverted) | `.github/public-stats.json` |
| Hook (reverted) | `src/hooks/usePublicStats.ts` |
| Downloads badge workflow | `.github/workflows/update-downloads-badge.yml` |
| Downloads JSON | `.github/downloads.json` |
| Landing stats UI | `src/pages/landing/sections/StatsSection.tsx` |
| Installer count hook | `src/hooks/useInstallerDownloadCount.ts` |
| DB: profiles count | Supabase `profiles` |
| DB: email downloads | Supabase `download_requests` where `status = 'sent'` |

The full implementation can be reconstructed from the commit history and this summary.
