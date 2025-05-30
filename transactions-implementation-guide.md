# מדריך מפורט ליישום טבלת טרנזקציות עם React, Supabase ו-shadcn/ui

## סקירה כללית

מדריך זה מספק הנחיות מפורטות לבניית טבלת טרנזקציות עם אפשרויות חיפוש, סינון, מיון, יצוא, עריכה ומחיקה עם infinite scrolling (Load More).
**סטטוס כללי:** כל תכונות הליבה (הצגה, סינון, מיון, עריכה, מחיקה, טעינה נוספת, יצוא) מיושמות. עדכונים בזמן אמת הוסרו. נותרו שיפורי UI/UX נוספים ואופטימיזציות מתקדמות.

## ארכיטקטורה כללית

### מבנה התיקיות

**סטטוס:** מיושם ברובו. `TransactionsTable.tsx` נמצא כרגע ב-`src/pages/`.

```
src/
├── components/
│   ├── transactions/
│   │   ├── TransactionsTable.tsx          # הרכיב הראשי - כרגע ב-src/pages/
│   │   ├── TransactionsFilters.tsx        # רכיב הסינונים - נוצר
│   │   ├── TransactionRow.tsx             # שורה יחידה - נוצר
│   │   ├── TransactionEditModal.tsx       # מודל עריכה - נוצר
│   │   └── ExportButton.tsx               # כפתור יצוא - נוצר
├── services/
│   ├── tableTransactions.service.ts       # שירותי API - קיים
│   └── export.service.ts                  # שירותי יצוא - לא נוצר כשירות נפרד, שולב ב-store וב-utils
├── stores/
│   └── tableTransactions.store.ts         # Zustand store - קיים
├── types/
│   ├── transaction.ts                     # טיפוס Transaction ראשי
│   └── tableTransactions.types.ts         # טיפוסי TypeScript לטבלה - קיים
└── utils/
    ├── export-csv.ts                      # פונקציית עזר לייצוא CSV
    ├── export-excel.ts                    # פונקציית עזר לייצוא Excel
    ├── export-pdf.ts                      # פונקציית עזר לייצוא PDF
    └── supabase.ts                        # קליינט Supabase (קיים בפרויקט)
```

## 1. הגדרת טיפוסי TypeScript

**סטטוס:** מיושם. קבצים רלוונטיים: `src/types/transaction.ts`, `src/types/tableTransactions.types.ts`.

### Transaction Type

```typescript
interface Transaction {
  id: string;
  user_id: string; // ביישום בפועל הוא אופציונלי בצד הלקוח
  date: string;
  amount: number;
  currency: string;
  description: string;
  type:
    | "income"
    | "donation"
    | "expense"
    | "exempt-income"
    | "recognized-expense"
    | "non_tithe_donation";
  category?: string;
  is_chomesh: boolean; // ביישום בפועל הוא אופציונלי
  recipient?: string;
  is_recurring: boolean; // ביישום בפועל הוא אופציונלי
  recurring_day_of_month?: number;
  created_at: string; // ביישום בפועל הוא אופציונלי
  updated_at: string; // ביישום בפועל הוא אופציונלי
  recurring_total_count?: number;
}
```

### Filter Types

```typescript
interface TableTransactionFilters {
  // שונה שם ל-TableTransactionFilters
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  types: string[];
  search: string;
}

interface TableSortConfig {
  // שונה שם ל-TableSortConfig
  field: keyof Transaction | string; // הורחב לכלול string
  direction: "asc" | "desc";
}

interface TablePaginationState {
  // שונה שם ל-TablePaginationState
  currentPage: number;
  itemsPerPage: number;
  totalCount: number;
  hasMore: boolean;
}
```

## 2. Zustand Store

**סטטוס:** מיושם ב-`src/lib/tableTransactions.store.ts`.

### מבנה ה-Store

