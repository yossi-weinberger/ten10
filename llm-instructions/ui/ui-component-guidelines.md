# UI Component Guidelines - Tooltips, Modals, and Floating Components

This document provides comprehensive guidelines for creating floating UI components like Tooltips, Modals, and Dropdowns in the Ten10 project, based on lessons learned and best practices.

## Table of Contents

1. [Tooltips - Core Guidelines](#1-tooltips---core-guidelines)
2. [Common Problems and Solutions](#2-common-problems-and-solutions)
3. [Implementation Examples](#3-implementation-examples)
4. [RTL/LTR Considerations](#4-rtlltr-considerations)
5. [Testing and Debugging](#5-testing-and-debugging)
6. [Project-Specific Examples](#6-project-specific-examples)
7. [Best Practices Summary](#7-best-practices-summary)
8. [Migration Guide](#8-migration-guide)
9. [Internationalization (i18n) and Theming Guidelines](#9-internationalization-i18n-and-theming-guidelines)
10. [Layout and Navigation Components](#10-layout-and-navigation-components)

---

## 1. Tooltips - Core Guidelines

### 1.1 Correct Architecture

**The Golden Rule:** There should be only ONE `TooltipProvider` in the entire application, and it should be at the highest level possible.

**Correct Structure:**

```tsx
// ✅ CORRECT - In App.tsx (global level)
<TooltipProvider>
  <div className="min-h-screen bg-background flex">
    {/* Entire application content */}
  </div>
</TooltipProvider>

// ✅ CORRECT - In individual components
<Tooltip>
  <TooltipTrigger asChild>
    <Button>Button</Button>
  </TooltipTrigger>
  <TooltipContent side="top">
    <p>Tooltip content</p>
  </TooltipContent>
</Tooltip>
```

**Incorrect Structure:**

```tsx
// ❌ WRONG - Multiple TooltipProviders
<TooltipProvider>
  <div>
    <TooltipProvider>
      {" "}
      {/* Nested - BAD! */}
      <Tooltip>{/* Content */}</Tooltip>
    </TooltipProvider>
  </div>
</TooltipProvider>;

// ❌ WRONG - TooltipProvider in individual components
function MyComponent() {
  return (
    <TooltipProvider>
      {" "}
      {/* Local - BAD! */}
      <Tooltip>{/* Content */}</Tooltip>
    </TooltipProvider>
  );
}
```

### 1.2 Why This Architecture Matters

1. **Performance:** Multiple providers create unnecessary context overhead
2. **Z-index conflicts:** Nested providers can cause layering issues
3. **Memory leaks:** Multiple providers don't clean up properly
4. **Overflow issues:** Local providers can't escape component boundaries

---

## 2. Common Problems and Solutions

### 2.1 Problem: Tooltip Gets Cut Off by Overflow

**Symptoms:**

- Tooltip appears but is clipped at component boundaries
- Tooltip content is partially visible
- Tooltip disappears when hovering near edges

**Root Causes:**

- **Cause:** The parent container has `overflow: hidden` or it's a stacking context (`position: relative`).
- **Solution 1:** The best solution is to use a global `TooltipProvider` and ensure no parent has `overflow: hidden`.
- **Solution 2:** Add a high `z-index` to the tooltip content.

#### Solution 1: Use a Global `TooltipProvider`

```tsx
// In App.tsx
import { TooltipProvider } from "@/components/ui/tooltip";

function App() {
  return <TooltipProvider>{/* All app content */}</TooltipProvider>;
}
```

#### Solution 2: Check Component Structure

```tsx
// Ensure proper nesting
<Tooltip>
  <TooltipTrigger asChild>
    <Button>Hover me</Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>This will work</p>
  </TooltipContent>
</Tooltip>
```

### 2.3 Problem: Tooltip Positioning Issues

**Symptoms:**

- Tooltip appears in wrong location
- Tooltip overlaps with other elements
- Tooltip appears off-screen

**Solutions:**

#### Solution 1: Use Logical Positioning

```tsx
<TooltipContent side="top" align="center" sideOffset={8}>
  <p>Well-positioned tooltip</p>
</TooltipContent>
```

#### Solution 2: Dynamic Positioning Based on Language

```tsx
const { i18n } = useTranslation();

<TooltipContent side={i18n.dir() === "rtl" ? "left" : "right"} align="center">
  <p>Direction-aware tooltip</p>
</TooltipContent>;
```

---

## 3. Implementation Examples

### 3.1 Basic Tooltip

```tsx
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function BasicTooltipExample() {
  const { t, i18n } = useTranslation();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="max-w-xs text-sm" dir={i18n.dir()}>
          {t("help.tooltip")}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
```

### 3.2 Advanced Tooltip with Custom Styling

```tsx
function AdvancedTooltipExample() {
  const { i18n } = useTranslation();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Advanced Button</Button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="z-[9999] bg-gray-800 text-white border-gray-600"
        sideOffset={10}
      >
        <div className="p-2">
          <h4 className="font-semibold mb-1">Advanced Tooltip</h4>
          <p className="text-sm text-gray-200" dir={i18n.dir()}>
            This tooltip has custom styling and complex content
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
```

### 3.3 Conditional Tooltip

```tsx
function ConditionalTooltipExample({ showTooltip, tooltipText }) {
  if (!showTooltip) {
    return <Button>Simple Button</Button>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button>Button with Tooltip</Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  );
}
```

---

## 4. RTL/LTR Considerations

### 4.1 Direction-Aware Positioning

```tsx
const { i18n } = useTranslation();

// Dynamic side based on language direction
<TooltipContent side={i18n.dir() === "rtl" ? "left" : "right"} align="center">
  <p dir={i18n.dir()}>Direction-aware content</p>
</TooltipContent>;
```

### 4.2 RTL-Specific Styling

```tsx
// Use Tailwind's rtl: variants
<div className="ml-2 rtl:ml-0 rtl:mr-2">
  <Tooltip>
    <TooltipTrigger asChild>
      <Button>RTL-aware button</Button>
    </TooltipTrigger>
    <TooltipContent side={i18n.dir() === "rtl" ? "left" : "right"}>
      <p dir={i18n.dir()}>RTL-aware tooltip</p>
    </TooltipContent>
  </Tooltip>
</div>
```

### 4.3 Text Direction in Tooltip Content

```tsx
<TooltipContent>
  <p dir={i18n.dir()}>
    {i18n.dir() === "rtl" ? "טקסט בעברית" : "English text"}
  </p>
</TooltipContent>
```

---

## 5. Testing and Debugging

### 5.1 Testing Checklist

- [ ] Tooltip appears above all other components
- [ ] Tooltip is not clipped by overflow
- [ ] Tooltip works correctly in RTL and LTR modes
- [ ] Tooltip disappears when mouse leaves
- [ ] No console errors related to tooltip context
- [ ] Tooltip positioning is correct in all directions
- [ ] Tooltip content is readable and properly formatted

### 5.2 Debugging Techniques

#### Console Logging

```tsx
function DebugTooltip() {
  const { i18n } = useTranslation();

  console.log("Tooltip render:", {
    isVisible: true,
    direction: i18n.dir(),
    language: i18n.language,
    zIndex: "z-[9999]",
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button>Debug Button</Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Debug tooltip</p>
      </TooltipContent>
    </Tooltip>
  );
}
```

#### Visual Debugging

```tsx
// Add temporary borders to see component boundaries
<div className="border-2 border-red-500 border-dashed">
  <Tooltip>{/* Tooltip content */}</Tooltip>
</div>
```

#### Z-Index Debugging

```tsx
// Temporarily increase z-index to see layering
<TooltipContent className="z-[99999] border-2 border-blue-500">
  <p>High z-index tooltip for debugging</p>
</TooltipContent>
```

### 5.3 Common Console Errors and Fixes

#### Error: "Tooltip must be used within TooltipProvider"

**Fix:** Ensure `TooltipProvider` is in `App.tsx`

#### Error: "Cannot read properties of undefined (reading 'dir')"

**Fix:** Check that `useTranslation` is properly imported and used

#### Error: "React does not recognize the 'dir' prop"

**Fix:** Ensure `dir` is only used on HTML elements, not React components

---

## 6. Project-Specific Examples

### 6.1 TransactionCheckboxes.tsx (Working Example)

```tsx
// This is how tooltips should be implemented
<Tooltip>
  <TooltipTrigger asChild>
    <Button
      variant="ghost"
      size="icon"
      className="h-5 w-5 ml-1 p-0 hover:bg-transparent"
    >
      <HelpCircle className="h-4 w-4 text-muted-foreground" />
    </Button>
  </TooltipTrigger>
  <TooltipContent side="top">
    <p className="max-w-xs text-sm">
      {t("transactionForm.exemptIncome.tooltip")}
    </p>
  </TooltipContent>
</Tooltip>
```

### 6.2 StatCard.tsx (Fixed Example)

```tsx
// Before (problematic)
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button onClick={onAddClick}>
        <BadgePlus className="h-5 w-5" />
      </Button>
    </TooltipTrigger>
    <TooltipContent side="top">
      <p>{addButtonTooltip}</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>

// After (fixed)
<Tooltip>
  <TooltipTrigger asChild>
    <Button onClick={onAddClick}>
      <BadgePlus className="h-5 w-5" />
    </Button>
  </TooltipTrigger>
  <TooltipContent
    side="top"
    className="z-[9999]"
  >
    <p className="max-w-xs text-sm" dir={i18n.dir()}>
      {addButtonTooltip}
    </p>
  </TooltipContent>
</Tooltip>
```

### 6.3 App.tsx (Global Provider)

```tsx
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function App() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  return (
    <TooltipProvider>
      <div className="h-full w-full overflow-hidden bg-background flex">
        {/* Sidebar - Controlled by State, NOT CSS :hover */}
        <div
          className={cn(
            "hidden md:block transition-all duration-300 bg-card overflow-hidden h-full shadow-lg",
            isSidebarExpanded ? "w-44" : "w-16"
          )}
          onMouseEnter={() => setIsSidebarExpanded(true)}
          onMouseLeave={() => setIsSidebarExpanded(false)}
        >
          <Sidebar expanded={isSidebarExpanded} />
        </div>

        {/* Main content */}
        <div className="flex-1 h-full overflow-y-auto flex flex-col">
          <main className="container py-6 px-4 md:px-6 md:pt-6 pt-20">
            <Outlet />
          </main>
        </div>

        <Toaster richColors />
      </div>
    </TooltipProvider>
  );
}
```

---

## 7. Best Practices Summary

### 7.1 Do's ✅

- Use ONE global `TooltipProvider` in `App.tsx`
- Use `z-[9999]` when tooltips get clipped
- Use `dir={i18n.dir()}` for RTL/LTR support
- Use `side="top"` for most tooltips (avoids overflow)
- Use `max-w-xs` for tooltip content width
- Use `asChild` with `TooltipTrigger`

### 7.2 Don'ts ❌

- Don't create multiple `TooltipProvider` instances
- Don't put `TooltipProvider` in individual components
- Don't use `overflow-hidden` on components with tooltips
- Don't forget to handle RTL/LTR positioning
- Don't use hardcoded z-index values without testing

### 7.3 File Locations

- **Global Provider:** `src/App.tsx`
- **Tooltip Components:** `src/components/ui/tooltip.tsx`
- **Translation Setup:** `src/lib/i18n.ts`
- **Examples:** `src/components/forms/TransactionCheckboxes.tsx`

---

## 8. Migration Guide

### 8.1 From Multiple TooltipProviders

1. Remove all local `TooltipProvider` instances
2. Add single `TooltipProvider` to `App.tsx`
3. Test all tooltips work correctly
4. Remove unused imports

### 8.2 From Overflow Issues

1. Change `overflow-hidden` to `overflow-visible`
2. Add `z-[9999]` to `TooltipContent` if needed
3. Test tooltip positioning
4. Verify no layout issues

### 8.3 From RTL Issues

1. Add `dir={i18n.dir()}` to tooltip content
2. Use dynamic `side` positioning
3. Test in both Hebrew and English
4. Verify tooltip alignment

---

## 9. Internationalization (i18n) and Theming Guidelines

_(Added January 2025)_

### 9.1 Internationalization (i18n)

**The Golden Rule:** No hardcoded strings in the codebase. All user-visible text must be retrieved via the `useTranslation` hook.

#### Implementation Pattern

```tsx
import { useTranslation } from "react-i18next";

export function MyComponent() {
  // 1. Hook usage
  const { t, i18n } = useTranslation("namespace"); // Specify namespace (e.g., 'common', 'auth')

  return (
    <div dir={i18n.dir()}>
      {" "}
      {/* 2. Direction awareness */}
      <h1>{t("key.path")}</h1> {/* 3. Translation key */}
      <p>
        {t("key.with.params", { value: 100 })} {/* 4. Interpolation */}
      </p>
    </div>
  );
}
```

#### Namespaces

Use appropriate namespaces to organize translations:

- `common`: General UI terms (Save, Cancel, Loading)
- `auth`: Login, Signup, Profile
- `dashboard`: Charts, stats, home page
- `transactions`: Forms, inputs, validation
- `settings`: Configuration pages

### 9.2 Theming and Dark Mode

**The Golden Rule:** Never use hardcoded hex colors (e.g., `#FFFFFF`, `#000000`). Always use semantic Tailwind classes or CSS variables.

#### Color Usage

- **Backgrounds:** `bg-background`, `bg-card`, `bg-muted`
- **Text:** `text-foreground`, `text-muted-foreground`, `text-primary`
- **Borders:** `border-border`, `border-input`
- **Primary Actions:** `bg-primary`, `text-primary-foreground`

#### Component Example

```tsx
// ✅ Correct
<div className="bg-card text-card-foreground border border-border rounded-lg p-4">
  <h2 className="text-xl font-bold">Card Title</h2>
</div>

// ❌ Incorrect
<div className="bg-white text-black border border-gray-200 rounded-lg p-4">
  <h2 className="text-xl font-bold">Card Title</h2>
</div>
```

### 9.3 Responsiveness

**The Golden Rule:** Design Mobile-First. Start with base styles for mobile, then add breakpoints (`md:`, `lg:`) for larger screens.

#### Layout Patterns

- **Grid:** `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- **Flex:** `flex-col md:flex-row`
- **Visibility:** `hidden md:block` (Hide on mobile, show on desktop)

### 9.4 Color System Compatibility

**Current setup:** The application uses **HSL** for theme colors (e.g. `hsl(var(--background) / 1)`), which is supported in all relevant browsers. Theme variables are defined in `src/index.css` and consumed by Tailwind in `tailwind.config.js`.

**Optional fallback:** The utility class `.bg-dialog-fallback` (hex backgrounds) is still applied to overlay primitives (Dialog, Sheet, Popover, Select, etc.) _before_ the theme class. It is no longer required for OKLCH compatibility but can be kept as extra safety or removed if desired.

1.  **Fallback class** in `src/index.css`:

    ```css
    @layer components {
      .bg-dialog-fallback {
        @apply bg-white dark:bg-[#020817];
      }
    }
    ```

2.  **Usage:** Overlay components use `bg-dialog-fallback bg-background` (fallback first, then theme) so that in edge cases a solid background is always visible.

---

## 10. Layout and Navigation Components

_(Added February 2025)_

### 10.1 Sidebar Layout & Animations

The main `Sidebar` component requires careful synchronization between the parent container (in `App.tsx`) and the internal content animations (in `Sidebar.tsx`) to prevent layout jumps ("jank") and text cutoff issues.

**Key Principles:**

1.  **State-Driven Width:** Never use CSS `:hover` to change the sidebar width. Always use a React state (`isSidebarExpanded`) in `App.tsx` that is passed down to `Sidebar`. This ensures that both the parent wrapper and the internal content animate at the exact same time.
2.  **Synchronized Transitions:** All transitions (width, opacity, transform) must use the same duration (e.g., `duration-300`).
3.  **No Dynamic Alignment:** To prevent icon jumping, navigation buttons should **always** be `justify-start` with fixed padding (e.g., `px-4`). Do not switch between `justify-center` (collapsed) and `justify-start` (expanded). The content should be perfectly centered in the collapsed state simply by virtue of the padding and container width.
4.  **Text Fading:** Text labels must fade out (`opacity-0`) and collapse (`w-0`) **before** the sidebar finishes closing, or fade in **after** it starts opening, to prevent the text from being "cut off" by the shrinking container.

### 10.2 Sidebar Visibility by Platform

The sidebar visibility logic in `App.tsx` must account for platform differences:

```tsx
const isFullScreenPage =
  FULL_SCREEN_ROUTES.includes(currentPath) ||
  (platform === "web" && !user && PUBLIC_ROUTES.includes(currentPath));
```

**Key Principle:** On desktop, `user` is always `null` (no authentication required), so the visibility check must be platform-aware.

- **`FULL_SCREEN_ROUTES`** (login, signup, landing): Always full-screen (no sidebar) on ALL platforms.
- **Other `PUBLIC_ROUTES`** (terms, privacy, accessibility):
  - **Web**: Hide sidebar if user is not logged in
  - **Desktop**: Always show sidebar (user is always `null`)

**Route Constants** are defined in `src/lib/constants.ts`:

```typescript
export const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/unsubscribe",
  "/landing",
  "/privacy",
  "/terms",
  "/accessibility",
];

export const FULL_SCREEN_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/landing",
];
```

### 10.3 Profile & Platform Indicator Alignment

To maintain a "Pixel Perfect" vertical alignment line for all icons (Menu, Profile, Platform):

- **Grid/Flex System:** All sidebar items (menu buttons, profile link, platform indicator) must align their icons to the same vertical axis.
- **Fixed Icon Containers:** For elements that don't have standard button padding (like the `PlatformIndicator`), wrap the icon in a `div` with fixed dimensions (e.g., `w-6 h-6`) and `flex center`. This mimics the geometry of a standard icon within a button, ensuring alignment without complex margin calculations.
- **Consistent Sizing:**
  - Menu Icons: `h-6 w-6`
  - Profile Picture: `h-8 w-8` (slightly larger, but centered within the same effective column)
  - Platform Icons: `h-5 w-5` (inside a `w-6 h-6` wrapper)

### 10.4 Special Navigation Items

_(Added March 2025)_

Certain navigation items, such as the "Support Us" (Donation) button, may require deviations from the standard styling to stand out.

**Guidelines for Special Items:**

1.  **Unified Component:** Always use the internal `NavLink` component (defined in `Sidebar.tsx`) even for special items. Do not duplicate the logic.
    - `NavLink` has been updated to support `href` (for external links) and `target` props.
    - It ensures animation synchronization is maintained.
2.  **Custom Styling:** Pass a `className` prop to `NavLink` to override default styles (e.g., hover colors).
    - Example: `hover:bg-golden-hover hover:text-yellow-900` for the donation button.
3.  **Icon Sizing Exceptions:** While standard icons are `h-6 w-6`, special call-to-action buttons are permitted to use slightly larger icons (e.g., `h-7 w-7`) to draw attention, provided they maintain the correct `min-width` (e.g., `min-w-[28px]`) to prevent layout shifts during collapse.
4.  **SVG Handling:** For custom SVG icons, ensure they handle Dark Mode correctly using Tailwind classes like `dark:invert` or `dark:text-white` depending on the SVG structure.

---

## 11. Responsive Modals: Dialog/Drawer Pattern

_(Added January 2026)_

### 11.1 The Problem: Mobile Keyboard Causes DOM Errors

When using responsive modals that switch between `Dialog` (desktop) and `Drawer` (mobile) based on screen size, a critical bug can occur on mobile devices:

**Scenario:**
1. User opens a modal on mobile → `Drawer` component renders (using Portal)
2. User taps an input field → mobile keyboard opens
3. Keyboard changes viewport height → `useMediaQuery` detects "desktop" size
4. React tries to switch from `Drawer` to `Dialog`
5. **DOM Error:** `Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node`

**Root Cause:** Both `Dialog` and `Drawer` use Portals. When React switches component types mid-render, it tries to unmount the `Drawer` Portal while simultaneously mounting the `Dialog` Portal, causing DOM conflicts.

### 11.2 The Solution: Variant Locking Pattern

**The Golden Rule:** Lock the modal variant (Dialog or Drawer) when the modal opens, and only update it when the modal closes.

```tsx
import { useMediaQuery } from "@/hooks/use-media-query";
import { useState, useEffect } from "react";

function ResponsiveModal({ isOpen, onClose }) {
  // 1. Get current media query value
  const isSmallNow = useMediaQuery("(max-width: 767px)");
  
  // 2. Lock the variant in state
  const [useDrawer, setUseDrawer] = useState(isSmallNow);
  
  // 3. Only update when modal is CLOSED
  useEffect(() => {
    if (!isOpen) setUseDrawer(isSmallNow);
  }, [isSmallNow, isOpen]);

  // 4. Use locked variant for rendering
  if (useDrawer) {
    return <Drawer open={isOpen} onOpenChange={onClose}>...</Drawer>;
  }
  return <Dialog open={isOpen} onOpenChange={onClose}>...</Dialog>;
}
```

### 11.3 Portal Cleanup: requestAnimationFrame Pattern

When closing a modal that triggers a data refresh (e.g., after saving), use `requestAnimationFrame` to defer the refresh until after Portal cleanup:

```tsx
// ❌ WRONG - Race condition with Portal cleanup
const handleSave = async () => {
  await saveData();
  fetchData();      // Data fetch while Portal still cleaning up
  onClose();        // Close modal
};

// ✅ CORRECT - Defer refresh until after Portal cleanup
const handleSave = async () => {
  await saveData();
  onClose();        // Close modal FIRST
  requestAnimationFrame(() => {
    fetchData();    // Refresh AFTER Portal cleanup
    toast.success("Saved!");
  });
};
```

**Also apply to dropdown menu actions:**

```tsx
<DropdownMenuItem
  onClick={() => {
    requestAnimationFrame(() => handleEdit(item));
  }}
>
  Edit
</DropdownMenuItem>
```

### 11.4 Components Using This Pattern

The following components implement the variant locking pattern:

| Component | File |
|-----------|------|
| `RecurringTransactionEditModal` | `src/components/TransactionsTable/RecurringTransactionEditModal.tsx` |
| `TransactionEditModal` | `src/components/TransactionsTable/TransactionEditModal.tsx` |
| `TermsAcceptanceModal` | `src/components/auth/TermsAcceptanceModal.tsx` |
| `ContactModal` | `src/components/features/contact/ContactModal.tsx` |

### 11.5 Debugging Mobile Issues

If users report DOM errors on mobile, use **Chrome Remote Debugging**:

**On the phone (Android):**
1. Settings → About Phone → Tap "Build Number" 7 times (enable Developer Options)
2. Settings → Developer Options → Enable "USB Debugging"
3. Connect phone to computer via USB
4. Open Chrome and navigate to the problematic page

**On the computer:**
1. Open Chrome
2. Navigate to `chrome://inspect/#devices`
3. Check "Discover USB devices"
4. Click "inspect" next to the phone's tab
5. View Console errors in real-time

---

**Last Updated:** January 2026
**Status:** Active
**Maintained By:** Development Team
**Related Files:** `App.tsx`, `Sidebar.tsx`, `PlatformIndicator.tsx`, `tooltip.tsx`, `i18n.ts`, `index.css`, `use-media-query.ts`
