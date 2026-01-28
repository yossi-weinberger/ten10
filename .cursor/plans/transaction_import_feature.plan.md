---
name: Transaction Import Feature
overview: תוכנית מקיפה להוספת יכולות ייבוא תנועות מקבצי CSV/Excel ותבניות בנקים לאפליקציית Ten10 - מערכת לניהול מעשרות והכנסות.
todos:
  - id: step0-vitest
    content: "שלב 0: הגדרת vitest והתשתית לטסטים"
    status: pending
  - id: step1-parsers
    content: "שלב 1.1: parsers ל-CSV/Excel + טסטים מלאים"
    status: pending
  - id: step1-validation
    content: "שלב 1.2: סכמת Zod לולידציה + טסטים"
    status: pending
  - id: step1-duplicates
    content: "שלב 1.3: זיהוי כפילויות (חודש+סכום) + זיהוי recurring + טסטים"
    status: pending
  - id: step1-wizard-ui
    content: "שלב 1.4: אשף ייבוא (ImportWizard) - UI מלא"
    status: pending
  - id: step1-import-service
    content: "שלב 1.5: import-service.ts - אורקסטרציה + טסטים"
    status: pending
  - id: step2-bank-templates
    content: "שלב 2: תבניות בנקים ישראליים"
    status: pending
isProject: false
---

# תוכנית ייבוא תנועות - Ten10 (גרסה מעודכנת)

## החלטות עיצוב שהתקבלו

לאחר דיון עם הצוות, הוחלט:

| נושא           | החלטה                                       | סיבה                                         |
| -------------- | ------------------------------------------- | -------------------------------------------- |
| **טסטים**      | vitest + טסטים מלאים לכל הלוגיקה            | פיצ'ר מורכב שצריך לדבג בזהירות               |
| **מטבע**       | המרה אוטומטית למטבע הראשי                   | ממנפים את מנגנון ה-Currency Conversion הקיים |
| **סוג תנועה**  | רק סוגים בסיסיים (income/expense/donation)  | המשתמש יערוך אח"כ לסוגים מורכבים             |
| **מיזוג**      | הוספה בלבד (אין החלפה!) + אזהרה על כפילויות | לא מחיקת נתונים קיימים                       |
| **כפילויות**   | זיהוי לפי חודש + סכום (לא תאריך מדויק)      | משתמשים לא מקפידים על תאריך מדויק            |
| **הוראות קבע** | זיהוי והזהרה - לא דילוג אוטומטי             | לתת למשתמש להחליט                            |
| **פלטפורמה**   | פרונט משותף, לוגיקה משותפת                  | כמו שאר הפרויקט                              |
| **Rust/Tauri** | שימוש ב-add_transaction הקיים (ללא שינוי)   | כבר יש הכל                                   |

---

## שלב 0: הגדרת vitest

### התקנה:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

### קובץ קונפיגורציה - `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### סקריפטים ב-package.json:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## טיפול במטבע - מימוש מפורט

המערכת כבר תומכת ב-12 מטבעות עם המרה אוטומטית. נמנף את `ExchangeRateService` הקיים.

### זרימה בייבוא:

```
+------------------+     +-------------------+     +------------------+
| קובץ CSV/Excel   | --> | זיהוי עמודת מטבע  | --> | בדיקה: מטבע ראשי?|
+------------------+     +-------------------+     +--------+---------+
                                                           |
                         +----------------------------------+
                         |                                  |
                    +----v----+                       +-----v------+
                    |   כן    |                       |    לא      |
                    +---------+                       +-----+------+
                         |                                  |
                    +----v--------+               +---------v---------+
                    | לייבא ישירות|               | להמיר אוטומטית    |
                    +-------------+               | (Web: API)        |
                                                  | (Desktop Offline: |
                                                  |  fallback לשער    |
                                                  |  אחרון/ידני)      |
                                                  +-------------------+
```

### קוד לדוגמה - שימוש ב-ExchangeRateService הקיים:

