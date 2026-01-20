# Security Hardening - January 2026

This document summarizes security improvements made based on an OWASP Top 10 assessment.

## Overview

| Category | Status | Risk Level |
|----------|--------|------------|
| CORS Configuration | ✅ Fixed | Critical |
| RLS Policies (download tables) | ✅ Fixed | High |
| CSP for Desktop App | ✅ Fixed | Medium |
| SQL Function search_path | ✅ Fixed | Medium |
| RLS Policy Optimization | ✅ Fixed | Performance |
| Database Version | ✅ Updated | Medium |
| Leaked Password Protection | ✅ Enabled | Medium |

---

## 1. CORS Configuration (Edge Functions)

**Problem**: All Edge Functions used `Access-Control-Allow-Origin: "*"` which allows any website to make requests.

**Solution**: Implemented dynamic CORS with origin whitelist.

**File**: `supabase/functions/_shared/cors.ts`

```typescript
export const getCorsHeaders = (origin: string | null) => {
  const ALLOWED_ORIGINS = [
    "https://ten10-app.com",
    "https://www.ten10-app.com",
    "http://localhost:5173",      // development
    "http://127.0.0.1:54321",     // Supabase local
  ];

  // Allowed origin - echo it back with credentials
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Credentials": "true",
    };
  }

  // No origin (server-to-server) - use first allowed origin
  if (!origin) {
    return {
      "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Credentials": "true",
    };
  }

  // Disallowed origin - return 'null' to block
  return {
    "Access-Control-Allow-Origin": "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
};
```

**Usage in Edge Functions**:
```typescript
serve(async (req) => {
  const origin = req.headers.get("origin");
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }
  
  // ... function logic ...
  
  return new Response(JSON.stringify(data), {
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });
});
```

**Updated Functions**:
- `get-monitoring-data`
- `process-email-request`
- `send-contact-email`
- `send-new-user-email`
- `send-reminder-emails`
- `verify-captcha`
- `verify-unsubscribe-token`

---

## 2. RLS Policies for Download Tables

**Problem**: `download_rate_limits` and `download_requests` tables had RLS enabled but no policies, making them inaccessible.

**Solution**: Created strict policies allowing only `service_role` access.

**Migration**: `20260120_secure_download_tables.sql`

```sql
ALTER TABLE IF EXISTS public.download_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.download_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.download_rate_limits
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON public.download_requests
  FOR ALL USING (auth.role() = 'service_role');
```

---

## 3. Content Security Policy (Tauri Desktop)

**Problem**: CSP was disabled (`"csp": null`), leaving the desktop app vulnerable to XSS.

**Solution**: Implemented strict CSP.

**File**: `src-tauri/tauri.conf.json`

```json
{
  "app": {
    "security": {
      "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' asset: https: data:; connect-src 'self' https://api.github.com https://objects.githubusercontent.com https://github.com https://*.supabase.co;"
    }
  }
}
```

**CSP Breakdown**:
- `default-src 'self'` - Only load resources from app origin
- `script-src 'self'` - Only execute scripts from app
- `style-src 'self' 'unsafe-inline'` - Allow inline styles (required for many UI libraries)
- `img-src 'self' asset: https: data:` - Allow images from various sources
- `connect-src` - Whitelist for network requests:
  - `'self'` - Local Tauri backend
  - `https://api.github.com` - Auto-updater
  - `https://objects.githubusercontent.com` - Download releases
  - `https://github.com` - Release assets
  - `https://*.supabase.co` - Supabase API (if needed)

---

## 4. SQL Function search_path Fix

**Problem**: 27 SQL functions had mutable `search_path`, creating potential injection vulnerabilities (OWASP A03:2021).

**Solution**: Set explicit `search_path = public` on all functions.

**Migration**: `20260120_fix_search_path_all_functions.sql`

```sql
ALTER FUNCTION public.function_name(...) SET search_path = public;
```

**Functions Fixed** (27 total):
- `calculate_new_next_due_date`
- `calculate_user_tithe_balance`
- `clear_all_user_data`
- `delete_recurring_transaction`
- `delete_user_transaction`
- `execute_due_recurring_transactions`
- `export_user_transactions`
- `get_monthly_financial_summary`
- `get_paginated_transactions`
- `get_recurring_transaction_by_id`
- `get_reminder_users_with_emails`
- `get_total_donations_for_user`
- `get_total_expenses_for_user`
- `get_total_income_and_chomesh_for_user`
- `get_user_recurring_transactions` (4 overloads)
- `get_user_transactions` (2 overloads)
- `handle_contact_form` (2 overloads)
- `handle_new_user`
- `handle_updated_at`
- `increment_download_count`
- `log_rls_values`
- `update_recurring_transaction`
- `update_user_preferences`
- `update_user_transaction`

---

## 5. RLS Policy Optimization

**Problem**: RLS policies used `auth.uid()` directly, which evaluates per-row instead of once per query.

**Solution**: Wrap in `(select auth.uid())` for single evaluation.

**Migration**: `20260120_optimize_rls_policies.sql`

**Before**:
```sql
CREATE POLICY "Allow read access" ON transactions
  FOR SELECT USING (user_id = auth.uid());
```

**After**:
```sql
CREATE POLICY "Allow read access" ON transactions
  FOR SELECT USING (user_id = (select auth.uid()));
```

**Optimized Tables**:
- `transactions` (4 policies)
- `recurring_transactions` (1 policy)
- `profiles` (3 policies)
- `contact_messages` (2 policies)

---

## 6. Database Version Update

Updated PostgreSQL to version 17.6.1.063 for latest security patches.

---

## 7. Leaked Password Protection

Enabled HaveIBeenPwned integration in Supabase Auth to prevent users from using compromised passwords.

**Configuration**: Supabase Dashboard → Authentication → Settings → Enable "Leaked Password Protection"

---

## Verification Commands

### Check SQL Functions have search_path
```sql
SELECT p.proname, 
  CASE WHEN p.proconfig IS NOT NULL AND array_to_string(p.proconfig, ',') LIKE '%search_path%' 
  THEN 'YES' ELSE 'NO' END AS has_search_path
FROM pg_proc p 
JOIN pg_namespace n ON p.pronamespace = n.oid 
WHERE n.nspname = 'public' AND p.prokind = 'f';
```

### Check RLS Policies
```sql
SELECT tablename, policyname, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public';
```

### Test CORS from Browser Console
```javascript
fetch('https://flpzqbvbymoluoeeeofg.supabase.co/functions/v1/verify-captcha', {
  method: 'OPTIONS',
  headers: { 'Origin': 'https://evil-site.com' }
}).then(r => console.log(r.headers.get('Access-Control-Allow-Origin')));
// Should return 'null' (blocked)
```

---

## Migration Files

All migrations are in `supabase/migrations/`:

1. `20260120_secure_download_tables.sql` - RLS for download tables
2. `20260120_fix_search_path_all_functions.sql` - search_path fix
3. `20260120_optimize_rls_policies.sql` - RLS optimization

---

## Future Considerations

1. **Rate Limiting**: Consider adding rate limiting to public Edge Functions
2. **Input Validation**: Audit all user inputs for proper sanitization
3. **Audit Logging**: Consider logging security-relevant events
4. **Regular Updates**: Keep Supabase CLI and dependencies updated
