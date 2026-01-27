# Category Selection Feature Guide

This document describes the category selection feature for transactions, including the UI component, backend services, and caching mechanism.

## 1. Overview

Categories allow users to classify their income and expense transactions for better tracking and future analytics. The system supports:

- **Predefined categories**: Common categories translated for each transaction type
- **User-created categories**: Custom categories that persist across sessions
- **Categories derived from data**: No separate categories table - categories are extracted from existing transactions

## 2. Supported Transaction Types

Categories are available for the following transaction types:

| Type | Category Support |
|------|------------------|
| `income` | ✅ Yes |
| `expense` | ✅ Yes |
| `exempt-income` | ✅ Yes (uses income categories) |
| `recognized-expense` | ✅ Yes (uses expense categories) |
| `donation` | ❌ No (uses `recipient` field instead) |
| `non_tithe_donation` | ❌ No (uses `recipient` field instead) |
| `initial_balance` | ❌ No |

## 3. UI Component: CategoryCombobox

**File:** `src/components/ui/category-combobox.tsx`

### Features
- Dropdown with search/filter functionality
- Shows predefined categories from translations
- Lazy-loads user-created categories when opened
- Allows creating new categories by typing
- Caches loaded categories for performance

### Props
```typescript
interface CategoryComboboxProps {
  value: string | null;
  onChange: (value: string | null) => void;
  transactionType: TransactionType;
  placeholder?: string;
  disabled?: boolean;
}
```

### Usage
```tsx
<CategoryCombobox
  value={field.value}
  onChange={(value) => field.onChange(value)}
  transactionType="income"
  placeholder={t("transactionForm.category.incomePlaceholder")}
/>
```

### Cache Invalidation
The combobox tracks a `cacheVersion` from the categories service. When a new category is created:
1. `clearCategoryCacheForType()` is called in `transactionForm.service.ts`
2. This increments the global `cacheVersion`
3. Next time the combobox opens, it detects the version mismatch and refetches

## 4. Predefined Categories

Defined in translation files (`public/locales/{lang}/transactions.json`):

### Income Categories
- Salary (משכורת)
- Business (עסק)
- Freelance (עבודה עצמאית)
- Investment (השקעות)
- Allowance (קצבאות)
- Gift (מתנה)
- Other (אחר)

### Expense Categories
- Food (מזון)
- Transportation (תחבורה)
- Housing (דיור)
- Utilities (שירותים)
- Healthcare (בריאות)
- Education (חינוך)
- Leisure (פנאי)
- Shopping (קניות)
- Other (אחר)

## 5. Backend: Fetching User Categories

### Web (Supabase RPC)

**Migration:** `supabase/migrations/20260126_add_get_user_categories.sql`

```sql
CREATE OR REPLACE FUNCTION get_user_categories(p_type TEXT)
RETURNS TABLE(category TEXT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT t.category
  FROM transactions t
  WHERE t.user_id = auth.uid()
    AND t.type = p_type
    AND t.category IS NOT NULL
    AND t.category != ''
  ORDER BY t.category;
END;
$$;
```

### Desktop (Tauri Command)

**File:** `src-tauri/src/commands/transaction_commands.rs`

```rust
#[tauri::command]
pub fn get_distinct_categories(
    db_state: State<'_, DbState>,
    transaction_type: String,
) -> std::result::Result<Vec<String>, String> {
    // Queries DISTINCT category FROM transactions
    // WHERE type = transaction_type AND category IS NOT NULL
}
```

**Registration:** Command is registered in `src-tauri/src/main.rs`

## 6. Frontend Service: categories.service.ts

**File:** `src/lib/data-layer/categories.service.ts`

### Exports
```typescript
// Get categories for a transaction type (cached)
getUserCategories(transactionType: TransactionType): Promise<string[]>

// Clear all cached categories
clearCategoryCache(): void

// Clear cache for a specific type
clearCategoryCacheForType(transactionType: TransactionType): void

// Get current cache version (for invalidation detection)
getCategoryCacheVersion(): number
```

### Caching Mechanism
- Categories are cached in a `Map<string, string[]>` keyed by `${platform}-${transactionType}`
- A `cacheVersion` counter increments whenever cache is cleared
- The CategoryCombobox tracks the version and refetches when it changes

## 7. Forms Using Categories

### TransactionForm (Create/Edit)
**File:** `src/components/forms/transaction-form-parts/DescriptionCategoryFields.tsx`

Shows CategoryCombobox for:
- `income`
- `expense`
- `exempt-income` (via checkbox on income)
- `recognized-expense` (via checkbox on expense)

### RecurringTransactionEditForm
**File:** `src/components/forms/RecurringTransactionEditForm.tsx`

Shows CategoryCombobox for recurring transactions of income/expense types.

## 8. Schema Validation

Categories are validated in Zod schemas:

**File:** `src/lib/schemas.ts`

```typescript
// In createTransactionFormSchema
category: z
  .string()
  .optional()
  .nullable()
  .refine((val) => !val || val.length <= 50, {
    message: t("transactions:transactionForm.validation.category.maxLength"),
  }),

// Same validation in createRecurringEditSchema
```

## 9. Future Enhancement: Auto-Hide Old Categories

**Status:** Not implemented - planned for future if users request

To reduce clutter, categories not used in recent transactions could be hidden from the dropdown:

```sql
-- Modified get_user_categories to only show recent categories
SELECT DISTINCT t.category
FROM transactions t
WHERE t.user_id = auth.uid()
  AND t.type = p_type
  AND t.category IS NOT NULL
  AND t.category != ''
  AND t.date >= (CURRENT_DATE - INTERVAL '6 months')  -- Only recent
ORDER BY t.category;
```

This would require updating both:
- Supabase RPC: `get_user_categories`
- Tauri command: `get_distinct_categories`

## 10. Future Enhancement: Category Management UI

**Status:** Not implemented - planned for future if users request

A dedicated modal in Settings for managing user-created categories:

### Required Backend Functions

```sql
-- Get categories with usage count
CREATE FUNCTION get_user_categories_with_count(p_type TEXT)
RETURNS TABLE(category TEXT, usage_count BIGINT);

-- Delete a category from all transactions
CREATE FUNCTION delete_category(p_type TEXT, p_category TEXT)
RETURNS void;

-- Rename a category across all transactions
CREATE FUNCTION rename_category(p_type TEXT, p_old TEXT, p_new TEXT)
RETURNS void;
```

### UI Components Needed
- `CategoryManagementModal` in Settings
- List of categories with usage count
- Delete/Rename actions with confirmation dialogs

## 11. Translation Keys

**File:** `public/locales/{lang}/transactions.json`

```json
{
  "transactionForm": {
    "category": {
      "label": "קטגוריה",
      "placeholder": "בחר קטגוריה (אופציונלי)",
      "incomePlaceholder": "קטגוריית הכנסה (אופציונלי)",
      "searchPlaceholder": "חפש או צור קטגוריה...",
      "createNew": "צור קטגוריה חדשה",
      "loading": "טוען קטגוריות...",
      "noResults": "לא נמצאו קטגוריות",
      "income": {
        "salary": "משכורת",
        "business": "עסק",
        // ... more
      },
      "expense": {
        "food": "מזון",
        "transportation": "תחבורה",
        // ... more
      }
    }
  }
}
```