```typescript
// src/lib/import/currency-handler.ts
import { ExchangeRateService } from "@/lib/services/exchange-rate.service";
import { useDonationStore } from "@/lib/store";

export async function convertImportedAmount(
  amount: number,
  sourceCurrency: Currency,
  platform: "web" | "desktop",
): Promise<{
  convertedAmount: number;
  original_amount: number;
  original_currency: Currency;
  conversion_rate: number;
  rate_source: "auto" | "manual";
}> {
  const defaultCurrency = useDonationStore.getState().defaultCurrency;

  // אם המטבע זהה - אין צורך בהמרה
  if (sourceCurrency === defaultCurrency) {
    return {
      convertedAmount: amount,
      original_amount: amount,
      original_currency: sourceCurrency,
      conversion_rate: 1,
      rate_source: "auto",
    };
  }

  // ממנפים את השירות הקיים
  const rate = await ExchangeRateService.getRate(
    sourceCurrency,
    defaultCurrency,
  );

  return {
    convertedAmount: amount * rate.rate,
    original_amount: amount,
    original_currency: sourceCurrency,
    conversion_rate: rate.rate,
    rate_source: rate.source,
  };
}
```

---

## טיפול בסוג תנועה - מימוש מפורט

### לוגיקת קביעת סוג:

```typescript
// src/lib/import/type-resolver.ts
export function resolveTransactionType(
  amount: number,
  description?: string,
): TransactionType {
  // סכום שלילי = הוצאה
  if (amount < 0) {
    return "expense";
  }

  // סכום חיובי = הכנסה (ברירת מחדל)
  return "income";
}

// הסכום תמיד נשמר כערך חיובי (absolute)
export function normalizeAmount(amount: number): number {
  return Math.abs(amount);
}
```

### מה המשתמש יוכל לערוך אחר כך:

- `income` -> `exempt-income` (הכנסה פטורה)
- `expense` -> `recognized-expense` (הוצאה מוכרת)
- `income` + `is_chomesh=true` (חומש)
- `expense` -> `donation` (תרומה)

---

## זיהוי כפילויות - מימוש מפורט (חודש + סכום)

**עקרון**: משתמשים לא מקפידים על תאריך מדויק, לכן בודקים לפי **חודש + סכום** במקום תאריך מדויק.

### אלגוריתם זיהוי:

```typescript
// src/lib/import/duplicate-detector.ts
export interface DuplicateCandidate {
  imported: ParsedTransaction;
  existing: Transaction;
  matchType: "exact" | "similar" | "recurring";
  reason: string;
}

function getMonthKey(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${date.getMonth()}`;
}

export function detectDuplicates(
  newTransactions: ParsedTransaction[],
  existingTransactions: Transaction[],
): DuplicateCandidate[] {
  const duplicates: DuplicateCandidate[] = [];

  // יצירת מפה של תנועות קיימות לפי חודש + סכום
  const existingByMonthAmount = new Map<string, Transaction[]>();
  for (const existing of existingTransactions) {
    const key = `${getMonthKey(existing.date)}-${Math.abs(existing.amount)}`;
    if (!existingByMonthAmount.has(key)) {
      existingByMonthAmount.set(key, []);
    }
    existingByMonthAmount.get(key)!.push(existing);
  }

  for (const imported of newTransactions) {
    const key = `${getMonthKey(imported.date)}-${Math.abs(imported.amount)}`;
    const matches = existingByMonthAmount.get(key) || [];

    for (const existing of matches) {
      duplicates.push({
        imported,
        existing,
        matchType: "similar",
        reason: `סכום זהה (${imported.amount}₪) באותו חודש`,
      });
    }
  }

  return duplicates;
}
```

### טסטים לדוגמה:

```typescript
// src/lib/import/__tests__/duplicate-detector.test.ts
import { describe, it, expect } from "vitest";
import { detectDuplicates } from "../duplicate-detector";

