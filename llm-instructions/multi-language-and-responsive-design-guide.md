# LLM Guide: Multi-Language Support, RTL, Responsive Design, and Consistent Theming

This document provides comprehensive instructions for adapting the Ten10 application to support multiple languages (including RTL for Hebrew), achieve a consistent visual theme with dark mode, and ensure responsiveness across common screen sizes.

## I. Core Principles and General Approach

### 1. Multi-Language Support & RTL (Internationalization - i18n)

**Goal:** Allow users to switch between languages (initially Hebrew and English), with the UI text and layout (RTL/LTR) adapting accordingly.

**General Strategy:**

- **Library:** Utilize `i18next` with `react-i18next` for managing translations and language switching.
- **Translation Files:** Store translations in JSON files (e.g., `public/locales/en/translation.json`, `public/locales/he/translation.json`).
- **Key-based Lookups:** Replace hardcoded strings in components with calls to the `t()` function from `useTranslation()`.
- **Directionality (`dir`):** Dynamically set the `dir` attribute on the `<html>` tag (`rtl` or `ltr`) based on the selected language.
- **Logical Properties (CSS):** Prioritize Tailwind's logical properties (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end`, `border-s`, etc.) over physical ones (`ml-`, `mr-`, `text-left`, etc.) for styles that need to adapt to RTL/LTR.

### 2. Consistent Visual Theme & Dark Mode

**Goal:** Ensure all UI elements adhere to a defined color palette and typography, with seamless switching between light and dark modes.

**General Strategy:**

- **Centralized Theming (`tailwind.config.js` & `src/index.css`):**
  - Define all core colors (primary, secondary, background, foreground, card, destructive, etc.) as CSS variables in `src/index.css` for both `:root` (light mode) and `.dark` (dark mode).
  - Reference these CSS variables in `tailwind.config.js` (e.g., `primary: 'hsl(var(--primary))'`).
  - Define font families, border radii, and other theme aspects in `tailwind.config.js`.
- **Component Library (`shadcn/ui`):** Leverage `shadcn/ui` components as they are built with this theming approach.
- **Avoid Hardcoded Colors:** In custom components or direct Tailwind usage, always prefer theme colors (e.g., `bg-primary`, `text-foreground`) over hardcoded values (e.g., `bg-blue-500`, `text-[#333333]`).
- **Dark Mode Prefixes:** Use Tailwind's `dark:` variant for any specific dark mode overrides not covered by the CSS variables (e.g., `dark:bg-opacity-50`).

### 3. Responsiveness

**Goal:** Ensure the application layout and content adapt gracefully to various screen sizes (mobile, tablet, desktop).

**General Strategy:**

- **Mobile-First:** Design styles for mobile by default.
- **Breakpoints:** Utilize Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) to adjust styles for larger screens. Default breakpoints are usually sufficient, but custom ones can be added in `tailwind.config.js`.
- **Flexbox & Grid:** Use Tailwind's flexbox (`flex`, `items-center`, `justify-between`, etc.) and grid (`grid`, `grid-cols-X`, `gap-X`, etc.) utilities extensively for layout.
- **Hide/Show Elements:** Use `hidden sm:block` (etc.) to conditionally display elements based on screen size.
- **Image & Media:** Ensure images and media are responsive (e.g., `max-w-full h-auto`).
- **Font Sizes:** Adjust font sizes for readability on different screens (e.g., `text-base md:text-lg`).

## II. Setup and Initialization

### 1. i18n Setup (`i18next`)

**a. Installation:**

```bash
npm install i18next react-i18next i18next-browser-languagedetector i18next-http-backend
```

**b. Configuration File (`src/i18n.ts`):**

```typescript
// src/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";

i18n
  .use(Backend) // For loading translations from /public/locales
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Passes i18n down to react-i18next
  .init({
    fallbackLng: "he", // Default language if detection fails
    debug: process.env.NODE_ENV === "development", // Enable debug output in development
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },
    backend: {
      loadPath: "/locales/{{lng}}/translation.json", // Path to translation files
    },
  });

export default i18n;
```

**c. Import in `main.tsx`:**

```typescript
// src/main.tsx
import "./i18n"; // Import the i18n configuration
// ... other imports
```

**d. Add Translation Files:**

- Create `public/locales/he/translation.json`:
  ```json
  {
    "greeting": "שלום!",
    "sidebar_home": "דף הבית"
    // ... add all Hebrew strings
  }
  ```
