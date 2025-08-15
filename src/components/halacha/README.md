# Halacha Components

This directory contains all components related to the Halacha page, implementing a vertical tabs layout with smooth scrolling and RTL support.

## Structure

- `HalachaPageWithVerticalTabs.tsx` - Main page component with vertical navigation
- `HalachaTabLayout.tsx` - Shared layout component for all tabs
- `InfoSection.tsx` - Reusable section component with highlighting support
- `utils.ts` - Shared utility functions (formatText, getTypedTranslation)
- `tabs/` - Individual tab components

## Features

- **Vertical Navigation**: Tabs positioned on the side (right for Hebrew, left for English)
- **Continuous Scroll**: All content is displayed in one scrollable area
- **Active Tab Detection**: Uses Intersection Observer to highlight current section
- **Custom Smooth Scrolling**: Clicking tabs animates scrolling with easing function
- **RTL Support**: Full RTL layout support using Tailwind RTL variants

## Usage

```tsx
import { HalachaPage } from "@/pages/HalachaPage";
// or
import { HalachaPageWithVerticalTabs } from "@/components/halacha/HalachaPageWithVerticalTabs";
```

The component automatically loads all translation namespaces and handles the tab state management.