describe("detectDuplicates", () => {
  it("should detect same amount in same month", () => {
    const imported = [{ date: "2026-01-15", amount: 500 }];
    const existing = [{ date: "2026-01-20", amount: 500 }];

    const result = detectDuplicates(imported, existing);
    expect(result).toHaveLength(1);
    expect(result[0].matchType).toBe("similar");
  });

  it("should NOT detect same amount in different month", () => {
    const imported = [{ date: "2026-01-15", amount: 500 }];
    const existing = [{ date: "2026-02-20", amount: 500 }];

    const result = detectDuplicates(imported, existing);
    expect(result).toHaveLength(0);
  });

  it("should NOT detect different amount in same month", () => {
    const imported = [{ date: "2026-01-15", amount: 500 }];
    const existing = [{ date: "2026-01-20", amount: 501 }];

    const result = detectDuplicates(imported, existing);
    expect(result).toHaveLength(0);
  });
});
```

---

## זיהוי הוראות קבע - מימוש מפורט

**אתגר**: איך לדעת שתנועה מיובאת מהבנק היא למעשה של הוראת קבע קיימת?

### אלגוריתם זיהוי:

```typescript
// src/lib/import/recurring-matcher.ts
export interface RecurringMatch {
  imported: ParsedTransaction;
  recurring: RecurringTransaction;
  confidence: "high" | "medium" | "low";
  reason: string;
}

export function detectRecurringMatches(
  newTransactions: ParsedTransaction[],
  existingRecurring: RecurringTransaction[],
  existingTransactions: Transaction[],
): RecurringMatch[] {
  const matches: RecurringMatch[] = [];

  // סינון רק recurring פעילות
  const activeRecurring = existingRecurring.filter(
    (r) => r.status === "active",
  );

  for (const imported of newTransactions) {
    const importDate = new Date(imported.date);
    const dayOfMonth = importDate.getDate();
    const monthYear = `${importDate.getFullYear()}-${importDate.getMonth()}`;

    for (const recurring of activeRecurring) {
      // בדיקה 1: סכום תואם
      const amountMatch =
        Math.abs(Math.abs(imported.amount) - recurring.amount) < 0.01;
      if (!amountMatch) continue;

      // בדיקה 2: יום בחודש תואם (±2 ימים tolerance)
      const dayMatch =
        recurring.day_of_month &&
        Math.abs(dayOfMonth - recurring.day_of_month) <= 2;

      // בדיקה 3: האם כבר יש תנועה מה-recurring באותו חודש?
      const alreadyExecuted = existingTransactions.some(
        (t) =>
          t.source_recurring_id === recurring.id &&
          getMonthKey(t.date) === monthYear,
      );

      if (amountMatch && dayMatch && !alreadyExecuted) {
        matches.push({
          imported,
          recurring,
          confidence: dayMatch ? "high" : "medium",
          reason: `סכום ${recurring.amount}₪ תואם להוראת קבע "${recurring.description}"`,
        });
      }
    }
  }

  return matches;
}
```

### UI להצגת התאמות להוראות קבע:

```
+------------------------------------------------------------------+
|  ⚠️ תנועות שעשויות להיות של הוראות קבע קיימות                    |
+------------------------------------------------------------------+
| תנועה מיובאת             | הוראת קבע תואמת          | פעולה      |
+------------------------------------------------------------------+
| 15/01 | 500₪ | העברה     | "חשמל חודשי" (יום 15)   | [לדלג ▼]   |
| 20/01 | 200₪ | הוראת קבע | "ארנונה" (יום 20)       | [לייבא ▼]  |
+------------------------------------------------------------------+
| אפשרויות:                                                         |
| • לדלג - לא לייבא את התנועה (כי ה-recurring כבר יצר אותה)         |
| • לייבא - לייבא בכל זאת (אם ה-recurring לא הופעל)                 |
| • לקשר - לייבא ולקשר להוראת הקבע הקיימת                          |
+------------------------------------------------------------------+
```

### טסטים:

```typescript
// src/lib/import/__tests__/recurring-matcher.test.ts
import { describe, it, expect } from "vitest";
import { detectRecurringMatches } from "../recurring-matcher";