- Create `public/locales/en/translation.json`:
  ```json
  {
    "greeting": "Hello!",
    "sidebar_home": "Home"
    // ... add all English strings
  }
  ```

**e. Language Switcher Component (Example):**
Create a component to allow users to switch languages. This component would call `i18n.changeLanguage('en')` or `i18n.changeLanguage('he')`.

**f. Dynamic Directionality:**
In `App.tsx` or a similar top-level component:

```typescript
// src/App.tsx
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.dir = i18n.dir();
  }, [i18n, i18n.language]);

  // ... rest of App component
}
```

## III. Component and Page Specific Instructions

The following sections detail necessary changes for specific components and pages. **For every text string visible to the user, ensure it is replaced with a `t('your.key')` call.**

### General File-Level Changes:

- **Imports for `useTranslation`:** Add `import { useTranslation } from 'react-i18next';` to all `.tsx` files containing user-visible text.
- **Hook Usage:** Inside each functional component, add `const { t, i18n } = useTranslation();`.

### 1. `src/components/layout/Sidebar.tsx`

- **Text:**
  - "Ten10" (Logo text) -> `t('sidebar.logoText')`
  - "דף הבית" -> `t('sidebar.home')`
  - "הוסף תנועה" -> `t('sidebar.addTransaction')`
  - "ניתוח נתונים" -> `t('sidebar.analytics')`
  - "הלכות" -> `t('sidebar.halacha')`
  - "הגדרות" -> `t('sidebar.settings')`
  - "אודות" -> `t('sidebar.about')`
  - "פרופיל" -> `t('sidebar.profile')`
  - "מתנתק..." -> `t('sidebar.loggingOut')`
  - "התנתק" -> `t('sidebar.logout')`
