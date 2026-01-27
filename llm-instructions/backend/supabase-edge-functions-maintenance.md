# Supabase Edge Functions Maintenance Guide

## Overview

This guide explains how to maintain and update the Supabase Edge Functions in the Ten10 project.
The most critical aspect is **Dependency Management** to prevent production outages.

## 1. Dependency Strategy: "Pin & Forget"

We use a **Strict Version Pinning** strategy for all external dependencies (imports starting with `https://esm.sh/...`).

### Why?

Supabase Edge Functions run on Deno. When you use dynamic imports like `@2` or `@latest`, the external CDN (`esm.sh`) might serve a newer version of the library that is incompatible with the specific Deno runtime version used by Supabase. This has caused production outages in the past.

### The Rule

**ALWAYS** specify the full version number.

- ❌ BAD: `import ... from "https://esm.sh/@supabase/supabase-js@2"`
- ✅ GOOD: `import ... from "https://esm.sh/@supabase/supabase-js@2.39.0"`

## 2. When to Update?

You do **NOT** need to update these dependencies frequently.
Edge Functions are backend infrastructure; stability is more important than having the absolute latest features.

**Update only if:**

1.  **Security Vulnerability:** A critical security flaw is reported in the version we use.
2.  **New Feature Needed:** You need a specific new Supabase feature not available in v2.39.0.
3.  **Supabase Runtime Update:** Supabase officially deprecates the old runtime (rare).

## 3. How to Update Safely

If you decide to update, follow this process:

1.  **Check Latest Version:** Visit [npmjs.com/package/@supabase/supabase-js](https://www.npmjs.com/package/@supabase/supabase-js) to see the latest version.
2.  **Update One Function First:**
    - Change the import in _one_ non-critical function (e.g., `send-cron-alerts`).
    - Deploy it: `npx supabase functions deploy send-cron-alerts`
    - **TEST IT:** Run the function manually (curl/Postman) or trigger it.
    - Check logs for "Module not found" or "URL" errors.
3.  **Update All Functions:**
    - If the test passes, update all other functions.
    - Update the `SAFE_VERSION` constant in `scripts/check-supabase-imports.js`.
    - Update the rule in `.cursor/rules/supabase-edge-functions.mdc`.
4.  **Verify:** Run `npm run check-supabase-imports` to ensure no files were missed.

## 4. Routine Maintenance (Optional)

**Frequency:** Every 6 months.

- Run `npm run check-supabase-imports` to verify compliance.
- Review Supabase changelogs to see if there are major breaking changes coming to the Edge Runtime.

## Summary

> "If it ain't broke, don't fix it."

Stick to the pinned version (currently `2.39.0`) as long as it works. This guarantees that your cron jobs won't wake you up at 2 AM with errors.