```typescript
interface TableTransactionsState {
  // שונה שם ל-TableTransactionsState
  // State
  transactions: Transaction[];
  filters: TableTransactionFilters;
  sorting: TableSortConfig;
  pagination: TablePaginationState;
  loading: boolean;
  error: string | null;
  exportLoading: boolean; // נוסף עבור טעינת יצוא
  exportError: string | null; // נוסף עבור שגיאת יצוא

  // Actions
  fetchTransactions: (reset?: boolean, platform?: Platform) => Promise<void>;
  setLoadMorePagination: () => void;
  setFilters: (filters: Partial<TableTransactionFilters>) => void;
  setSorting: (newSortField: keyof Transaction | string) => void;
  updateTransactionState: (id: string, updates: Partial<Transaction>) => void;
  deleteTransactionState: (id: string) => void;
  updateTransaction: (
    id: string,
    updates: Partial<Transaction>,
    platform: Platform
  ) => Promise<void>;
  deleteTransaction: (id: string, platform: Platform) => Promise<void>;
  exportTransactions: (
    format: "csv" | "excel" | "pdf",
    platform: Platform
  ) => Promise<void>; // עודכן

  // Reset functions
  resetFiltersState: () => void;
  resetStore: () => void;
}
```

### Optimistic Updates

**סטטוס:** מיושם עבור עריכה ומחיקה.

- עדכון מיידי של ה-state בזמן עריכה/מחיקה
- שמירת גיבוי של הנתונים המקוריים (בתוך הפעולה האסינכרונית)
- Rollback במקרה של כשל (בתוך הפעולה האסינכרונית)

## 3. Supabase Service Layer

**סטטוס:** מיושם ב-`src/lib/tableTransactions.service.ts`.

### RPC Functions ליצירה בסופהבייס

**סטטוס:** כל הפונקציות הבאות נוצרו והן בשימוש.

```sql
-- פונקציה לקבלת טרנזקציות עם סינון ומיון
CREATE OR REPLACE FUNCTION get_user_transactions(
  p_user_id UUID,
  p_offset INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 20,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_types TEXT[] DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_sort_field TEXT DEFAULT 'created_at', -- ביישום בפועל ברירת המחדל היא 'date'
  p_sort_direction TEXT DEFAULT 'desc'
)
RETURNS TABLE (
  transactions JSONB,
  total_count INTEGER -- שונה שם מ-full_count במימוש ה-RPC בפועל
);

-- פונקציה למחיקת טרנזקציה (נוספה)
CREATE OR REPLACE FUNCTION delete_user_transaction(
  p_transaction_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$ ... $$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה לעדכון טרנזקציה (נוספה)
CREATE OR REPLACE FUNCTION update_user_transaction(
  p_transaction_id UUID,
  p_user_id UUID,
  p_updates JSONB
)
RETURNS SETOF transactions AS $$ ... $$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה לקבלת כל הטרנזקציות ליצוא (נוצרה)
CREATE OR REPLACE FUNCTION export_user_transactions(
  p_user_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_types TEXT[] DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS SETOF transactions;
```

### Service Functions

**סטטוס:** מיושם.

```typescript
class TableTransactionsService {
  static async fetchTransactions(params: {
    offset: number;
    limit: number;
    filters: TableTransactionFilters;
    sorting: TableSortConfig;
    platform: Platform; // נוסף פרמטר platform
  }): Promise<{ data: Transaction[]; totalCount: number }>;

  static async updateTransaction(
    id: string,
    updates: Partial<Transaction>,
    platform: Platform // נוסף פרמטר platform
  ): Promise<Transaction>;

  static async deleteTransaction(id: string, platform: Platform): Promise<void>; // נוסף פרמטר platform

  // קבלת נתונים ליצוא (מיושם)
  static async getTransactionsForExport(
    filters: TableTransactionFilters,
    platform: Platform
  ): Promise<Transaction[]>;
}
```

## 4. Real-time Updates

**סטטוס:** הוסר. הוחלט לא לממש עדכונים בזמן אמת בשלב זה ולהסתמך על Optimistic Updates ורענון ידני/טעינה מחדש.

### הגדרת Subscription (הוסר)

```typescript
// בתוך ה-store או ברכיב
const setupRealtimeSubscription = () => {
  const channel = supabase
    .channel("transactions-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "transactions",
        filter: `user_id=eq.${userId}`, // userId צריך להיות זמין כאן
      },
      (payload) => {
        // טיפול בשינויים בזמן אמת
        handleRealtimeUpdate(payload);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
};
```

## 5. רכיבי UI עם shadcn/ui

**סטטוס:** מיושם ברובו.

### TransactionsTable Component (`src/pages/TransactionsTable.tsx`)

**סטטוס:** מיושם.