describe("detectRecurringMatches", () => {
  it("should match transaction to recurring with same amount and day", () => {
    const imported = [{ date: "2026-01-15", amount: -500 }];
    const recurring = [
      {
        id: "rec-1",
        amount: 500,
        day_of_month: 15,
        status: "active",
        description: "חשמל",
      },
    ];
    const existing = []; // אין תנועות קיימות מה-recurring

    const result = detectRecurringMatches(imported, recurring, existing);
    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe("high");
  });

  it("should NOT match if recurring already executed this month", () => {
    const imported = [{ date: "2026-01-15", amount: -500 }];
    const recurring = [
      { id: "rec-1", amount: 500, day_of_month: 15, status: "active" },
    ];
    const existing = [
      {
        date: "2026-01-15",
        amount: 500,
        source_recurring_id: "rec-1",
      },
    ];

    const result = detectRecurringMatches(imported, recurring, existing);
    expect(result).toHaveLength(0); // לא צריך להתאים כי כבר בוצע
  });
});
```

---

## קוד Tauri/Rust - אין צורך בשינויים!

בדיקה של `src-tauri/src/commands/transaction_commands.rs` מראה שכבר יש את כל מה שצריך:

| פקודה קיימת                         | שימוש בייבוא                        |
| ----------------------------------- | ----------------------------------- |
| `add_transaction`                   | להוספת תנועה בודדת                  |
| `get_transactions_count`            | לבדוק אם יש תנועות קיימות           |
| `export_transactions_handler`       | לשליפת כל התנועות (לבדיקת כפילויות) |
| `get_filtered_transactions_handler` | לשליפת תנועות מסוננות               |

**אסטרטגיה**: נקרא ל-`add_transaction` בלולאה מצד ה-TypeScript. אם יהיו בעיות ביצועים (ייבוא של אלפי תנועות), נוסיף `import_transactions_batch` בשלב מאוחר יותר.

---

## ארכיטקטורת קבצים מעודכנת

```
src/lib/import/
├── index.ts                    # Re-exports
├── import.service.ts           # Orchestration - main entry point
├── parsers/
│   ├── csv-parser.ts          # Parse CSV files
│   ├── excel-parser.ts        # Parse XLSX files (using exceljs)
│   ├── types.ts               # ParsedRow, ParsedTransaction
│   └── __tests__/
│       ├── csv-parser.test.ts
│       └── excel-parser.test.ts
├── templates/
│   ├── index.ts               # Template registry
│   ├── bank-hapoalim.ts       # בנק הפועלים
│   ├── bank-leumi.ts          # בנק לאומי
│   ├── bank-discount.ts       # דיסקונט
│   └── credit-cards/
│       ├── max.ts             # מקס
│       ├── isracard.ts        # ישראכרט
│       └── cal.ts             # כאל
├── validation/
│   ├── import-schema.ts       # Zod schema for imported data
│   ├── validators.ts          # Custom validators (date formats, etc.)
│   └── __tests__/
│       └── import-schema.test.ts
├── duplicate-detector.ts       # Duplicate detection logic
├── recurring-matcher.ts        # Recurring transaction matching
├── currency-handler.ts         # Currency conversion for imports
├── type-resolver.ts           # Transaction type resolution
└── __tests__/
    ├── duplicate-detector.test.ts
    ├── recurring-matcher.test.ts
    └── import.service.test.ts

