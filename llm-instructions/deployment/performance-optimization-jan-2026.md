# Performance Optimization - January 2026

## Overview

This document describes performance optimizations applied to the Ten10 application based on Lighthouse and WebPageTest analysis.

## Problem Statement

Initial performance audit revealed:

- **Bundle size**: ~1.3MB main bundle (57% unused on initial load)
- **LCP**: 2.2-4 seconds
- **CLS**: 0.24 (above 0.1 threshold)
- **Service Worker**: Precaching all assets (~1.3MB) on first visit
- **Cache headers**: Only 4 hours for hashed assets

## Changes Made

### 1. Preload/Preconnect (index.html)

**File**: `index.html`

Added early resource hints to speed up critical resource loading:

```html
<!-- Performance: Preconnect to external origins -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- Performance: Preload LCP image -->
<link rel="preload" as="image" href="/background.webp" type="image/webp" />
```

**Why**:

- Preconnect saves ~100-300ms of DNS/TCP/TLS time for Google Fonts
- Preload tells browser to fetch LCP image immediately instead of waiting for CSS

### 2. Cache Headers (vercel.json)

**File**: `vercel.json`

Added immutable cache headers for hashed assets:

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/workbox-(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

**Why**:

- Files with content hashes (e.g., `index-D0i9J_aZ.js`) never change
- Cache for 1 year instead of 4 hours = faster repeat visits
- `immutable` tells browser not to even revalidate

### 3. Code Splitting (routes.ts)

**File**: `src/routes.ts`

Changed from synchronous imports to lazy loading using TanStack Router's `lazyRouteComponent`:

**Before**:

```typescript
import { HalachaPage } from "./pages/HalachaPage";
import { SettingsPage } from "./pages/SettingsPage";
// ... all pages imported synchronously
```

**After**:

```typescript
import { lazyRouteComponent } from "@tanstack/react-router";

// Critical pages (loaded synchronously)
import { HomePage } from "./pages/HomePage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import { NotFoundPage } from "./pages/NotFoundPage";

// Lazy-loaded pages
const HalachaPage = lazyRouteComponent(
  () => import("./pages/HalachaPage"),
  "HalachaPage"
);
const SettingsPage = lazyRouteComponent(
  () => import("./pages/SettingsPage"),
  "SettingsPage"
);
// ... etc
```

**Pages kept synchronous**:

- HomePage (default route)
- LandingPage (marketing entry point)
- LoginPage, SignupPage (auth flow)
- NotFoundPage (always needed)

**Pages now lazy-loaded** (15 total):

- AddTransactionPage
- HalachaPage
- SettingsPage
- AboutPage
- ProfilePage
- AnalyticsPage
- TransactionsTable
- RecurringTransactionsTable
- ForgotPasswordPage
- ResetPasswordPage
- UnsubscribePage
- PrivacyPage
- TermsPage
- AccessibilityPage
- AdminDashboardPage

**Why**:

- Users don't need all pages on initial load
- Each lazy page becomes a separate chunk
- Heavy dependencies (pdf-lib, exceljs) only load when needed

### 4. CLS Fix (MonthlyChart.tsx)

**File**: `src/components/dashboard/MonthlyChart.tsx`

Added consistent height to prevent layout shifts:

```typescript
// Consistent container height to prevent CLS
const chartContainerHeight = "min-h-[400px] md:min-h-[500px]";
```

Applied to all states (loading, error, empty, data).

**Why**:

- Chart container was changing height between states
- This caused visible layout shift (CLS score: 0.24)

### 5. Minimal Service Worker (vite.config.ts)

**File**: `vite.config.ts`

Changed workbox configuration to not precache assets:

**Before**:

```typescript
workbox: {
  maximumFileSizeToCacheInBytes: 5000000, // 5MB - precache everything!
}
```

**After**:

```typescript
workbox: {
  // Minimal SW: No precaching to improve initial load performance
  // The SW is still registered to enable PWA/TWA installation
  // Offline functionality is only relevant for Desktop (Tauri) which doesn't use SW
  globPatterns: [], // Empty array = no precaching
  navigateFallback: null, // Disable navigation fallback (requires network)
  // Workbox requires either precaching or runtimeCaching. Use NetworkOnly to avoid caching.
  runtimeCaching: [
    {
      urlPattern: /.*/i,
      handler: "NetworkOnly",
    },
  ],
}
```

**Why**:

- Offline functionality only needed for Desktop (Tauri) - not web
- SW was downloading ~1.3MB of assets on first visit
- PWA/TWA still work - they only need manifest + registered SW

**Result**:

- Build succeeds (no Workbox validation error)
- Service worker is generated and registered
- No precache entries are generated (0 entries)

### 6. Web App Manifest: single source of truth (vite.config.ts + index.html)

To avoid confusing dual-manifest behavior:

- The app uses a single manifest: `public/manifest.json` referenced from `index.html`.
- `vite-plugin-pwa` is configured with `manifest: false` to prevent injecting `manifest.webmanifest` into the final HTML.

## Build Output

After changes, `npm run build` produces 40 separate chunks:

| Chunk                    | Size  | Purpose                                  |
| ------------------------ | ----- | ---------------------------------------- |
| index-\*.js              | 3.7MB | Core app (still large - see Future Work) |
| TransactionsTable-\*.js  | 17KB  | Transactions page                        |
| SettingsPage-\*.js       | 37KB  | Settings page                            |
| AdminDashboardPage-\*.js | 33KB  | Admin dashboard                          |
| ...                      | ...   | 36 more chunks                           |

## Expected Improvements

| Metric         | Before         | After (Expected)   |
| -------------- | -------------- | ------------------ |
| SW precache    | ~1.3MB         | ~50KB (icons only) |
| Cache duration | 4 hours        | 1 year             |
| LCP            | 2.2-4s         | ~1.5-2s            |
| Repeat visits  | Revalidate all | Instant from cache |

## Verification Steps

### Functional Testing

1. Check all pages load correctly
2. Verify PWA install prompt appears in Chrome
3. Test export functionality (PDF/Excel)
4. Verify TWA still works (if applicable)

### Performance Testing

1. Run Lighthouse in Chrome Incognito (no extensions)
2. Run multiple times and take median
3. Compare production-to-production (not preview)

## Additional Optimizations (January 2026 - Session 2)

### 7. i18n Bundled Translations

**File**: `src/lib/i18n.ts`

**Problem**: All 22 translation namespaces were loaded via HTTP requests on startup, causing ~8.7 seconds of blocking time.

**Solution**: Bundle critical namespaces statically, lazy-load the rest.

```typescript
// Import critical translations statically (bundled)
import common_he from "../../public/locales/he/common.json";
import dashboard_he from "../../public/locales/he/dashboard.json";
// ... etc

const bundledResources = { en: {...}, he: {...} };

i18n.init({
  resources: bundledResources,
  partialBundledLanguages: true,
  ns: ["common", "navigation", "dashboard", "auth", "contact"], // Only bundled
  preload: [], // Don't preload others
});
```

**Result**: i18n init dropped from ~8.7s to ~0.3s (96% faster)

### 8. Session Cache (supabaseClient.ts)

**Problem**: `getSession()` was called twice during app init (once in routes.ts, once in AuthContext), each taking ~1.5s.

**Solution**: Added a shared session cache to prevent duplicate network requests.

```typescript
let cachedSessionPromise = null;
export async function getCachedSession() {
  if (cachedSessionPromise) return cachedSessionPromise;
  cachedSessionPromise = supabase.auth.getSession();
  return cachedSessionPromise;
}
```

**Result**: Single network request shared between routes and AuthContext.

### 9. Vite optimizeDeps (vite.config.ts)

**Problem**: Vite dev server was slow to start due to on-demand transpilation of heavy dependencies.

**Solution**: Pre-bundle heavy dependencies.

```typescript
optimizeDeps: {
  include: [
    "react", "react-dom", "@supabase/supabase-js",
    "@tanstack/react-router", "framer-motion", "recharts",
    "i18next", "react-i18next", "zustand", "date-fns", // etc
  ],
},
```

**Note**: This mainly helps dev mode. Production builds are already optimized.

### 10. Synchronous Platform Detection for Web (January 2026)

**Files**: `src/contexts/PlatformContext.tsx`, `src/App.tsx`, `src/lib/platformManager.ts`, `src/routes.ts`

**Problem**: LandingPage and other public pages showed a loader for ~500ms even though no async operations were needed for web.

**Root causes identified:**
1. `beforeLoad` in routes.ts called `getCachedSession()` even for public routes (~230ms)
2. `PlatformContext` started with `"loading"` state and showed `AppLoader` while detecting platform
3. `App.tsx` started with `isAppReady=false` and returned `null` during init

**Solution**: Synchronous platform detection for web:

```typescript
// PlatformContext.tsx - Synchronous initial state
const getInitialPlatform = (): Platform => {
  // @ts-expect-error __TAURI_INTERNALS__ is injected by Tauri
  if (window.__TAURI_INTERNALS__) {
    return "loading"; // Desktop needs async verification
  }
  return "web"; // Web detected synchronously - no loader needed!
};

// App.tsx - Web ready immediately
const [isAppReady, setIsAppReady] = useState(() => !window.__TAURI_INTERNALS__);

// routes.ts - Skip session check for public routes
if (PUBLIC_ROUTES.includes(location.pathname)) {
  return; // Skip session check for public routes
}
```

**Result**:
- Web LandingPage: 581ms → **26ms** (95% faster, no loader)
- Desktop: Still shows AppLoader during init (correct behavior)

### 11. Desktop Init Guard - Prevent Duplicate Initialization (January 2026)

**File**: `src/App.tsx`

**Problem**: The desktop initialization `useEffect` had `[platform, t]` as dependencies. When a user changed language, the `t` (translation function) reference changed, causing the effect to re-run. Since `platform === "desktop"` remained true, this re-executed the entire initialization sequence including `init_db` and `execute_due_recurring_transactions_handler`.

**Risk Assessment**: While these functions are idempotent (safe to run multiple times), re-running them was unnecessary overhead and could cause duplicate toast notifications.

**Solution**: Use `useRef` to prevent re-initialization:

```typescript
// Ref to track if desktop init already ran
const desktopInitDone = useRef(false);

// Ref to access latest t without adding to dependencies
const tRef = useRef(t);
tRef.current = t; // Always keep ref up to date

useEffect(() => {
  if (platform === "desktop") {
    if (desktopInitDone.current) return; // Guard against re-runs
    desktopInitDone.current = true;
    
    // ... init code using tRef.current instead of t
  }
}, [platform]); // Removed t from dependencies
```

**Benefits**:
- Desktop init runs exactly once per app lifecycle
- Language changes no longer trigger re-initialization
- Toast notifications (e.g., "Update available") only appear once

## Future Work

The main bundle is still large (~3.7MB) due to:

- `recharts` used on HomePage (MonthlyChart)
- `framer-motion` used for animations
- Many Radix UI components

Potential further optimizations:

1. Lazy load MonthlyChart component
2. Use lighter charting library
3. Tree-shake Radix UI imports
4. Analyze bundle with `npx vite-bundle-visualizer`

## Related Files

- `index.html` - Preload/preconnect tags
- `vercel.json` - Cache headers
- `src/routes.ts` - Route code splitting
- `src/components/dashboard/MonthlyChart.tsx` - CLS fix
- `vite.config.ts` - Minimal SW configuration

---

**Date**: January 4, 2026
**Author**: AI Assistant + User Collaboration