```typescript
// שימוש ברכיבים:
// - Table, TableHeader, TableBody, TableRow, TableCell (בשימוש)
// - Button (בשימוש)
// - Input (בשימוש בסינון)
// - Select (בשימוש בסינון ובמודל עריכה)
// - DatePicker (DatePickerWithRange בשימוש בסינון)
// - Badge (בשימוש להצגת סוג תנועה)
// - Dialog (בשימוש במודל עריכה)
// - AlertDialog (בשימוש לאישור מחיקה)
// - DropdownMenu (בשימוש לפעולות שורה ולסינון סוגים)
// - Skeleton (עבור loading) - מיושם
```

### מבנה הטבלה

**סטטוס:** מיושם.

- **Header**: כותרות עמודות עם אפשרות מיון (סמלי חץ) - מיושם.
- **Body**: שורות הנתונים עם Skeleton במקום loading - מיושם.
- **Footer**: כפתור Load More + מידע על pagination - מיושם.
- **Actions**: עריכה ומחיקה בכל שורה (DropdownMenu) - מיושם.

### TransactionsFilters Component (`src/components/transactions/TransactionsFilters.tsx`)

**סטטוס:** מיושם.

```typescript
// כוללת:
// - DateRangePicker עבור טווח תאריכים - מיושם (DatePickerWithRange).
// - MultiSelect עבור סוגי טרנזקציות - מיושם כ-DropdownMenu עם DropdownMenuCheckboxItem.
// - Input עבור חיפוש בקטגוריה/תיאור - מיושם.
// - Button לאיפוס הסינונים - מיושם.
// - עטוף ב-Card של shadcn/ui.
```

## 6. אסטרטגיית Load More

**סטטוס:** מיושם.

### מנגנון הטעינה

1. טעינה ראשונית של 20 שורות (ניתן להגדרה) - מיושם.
2. כפתור "Load More" בתחתית הטבלה - מיושם.
3. הוספת שורות חדשות למערך הקיים - מיושם.
4. השבתת הכפתור כשאין עוד נתונים - מיושם (הכפתור לא מוצג).
5. Loading state עם Skeleton components - מיושם.

### אופטימיזציה

- Debounce על חיפוש וסינונים (300ms) - מיושם עבור חיפוש טקסט בסינון.
- Memoization של שורות הטבלה (`TransactionRow.tsx` עם `React.memo`) - מיושם.
- Lazy loading של אייקונים וגרפיקה - לא רלוונטי כרגע.

## 7. עריכה ומחיקה

**סטטוס:** מיושם.

### עריכה

- Modal/Dialog עם form validation (`TransactionEditModal.tsx`) - מיושם.
- שמירה אוטומטית או עם כפתור Save - כפתור Save.
- Optimistic update בטבלה - מיושם.
- Error handling עם rollback - מיושם.

### מחיקה

- Confirmation dialog (`AlertDialog`) - מיושם.
- Optimistic removal מהטבלה - מיושם.
- Undo option (5 שניות) - הוסר. המחיקה היא ישירה עם התראת אישור.
- Toast notifications - מיושם (להצלחה/שגיאה במחיקה).

## 8. יצוא נתונים

**סטטוס:** מיושם.

### ExportService (שולב ב-store וב-utils)

```typescript
class ExportService {
  // או כחלק מ-TableTransactionsService
  static async exportToCSV(data: Transaction[]): Promise<Blob>;
  static async exportToExcel(data: Transaction[]): Promise<Blob>;
  static async exportToPDF(data: Transaction[]): Promise<Blob>;
}
```

### מנגנון היצוא

1. הצגת loading state
2. קבלת כל הנתונים המסוננים מהשרת (דורש RPC ייעודי - `export_user_transactions`)
3. יצירת קובץ client-side
4. הורדה אוטומטית
5. Toast notification עם הצלחה/כשל - מיושם.

## 9. Error Handling

**סטטוס:** בסיסי מיושם (הצגת הודעת שגיאה מה-store). אסטרטגיה מורחבת עדיין לא.

### אסטרטגיה

- Try-catch בכל פונקציות ה-API - מיושם.
- Error boundaries ברכיבים - עדיין לא מיושם.
- Toast notifications למשתמש - מיושם חלקית (יצוא, מחיקה, עריכה).
- Retry mechanism לפעולות כושלות - עדיין לא מיושם.
- Fallback UI לשגיאות קריטיות - עדיין לא מיושם.

