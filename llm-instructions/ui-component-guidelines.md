# UI Component Guidelines - Tooltips, Modals, and Floating Components

This document provides comprehensive guidelines for creating floating UI components like Tooltips, Modals, and Dropdowns in the Ten10 project, based on lessons learned and best practices.

## Table of Contents

1. [Tooltips - Core Guidelines](#1-tooltips---core-guidelines)
2. [Common Problems and Solutions](#2-common-problems-and-solutions)
3. [Implementation Examples](#3-implementation-examples)
4. [RTL/LTR Considerations](#4-rtlltr-considerations)
5. [Testing and Debugging](#5-testing-and-debugging)
6. [Project-Specific Examples](#6-project-specific-examples)

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

1. `overflow-hidden` on parent components
2. `position: relative` with overflow constraints
3. Insufficient z-index values

**Solutions:**

#### Solution 1: Remove Overflow Constraints

```tsx
// Before (problematic)
<div className="overflow-hidden">
  <Tooltip>...</Tooltip>
</div>

// After (fixed)
<div className="overflow-visible">
  <Tooltip>...</Tooltip>
</div>
```

#### Solution 2: Add High Z-Index

```tsx
<TooltipContent side="top" className="z-[9999]">
  <p>Tooltip content</p>
</TooltipContent>
```

#### Solution 3: Use Portal (Advanced)

```tsx
import { TooltipPortal } from "@radix-ui/react-tooltip";

<TooltipContent side="top" className="z-[9999]">
  <TooltipPortal>
    <p>Tooltip content</p>
  </TooltipPortal>
</TooltipContent>;
```

### 2.2 Problem: Tooltip Doesn't Appear

**Symptoms:**

- No tooltip shows on hover
- Console errors about missing context
- Tooltip appears briefly then disappears

**Root Causes:**

1. Missing `TooltipProvider`
2. `TooltipProvider` in wrong location
3. Incorrect component hierarchy

**Solutions:**

#### Solution 1: Ensure Global TooltipProvider

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

function App() {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex">
        {/* Sidebar */}
        <div className="hidden md:block w-[4rem] hover:w-48">
          <Sidebar expanded={isSidebarExpanded} />
        </div>

        {/* Main content */}
        <div className="flex-1 h-screen overflow-y-auto">
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

**Last Updated:** [Current Date]
**Status:** Active
**Maintained By:** Development Team
**Related Files:** `App.tsx`, `tooltip.tsx`, `i18n.ts`
