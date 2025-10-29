# Language Synchronization Fix

## Problem Description

When users opened the website for the first time on a new device, there was a mismatch between:
- The actual displayed language (controlled by i18n)
- The selected language shown in Settings (stored in Zustand)

This created a situation where the site displayed in English, but the Settings showed Hebrew as selected.

## Root Cause

There were two independent language management systems that were not synchronized:

1. **i18n (Translation Manager)**
   - Initialized in `src/lib/i18n.ts`
   - Used `LanguageDetector` to detect browser language
   - On first visit, could detect English from browser settings
   - Stored its language preference in `localStorage` under `i18nextLng`

2. **Zustand Store (Settings Manager)**
   - Initialized in `src/lib/store.ts`
   - Default language always set to Hebrew (`"he"`)
   - Stored settings in `localStorage` under `Ten10-donation-store`

**The Issue:** These two systems never communicated with each other, creating a race condition where:
- i18n would load first and select English (from browser)
- Zustand would load and think the language is Hebrew
- UI would display in English while Settings showed Hebrew selected

## Solution Implemented

### 1. Enhanced i18n Initialization (`src/lib/i18n.ts`)

Added a function to read the language from Zustand's localStorage on startup:

```typescript
const getInitialLanguage = (): string => {
  try {
    const storedData = localStorage.getItem("Ten10-donation-store");
    if (storedData) {
      const parsed = JSON.parse(storedData);
      if (parsed?.state?.settings?.language) {
        return parsed.state.settings.language;
      }
    }
  } catch (error) {
    console.error("Failed to read language from Zustand store:", error);
  }
  return "he"; // fallback to Hebrew
};
```

Configured i18n to:
- Use the Zustand language as initial language
- Added proper `detection` configuration
- Set language detection order: `localStorage` → `navigator` → `htmlTag`

### 2. Added Language Synchronization in App.tsx

Added a `useEffect` hook that synchronizes i18n with Zustand after hydration:

```typescript
const settings = useDonationStore((state) => state.settings);
const _hasHydrated = useDonationStore((state) => state._hasHydrated);

useEffect(() => {
  if (_hasHydrated && i18n.language !== settings.language) {
    console.log(
      `[i18n-sync] Synchronizing language: i18n=${i18n.language}, Zustand=${settings.language}`
    );
    (i18n as any).changeLanguage(settings.language);
  }
}, [_hasHydrated, settings.language, i18n]);
```

This ensures that after Zustand finishes loading persisted data, i18n is updated to match.

### 3. Fixed Settings Display (`src/components/settings/LanguageAndDisplaySettingsCard.tsx`)

Changed the language selector to display the actual active language from i18n:

```typescript
// Use the actual i18n language instead of Zustand to ensure sync
const currentLanguage = (i18n.language || "he") as "he" | "en";

// In the Select component
<Select
  value={currentLanguage}  // Now shows actual language
  onValueChange={(value) => handleLanguageChange(value as "he" | "en")}
  dir={i18n.dir()}
>
```

## Result

Now the language management works correctly:

1. **First Visit (New Device)**
   - i18n checks Zustand localStorage first
   - If no data exists, falls back to Hebrew (default)
   - Both systems start synchronized

2. **Returning User**
   - i18n reads language from Zustand localStorage
   - Zustand hydrates from localStorage
   - Sync check ensures they match

3. **Settings Page**
   - Always displays the actual active language from i18n
   - Changes update both i18n and Zustand simultaneously

## Files Modified

- `src/lib/i18n.ts` - Enhanced initialization and detection
- `src/App.tsx` - Added language synchronization logic
- `src/components/settings/LanguageAndDisplaySettingsCard.tsx` - Fixed display to show actual language

## Testing

To test the fix:
1. Clear browser localStorage
2. Open the site (should open in Hebrew by default)
3. Go to Settings - should show Hebrew selected
4. Change to English - should change immediately
5. Refresh page - should stay in English
6. Check Settings - should show English selected