## 10. Performance Optimizations

**סטטוס:** חלקית (Debounce). רוב האופטימיזציות עדיין לא מיושמות.

### קוד

- React.memo לרכיבי שורות - מיושם (`TransactionRow.tsx`).
- useMemo לחישובים כבדים - עדיין לא מיושם.
- useCallback לפונקציות - עדיין לא מיושם.
- Virtual scrolling (אופציונלי לעתיד)

### רשת

- Request debouncing - מיושם עבור חיפוש טקסט בסינון.
- Request cancellation - עדיין לא מיושם.
- Caching של תוצאות - עדיין לא מיושם.
- Connection pooling בסופהבייס - מנוהל על ידי Supabase JS client.

## 11. Testing Strategy

**סטטוס:** עדיין לא מיושם.

### Unit Tests

- Service functions
- Store actions
- Utility functions
- Component logic

### Integration Tests

- API calls
- Real-time updates
- Export functionality
- Error scenarios

## 12. אינדקסים נדרשים בסופהבייס

**סטטוס:** לא ידוע אם מיושם. יש לבדוק מול מסד הנתונים.

```sql
-- אינדקסים לביצועים טובים יותר
CREATE INDEX idx_transactions_user_date ON transactions (user_id, date DESC);
CREATE INDEX idx_transactions_user_type ON transactions (user_id, type);
CREATE INDEX idx_transactions_user_created ON transactions (user_id, created_at DESC);
CREATE INDEX idx_transactions_description_gin ON transactions USING gin(to_tsvector('english', description));
CREATE INDEX idx_transactions_category_gin ON transactions USING gin(to_tsvector('english', category));
```

## 13. RLS Policies

**סטטוס:** מניחים שמדיניות בסיסית קיימת. יש לוודא שהמדיניות המפורטת כאן מיושמת.

```sql
-- וודא שיש policies מתאימים
CREATE POLICY "Users can view own transactions"
ON transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
ON transactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
ON transactions FOR DELETE
USING (auth.uid() = user_id);

-- מדיניות INSERT (לא הוזכרה במקור אך חשובה)
CREATE POLICY "Users can insert their own transactions"
ON transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

## 14. הנחיות פיתוח

### סדר יישום מומלץ (מעודכן)

1.  ~~הגדרת טיפוסים ואינטרפייסים~~ (בוצע)
2.  ~~יצירת RPC functions בסופהבייס (`get_user_transactions`, `delete_user_transaction`, `update_user_transaction`)~~ (בוצע)
3.  ~~בניית Service Layer~~ (בוצע)
4.  ~~יצירת Zustand Store~~ (בוצע)
5.  ~~פיתוח רכיב הטבלה הבסיסי~~ (בוצע)
6.  ~~הוספת סינונים וחיפוש~~ (בוצע)
7.  ~~מימוש Load More~~ (בוצע)
8.  ~~הוספת עריכה ומחיקה~~ (בוצע, Undo הוסר)
9.  ~~מימוש יצוא~~ (בוצע)
10. ~~הוספת Real-time updates~~ (הוסר)
11. אופטימיזציות וביצועים (חלקית בוצע - Skeleton, מידע פגינציה, React.memo לשורות, Toast notifications)

### עקרונות חשובים

- **Server-side filtering**: כל הסינונים והמיון בשרת - מיושם.
- **Optimistic updates**: עדכון מיידי ב-UI - מיושם.
- **Error resilience**: טיפול מלא בשגיאות - טיפול בסיסי קיים, ניתן להרחבה.
- **Progressive enhancement**: פונקציונליות בסיסית תעבוד תמיד - נכון ברובו.
- **Accessibility**: תמיכה מלאה ב-screen readers - דורש בדיקה ושיפורים ייעודיים.
- **Mobile responsive**: עבודה טובה על מובייל - דורש בדיקה ושיפורים ייעודיים.

### Code Style

- TypeScript מחמיר (strict mode) - נשמר.
- ESLint + Prettier - מניחים שמוגדר בפרויקט.
- Conventional commits - נשמר.
- Component composition over inheritance - נשמר.
- Pure functions בשירותים - נשמר ככל הניתן.