src/components/import/
├── ImportWizard.tsx            # Main wizard component (multi-step)
├── steps/
│   ├── FileUploadStep.tsx     # Step 1: File selection (react-dropzone)
│   ├── ColumnMappingStep.tsx  # Step 2: Map columns to fields
│   ├── PreviewStep.tsx        # Step 3: Preview & settings
│   └── ImportResultStep.tsx   # Step 4: Results & duplicates warning
├── ColumnMapper.tsx           # Column mapping UI
├── DataPreview.tsx            # Table preview of parsed data
├── DuplicateWarning.tsx       # Duplicate detection results
└── RecurringMatchWarning.tsx  # Recurring transaction match warning
```

---

## סכמת ולידציה לייבוא

```typescript
// src/lib/import/validation/import-schema.ts
import { z } from "zod";

export const importedRowSchema = z.object({
  date: z.string().refine(isValidDate, { message: "תאריך לא תקין" }),
  amount: z
    .number()
    .refine((n) => n !== 0, { message: "סכום לא יכול להיות 0" }),
  description: z.string().max(100).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  currency: z
    .enum([
      "ILS",
      "USD",
      "EUR",
      "CAD",
      "GBP",
      "AUD",
      "CHF",
      "ARS",
      "BRL",
      "ZAR",
      "MXN",
      "UAH",
    ])
    .optional()
    .default("ILS"),
});

export const importBatchSchema = z.object({
  rows: z.array(importedRowSchema).min(1, "יש לייבא לפחות שורה אחת"),
  source: z.enum(["csv", "excel", "bank_template"]),
  templateId: z.string().optional(),
});

export type ImportedRow = z.infer<typeof importedRowSchema>;
export type ImportBatch = z.infer<typeof importBatchSchema>;
```

---

## אשף הייבוא - זרימת UI

```
┌─────────────────────────────────────────────────────────┐
│  שלב 1/4: בחירת קובץ                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │                                                 │   │
│   │     גרור קובץ לכאן או לחץ לבחירה               │   │
│   │                                                 │   │
│   │     CSV, Excel (.xlsx)                         │   │
│   │                                                 │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│   תבניות מוכנות:                                        │
│   [בנק הפועלים] [בנק לאומי] [דיסקונט] [כרטיס אשראי]    │
│                                                         │
│                                        [הבא ->]         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  שלב 2/4: מיפוי עמודות                                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   תצוגה מקדימה (5 שורות ראשונות):                       │
│   ┌──────────┬──────────┬───────────┬─────────┐        │
│   │ עמודה A  │ עמודה B  │ עמודה C   │ עמודה D │        │
│   ├──────────┼──────────┼───────────┼─────────┤        │
│   │ 15/01/26 │ 500.00   │ משכורת    │ ILS     │        │
│   │ 20/01/26 │ -150.00  │ סופר      │ ILS     │        │
│   └──────────┴──────────┴───────────┴─────────┘        │
│                                                         │
│   מיפוי שדות:                                           │
│   תאריך*:    [עמודה A ▼]                               │
│   סכום*:     [עמודה B ▼]                               │
│   תיאור:     [עמודה C ▼]                               │
│   מטבע:      [עמודה D ▼] או [ILS - ברירת מחדל ▼]       │
│                                                         │
│   * שדות חובה                                           │
│                                                         │
│                              [<- הקודם] [הבא ->]        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  שלב 3/4: תצוגה מקדימה והגדרות                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   סיכום: 45 תנועות מוכנות לייבוא                        │
│                                                         │
│   הגדרות:                                               │
│   ○ הוספה לנתונים קיימים (מומלץ)                       │
│                                                         │
│   ☑ הצג אזהרה על כפילויות אפשריות                      │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │ תצוגה מקדימה של 5 תנועות ראשונות:              │   │
│   │ 15/01/2026 | +500.00₪ | הכנסה  | משכורת        │   │
│   │ 20/01/2026 | -150.00₪ | הוצאה  | סופר          │   │
│   │ ...                                             │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│                              [<- הקודם] [ייבא ->]       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  שלב 4/4: תוצאות                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ✓ הייבוא הושלם בהצלחה!                               │
│                                                         │
│   42 תנועות יובאו                                       │
│   3 תנועות דולגו (כפילויות)                            │
│   0 שגיאות                                              │
│                                                         │
│   ⚠️ נמצאו 3 כפילויות אפשריות:                          │
│   [הצג פרטים]                                           │
│                                                         │
│                                        [סיום]           │
└─────────────────────────────────────────────────────────┘
```

---

## תבניות בנקים - מבנה

```typescript
// src/lib/import/templates/types.ts
export interface BankTemplate {
  id: string;
  name: string; // "בנק הפועלים"
  nameEn: string; // "Bank Hapoalim"
  fileTypes: ("csv" | "xlsx")[];
  encoding?: string; // 'windows-1255' for Hebrew CSV
  columnMapping: {
    date: string | number; // Column name or index
    amount: string | number;
    description?: string | number;
    balance?: string | number; // For reference only
  };
  dateFormat: string; // 'DD/MM/YYYY' or 'YYYY-MM-DD'
  amountParser?: (value: string) => number; // Custom parser
  skipRows?: number; // Header rows to skip
  currency: Currency; // Usually 'ILS'
}