- **RTL/LTR & Logical Properties:**
  - The `after:right-0` for active link indicator should become `after:inset-inline-end-0` (or check Tailwind's equivalent for logical positioning).
  - `px-4` for expanded items is fine as it's symmetrical.
  - `gap-3` is fine.
  - `justify-start` for expanded items should become `justify-items-start` if using grid, or check if `justify-start` is already direction-aware with `flex`. If not, potentially `expanded ? 'justify-start' : 'justify-center'` might need conditional `expanded ? (i18n.dir() === 'rtl' ? 'justify-end' : 'justify-start') : 'justify-center'`. Simpler to use logical properties if available. (Tailwind usually makes `justify-start` map to `flex-start` which is logical).
- **Responsiveness:**
  - The `expanded` prop already handles a form of responsiveness (collapsing the sidebar).
  - Consider if text truncation or icon-only display is needed on very small screens if the sidebar were to remain partially visible. Currently, it seems to hide text correctly.
- **Theming/Dark Mode:**
  - Already addressed in previous interactions. Ensure `text-foreground` and `dark:text-slate-100` on title are consistent.
  - Logout button colors: `text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-400/20 hover:text-red-700 dark:hover:text-red-300` should use semantic colors if defined (e.g., `text-destructive dark:text-destructive-dark`). For now, this specific usage is acceptable as it's highly localized.

### 2. `src/components/dashboard/MonthlyChart.tsx`

- **Text:**
  - "סיכום חודשי" (CardTitle) -> `t('dashboard.monthlyChart.title')`
  - Tooltip labels (`p className="font-bold mb-2">{label}`): The `label` (e.g., "ינו 2024") is generated by `date-fns` with Hebrew locale. This needs to adapt to the selected i18n language.
    ```typescript
    // Inside CustomTooltip or where 'label' is passed
    const { i18n } = useTranslation();
    // ...
    // When formatting the date for the label:
    // format(new Date(year, month), "MMM yyyy", { locale: i18n.language === 'he' ? he : enUS })
    // (Import enUS from date-fns/locale)
    ```
  - Tooltip series names ("הכנסות", "תרומות", "הוצאות"):
    - `entry.name` in `CustomTooltip` comes from `dataKey` in `<Bar>`.
    - These keys (`הכנסות`, `תרומות`, `הוצאות`) in `chartData` calculation need to be translated.
      ```typescript
      // In chartData calculation
      const { t } = useTranslation();
      // ...
      return {
        month: monthLabel, // monthLabel also needs locale from i18n
        [t("dashboard.monthlyChart.incomes")]: monthIncomes,
        [t("dashboard.monthlyChart.donations")]: monthDonations,
        [t("dashboard.monthlyChart.expenses")]: monthExpenses,
      };
      ```
    - The `<Bar dataKey="הכנסות" ... />` etc. will then use the translated keys.
  - Legend formatter: `formatter={(value) => (<span className="text-sm font-medium">{value}</span>)}`. The `value` here is "הכנסות", "תרומות", "הוצאות". This will automatically use the translated keys from `dataKey` if the above is done.
- **RTL/LTR:**
  - `recharts` usually handles RTL reasonably well for axis and legend placement, but verify.
  - Tooltip positioning might need observation.
  - `margin={{ top: 20, right: 30, left: 20, bottom: 20 }}`: `right: 30` and `left: 20` might need to be swapped for RTL.
    ```typescript
    // const { i18n } = useTranslation();
    // const chartMargin = i18n.dir() === 'rtl'
    //  ? { top: 20, right: 20, left: 30, bottom: 20 }
    //  : { top: 20, right: 30, left: 20, bottom: 20 };
    // <BarChart margin={chartMargin} ...>
    ```
- **Responsiveness:**
  - `ResponsiveContainer` is used, which is good.
  - Test on small screens:
    - Do X-axis labels overlap? `recharts` has options for angled labels or skipping labels (`interval` prop on `XAxis`).
    - Is the legend taking too much space?
- **Theming/Dark Mode:**
  - `CustomTooltip` uses `bg-white ... dark:bg-gray-800`. Change to `bg-popover text-popover-foreground border-border`.
  - `CartesianGrid className="stroke-muted"` is good.
  - `XAxis` and `YAxis` `tick={{ fill: "currentColor" }}` is good.
  - `Tooltip cursor={{ fill: "rgba(200, 200, 200, 0.1)" }}`. The color `rgba(200,200,200,0.1)` is hardcoded. Consider a theme variable or a more neutral approach. `fill-[hsl(var(--muted_transparent))]` or similar, define `--muted_transparent` in CSS.
  - Bar fills: `fill="hsl(142.1 70.6% 45.3%)"`, etc. These are hardcoded HSL values.
    - **Best:** Define these as semantic chart colors in `tailwind.config.js` and `index.css` (e.g., `--chart-income`, `--chart-expense`, `--chart-donation`) with dark mode variants if needed.
      ```css
      /* index.css */
      :root {
        --chart-income: 142.1 70.6% 45.3%; /* ... */
      }
      .dark {
        --chart-income: 142.1 70.6% 55.3%; /* Lighter green for dark mode */
      }
      ```
      Then use `fill="hsl(var(--chart-income))"`.
    - **Alternative:** If these colors are fixed, ensure they have good contrast on both light and dark backgrounds.

### 3. `src/components/dashboard/StatsCards.tsx`

- **Text:**
  - `dateRangeLabels`: All strings need translation keys. E.g., "מתחילת החודש" -> `t('dashboard.statsCards.dateRange.month')`.
  - Card Titles: "סך ההכנסות" -> `t('dashboard.statsCards.totalIncome.title')`, etc.
  - Income subtext: `... מתוכם עם חומש` -> `t('dashboard.statsCards.totalIncome.chomeshSubtext', { amount: formatCurrency(chomeshIncomesAmount) })` (using interpolation).
  - Donation subtext: `% מסך ההכנסות` -> `t('dashboard.statsCards.totalDonations.percentageSubtext', { percentage: ... })`. "N/A" -> `t('common.notApplicable')`.
  - Required Donation subtext: `עברת את היעד ב-... (יתרה)` -> `t('dashboard.statsCards.requiredDonation.surplusText', { amount: ... })`. `% מהיעד הושלם` -> `t('dashboard.statsCards.requiredDonation.progressText', { percentage: ... })`.
- **RTL/LTR:**
  - `flex justify-end gap-2` for date range buttons: `justify-end` becomes `flex-end` which is direction-aware. `gap-2` is fine.
  - `CardHeader className="flex flex-row items-center justify-between pb-2"`: `justify-between` is fine.
- **Responsiveness:**
  - `containerClass = orientation === "horizontal" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4" : "grid gap-4";` This is excellent for responsiveness.
  - Ensure text within cards doesn't overflow on small screens. `text-2xl font-bold` might need to be smaller on mobile (e.g., `text-xl sm:text-2xl`).
  - `p className="text-xs text-muted-foreground mt-1"`: Font size `xs` is good for subtext.
- **Theming/Dark Mode:**
  - Gradient backgrounds: `from-green-50 to-green-100 dark:from-green-950 dark:to-green-900`. These are specific Tailwind palette colors.
    - **Ideal:** Define these gradients semantically in `index.css` if they are reused or part of the core theme.
      ```css
      /* index.css */
      :root {
        --card-gradient-success-from: /* green-50 HSL values */ ;
        --card-gradient-success-to: /* green-100 HSL values */ ;
      }
      .dark {
        --card-gradient-success-from: /* green-950 HSL values */ ;
        --card-gradient-success-to: /* green-900 HSL values */ ;
      }
      ```
      Then in `tailwind.config.js` extend colors for these (e.g., `cardSuccessFrom: 'hsl(var(--card-gradient-success-from))'`) or use arbitrary properties in JSX:
      `className="bg-gradient-to-br from-[hsl(var(--card-gradient-success-from))] to-[hsl(var(--card-gradient-success-to))]"`.
      Or, more simply, define a utility class in CSS:
      ```css
      @layer components {
        .bg-card-gradient-success {
          @apply bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900;
        }
      }
      ```
      And use `className="bg-card-gradient-success"`.
    - **Current state:** Acceptable if these are one-off styles, but less maintainable for theme changes.
  - Icon colors: `text-green-600 dark:text-green-400`, etc. Similar to gradients, ideally use semantic theme colors (e.g., `text-success-icon-fg dark:text-success-icon-fg-dark`).
  - `Progress` component from `shadcn/ui` should already be theme-aware.

### 4. `src/components/dashboard/TransactionsTable.tsx`

- **Text:**
  - Column Headers: "תאריך", "סוג", "תיאור", "סכום", "פרטים נוספים" -> `t('transactionsTable.column.date')`, etc.
  - Cell content for `type`: 'הכנסה', 'תרומה' -> `t('transactionType.income')`, `t('transactionType.donation')`.
  - Cell content for `details`: 'חומש' -> `t('transactionsTable.details.chomesh')`.
  - `CardTitle`: "היסטוריית פעולות" -> `t('transactionsTable.title')`.
  - `SelectValue placeholder`: "סוג פעולה" -> `t('transactionsTable.filter.typePlaceholder')`.
  - `SelectItem` values: "הכל", "הכנסות", "תרומות" -> `t('filterValues.all')`, `t('transactionType.plural.income')`, `t('transactionType.plural.donation')`.
- **RTL/LTR:**
  - `DataTable`, `Select`, `DatePickerWithRange` from `shadcn/ui` should mostly handle RTL if the global `dir` is set. Verify their behavior.
  - `flex flex-row items-center justify-between` for header is good.
  - `flex gap-4` for filters is good.
- **Responsiveness:**
  - `DataTable` can be challenging on small screens.
    - Consider which columns are essential on mobile and potentially hide less critical ones (`hidden sm:table-cell`).
    - `shadcn/ui DataTable` might have responsive features or patterns to explore.
    - Horizontal scrolling within the card on mobile might be a fallback.
  - Filter controls (`DatePickerWithRange`, `Select`): Ensure they are usable on small screens (e.g., `SelectTrigger className="w-[180px]"` might be too wide for very small mobile). Consider `w-full sm:w-[180px]`.
- **Theming/Dark Mode:**
  - Relies heavily on `shadcn/ui` components (`Card`, `DataTable`, `Select`, `DatePickerWithRange`), which should be theme-aware. No obvious hardcoded styles. This is good.

### 5. Forms (e.g., `src/components/forms/TransactionForm.tsx` - Assuming this exists or will be created)

- **Text:** All labels, placeholders, button texts, validation messages (if displayed from Zod errors directly, Zod needs i18n setup too, or map errors to translated strings).
- **RTL/LTR:**
  - Form layout: If using grid or flex, ensure order is correct for RTL.
  - Input fields and their labels: Ensure correct alignment. `shadcn/ui` should handle this well for `Input`, `Textarea`, `Checkbox`, `RadioGroup`, `Switch` if `dir` is set.
  - `text-start` for labels.
- **Responsiveness:**
  - Ensure form elements stack nicely on mobile.
  - Buttons might need to be `w-full` on mobile.
- **Theming/Dark Mode:**
  - Use `shadcn/ui` form components (`Input`, `Button`, `Select`, `Checkbox`, `DatePicker`) which are theme-aware.
  - Validation error text colors should use destructive theme colors (`text-destructive`).

### 6. Other Pages (`src/pages/...`)

- **`HomePage.tsx`, `AddTransactionPage.tsx`, `AnalyticsPage.tsx`, `HalachaPage.tsx`, `SettingsPage.tsx`, `AboutPage.tsx`, `ProfilePage.tsx`:**
  - Apply the same principles: translate all text, use logical properties, ensure responsiveness, and use theme-consistent `shadcn/ui` components or Tailwind utilities.
  - **SettingsPage:** Texts for "Export Data", "Import Data", confirmations, etc.
  - **Authentication Pages (`LoginPage.tsx`, `SignupPage.tsx`):** All form labels, button texts, links ("Forgot password?"), error messages.

## IV. Data Formatting for i18n

- **Dates:** `date-fns` with locale.

  ```typescript
  import { format } from "date-fns";
  import { he, enUS } from "date-fns/locale"; // Import necessary locales
  import { useTranslation } from "react-i18next";

  // Inside component
  const { i18n } = useTranslation();
  const currentLocale = i18n.language === "he" ? he : enUS;
  const formattedDate = format(new Date(yourDate), "PPpp", {
    locale: currentLocale,
  }); // PPpp is an example format
  ```

- **Currency:** `formatCurrency` utility.

  ```typescript
  // src/lib/utils/currency.ts (or similar)
  // Ensure this utility can be adapted or extended for different currency symbols and formatting conventions based on locale.
  // The Intl.NumberFormat API is powerful for this.
  export function formatCurrency(
    amount: number,
    currencyCode: string = "ILS", // Default, can be dynamic
    locale: string = "he-IL" // Default, can be dynamic based on i18n.language
  ): string {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currencyCode,
        minimumFractionDigits: 2, // Adjust as needed
        maximumFractionDigits: 2, // Adjust as needed
      }).format(amount);
    } catch (error) {
      console.error("Error formatting currency:", error);
      // Fallback for unsupported locales/currencies
      return `${amount.toFixed(2)} ${currencyCode}`;
    }
  }

  // Usage in component
  // const { i18n } = useTranslation();
  // const userLocale = i18n.language === 'en' ? 'en-US' : 'he-IL';
  // formatCurrency(transaction.amount, transaction.currency, userLocale)
  ```

- **Numbers:** `Intl.NumberFormat` can also be used for general number formatting if specific locale conventions are needed.

## V. Testing Checklist

- **Language Switching:**
  - [ ] Can switch between Hebrew and English.
  - [ ] All UI text updates correctly.
  - [ ] `dir` attribute on `<html>` changes (Inspect with dev tools).
- **RTL/LTR Layout:**
  - [ ] Sidebar active link indicator position.
  - [ ] Form field and label alignment.
  - [ ] Chart margins and legend/axis placement.
  - [ ] General flow of content (e.g., text starts on the right for Hebrew).
  - [ ] Icons with directionality (e.g., arrows) are mirrored or swapped if necessary.
- **Responsiveness:** Test on multiple device sizes (or use browser dev tools responsive mode):
  - [ ] Mobile (e.g., iPhone SE, Galaxy S20)
  - [ ] Tablet (e.g., iPad portrait and landscape)
  - [ ] Desktop (various common widths)
  - [ ] No horizontal scrollbars (unless intended for tables).
  - [ ] Text is readable, elements don't overlap.
  - [ ] Click targets are adequately sized on touchscreens.
- **Theming & Dark Mode:**
  - [ ] Switch between light and dark modes.
  - [ ] All components adapt correctly.
  - [ ] Text is legible with good contrast in both modes.
  - [ ] Colors match the defined theme (no hardcoded colors causing issues).
  - [ ] Focus indicators are visible in both modes.
- **Data Formatting:**
  - [ ] Dates are displayed in the correct format for the selected language.
  - [ ] Currency is displayed in the correct format for the selected language/currency settings.

## VI. Documentation References

- **i18next:** [https://www.i18next.com/](https://www.i18next.com/)
- **react-i18next:** [https://react.i18next.com/](https://react.i18next.com/)
- **Tailwind CSS Responsive Design:** [https://tailwindcss.com/docs/responsive-design](https://tailwindcss.com/docs/responsive-design)
- **Tailwind CSS Dark Mode:** [https://tailwindcss.com/docs/dark-mode](https://tailwindcss.com/docs/dark-mode)
- **Tailwind CSS Logical Properties:** Search for "logical" in Tailwind docs (e.g., "Space Between" has `space-x-*` and refers to logical properties for RTL).
- **shadcn/ui Documentation:** Check for notes on theming, dark mode, and RTL.

This guide provides a roadmap. Each step will require careful implementation and testing.
