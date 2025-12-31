---
description: "UI/UX standards, components, Tailwind, and i18n/RTL guidelines."
alwaysApply: true
---

# UI & Design Standards

## 1. Component Library (shadcn/ui)

- **Primary Source:** Use existing `shadcn/ui` components from `src/components/ui`.
- **Customization:** Do not modify `ui` folder files directly unless necessary for global fixes. Wrap or extend them in feature components.
- **New Components:** If a new primitive is needed, install it via shadcn CLI or copy manual code into `src/components/ui`.

## 2. Tailwind CSS & Styling

- **Utility-First:** Use utility classes. Avoid custom CSS files/modules.
- **Theming:**
  - Use semantic colors (`bg-background`, `text-primary`, `border-input`) instead of hardcoded hex/names (`bg-white`, `text-black`).
  - Support Dark Mode automatically via these semantic classes. All designs must be tested in both Light and Dark modes.
- **Responsiveness:**
  - Design **Mobile-First** (`w-full md:w-auto`).
  - Use standard breakpoints (`sm`, `md`, `lg`, `xl`).

## 3. Internationalization (i18n) & RTL

- **No Hardcoded Strings:** ALL user-visible text must use `useTranslation`.
  ```tsx
  const { t } = useTranslation("common");
  <span>{t("actions.save")}</span>;
  ```
- **RTL Support:**
  - Use logical properties where possible (`ms-2` instead of `ml-2`).
  - Use `rtl:` variants for explicit direction overrides (`rtl:rotate-180`).
  - Test layouts in both Hebrew (RTL) and English (LTR).

## 4. Floating Elements (Tooltips, Dialogs)

- **Global Provider:** Ensure `TooltipProvider` is only at the App root.
- **Z-Index:** Use standard z-index scale. Avoid arbitrary `z-[1234]`.
- **Portals:** Modals and Dialogs should use Portals (built-in to Radix/shadcn) to avoid clipping.

## 5. Icons & Assets

- **Library:** Use `lucide-react` for icons.
- **Accessibility:** Icons used as buttons must have `aria-label` or strictly decorative icons should be hidden from screen readers.