// src/lib/import/templates/bank-hapoalim.ts
export const bankHapoalimTemplate: BankTemplate = {
  id: "bank-hapoalim",
  name: "בנק הפועלים",
  nameEn: "Bank Hapoalim",
  fileTypes: ["csv", "xlsx"],
  encoding: "windows-1255",
  columnMapping: {
    date: "תאריך",
    amount: "סכום",
    description: "תאור",
    balance: "יתרה",
  },
  dateFormat: "DD/MM/YYYY",
  skipRows: 1,
  currency: "ILS",
};
```

---

## נקודות קריטיות לבדיקה (Checklist)

### שלב 0: Vitest Setup

- vitest מותקן ועובד
- `npm test` רץ בהצלחה
- alias `@/` עובד בטסטים

### שלב 1.1: Parsers

- CSV parser עובד עם UTF-8
- CSV parser עובד עם Windows-1255 (עברית)
- Excel parser עובד עם XLSX
- טיפול בשורות ריקות
- טיפול בכותרות בשורה ראשונה
- **טסטים**: לפחות 5 test cases לכל parser

### שלב 1.2: Validation

- תאריכים: DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY
- סכומים: 1,234.56 vs 1.234,56 vs 1234.56
- סוג תנועה: חיובי=הכנסה, שלילי=הוצאה
- **טסטים**: כל edge case מכוסה

### שלב 1.3: Duplicates + Recurring

- זיהוי לפי **חודש + סכום** (לא תאריך מדויק!)
- זיהוי התאמה להוראות קבע
- אזהרה מוצגת למשתמש
- **טסטים**: scenarios של כפילויות ו-false positives

### שלב 1.4: UI

- Drag & Drop עובד (react-dropzone)
- מיפוי עמודות אינטואיטיבי
- תצוגה מקדימה ברורה
- RTL עובד נכון
- Responsive למובייל

### שלב 1.5: Import Service

- מטבע: המרה עובדת ב-Web (API)
- מטבע: Fallback עובד ב-Desktop (offline)
- שדות `original_*` מאוכלסים נכון
- **טסטים**: integration tests

### פלטפורמות

- עובד ב-Web (Supabase)
- עובד ב-Desktop (SQLite via Tauri)
- UI זהה בשתי הפלטפורמות

---

## סיכום - סדר יישום

1. **שלב 0**: הגדרת vitest (30 דק')
2. **שלב 1.1**: Parsers + טסטים (2-3 שעות)
3. **שלב 1.2**: Validation + טסטים (1-2 שעות)
4. **שלב 1.3**: Duplicates + Recurring matcher + טסטים (2-3 שעות)
5. **שלב 1.4**: UI Wizard (3-4 שעות)
6. **שלב 1.5**: Import Service + integration (2-3 שעות)
7. **שלב 2**: Bank templates (נפרד, לפי דרישה)

**סה"כ משוער**: ~15-20 שעות עבודה (לא כולל bank templates)
