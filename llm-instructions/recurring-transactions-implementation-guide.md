# מדריך להטמעת הוראות קבע (Recurring Transactions)

**סטטוס כללי:** שלבי הווב (1-3) הושלמו. מתחילים עבודה על שלב 4 (דסקטופ).

מסמך זה מתאר את שלבי הפעולה המפורטים להטמעת מערכת ניהול הוראות קבע (Standing Orders) באפליקציה, עבור פלטפורמת הווב (Supabase) והדסקטופ (Tauri v2/SQLite).

המדריך מבוסס על הדיון והדגשים הבאים:

- **ארכיטקטורה:** שימוש בשתי טבלאות נפרדות - `transactions` לתנועות בפועל, ו-`recurring_transactions` להגדרות הוראות הקבע.
- **תאימות לאחור:** המיגרציה תתבצע בשלבים, תוך שימוש בשינויים מוסיפים (Additive Changes) תחילה, כדי למנוע שברים במערכת הקיימת.
- **לוגיקת Cron Job חכמה:** הלוגיקה תהיה מבוססת מצב (`stateful`) ותדע להתמודד עם כשלים וריצות שהוחמצו.
- **תהליך פיתוח מדורג:** נתחיל עם פלטפורמת הווב, ולאחר אימות מלא, נעבור לפלטפורמת הדסקטופ.
- **שמירה על אחידות הקוד:** שימוש בתבניות, טכנולוגיות ומיקומי קבצים קיימים.

---

## שלב 1: הקמה ומיגרציית מסד נתונים (Web)

**סטטוס:** ✅ **בוצע**

מטרת שלב זה היא להכין את התשתית במסד הנתונים מבלי לשבור את הפונקציונליות הקיימת.

### 1.1: יצירת ענף (Branch) ייעודי ב-Git

**סטטוס:** ✅ **בוצע**

לפני כל שינוי, יש ליצור ענף חדש ב-Git כדי לבודד את הפיתוח.

```bash
git checkout -b feature/recurring-transactions
```

### 1.2: מיגרציה ראשונית למסד הנתונים (Supabase)

**סטטוס:** ✅ **בוצע**

נריץ סקריפט מיגרציה שיבצע שינויים מוסיפים (additive) בלבד.

**פעולות הסקריפט:**

1.  **יצירת טבלה חדשה `recurring_transactions`** לאחסון הגדרות הוראות הקבע.
2.  הגדרת עמודות בטבלה החדשה, כולל `execution_count` ו-`next_due_date` כפי שנדרש.
3.  הפעלת אבטחת RLS על הטבלה החדשה והגדרת פוליסות מתאימות.
4.  **הוספת עמודה חדשה `source_recurring_id`** לטבלה הקיימת `transactions`. עמודה זו תקשר טרנזקציה שנוצרה אוטומטית להגדרת הוראת הקבע שלה.

**סקריפט SQL לביצוע:**

```sql
-- Create the new table for recurring transaction definitions
CREATE TABLE public.recurring_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'active'::text CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    start_date date NOT NULL,
    next_due_date date NOT NULL,
    frequency text NOT NULL DEFAULT 'monthly'::text,
    day_of_month integer NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
    total_occurrences integer,
    execution_count integer NOT NULL DEFAULT 0,
    description text,
    amount numeric NOT NULL CHECK (amount >= 0),
    currency character varying NOT NULL,
    type text NOT NULL,
    category text,
    is_chomesh boolean,
    recipient text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add a comment to the table
COMMENT ON TABLE public.recurring_transactions IS 'Stores definitions for recurring transactions (standing orders).';

-- Enable Row Level Security (RLS)
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own recurring transactions"
ON public.recurring_transactions
FOR ALL USING (auth.uid() = user_id);

-- Add the foreign key column to the existing 'transactions' table
ALTER TABLE public.transactions
ADD COLUMN source_recurring_id uuid NULL REFERENCES public.recurring_transactions(id) ON DELETE SET NULL;

-- Add a comment to the new column
COMMENT ON COLUMN public.transactions.source_recurring_id IS 'Links to the recurring transaction definition that generated this transaction.';
```

**ביצוע:** יש להריץ את הסקריפט הזה דרך עורך ה-SQL של Supabase או באמצעות קובץ מיגרציה ב-Supabase CLI. **(בוצע בהצלחה)**

### 1.3: מיגרציית נתונים קיימים (אתגר מרכזי)

**סטטוס:** ⚠️ **נדחה / לא נדרש כרגע**

**אתגר:** אם קיימות במערכת הוראות קבע שהוגדרו במודל הישן (עם `is_recurring=true` בטבלת `transactions`), יש להעביר אותן למבנה החדש בצורה מושלמת.

**נקודות למחשבה:**

- **סקריפט מיגרציה חד-פעמי:** יש לכתוב סקריפט SQL (שלא ירוץ כחלק מה-Cron) שיעבור על כל רשומת `transactions` עם `is_recurring=true`, ייצור עבורה הגדרה מתאימה ב-`recurring_transactions`, ויקשר ביניהן.
- **קביעת תאריכים:** כיצד נקבע את ה-`start_date` וה-`next_due_date` עבור הוראות קיימות? ייתכן שנצטרך להסתכל על ה-`date` של הטרנזקציה המקורית כבסיס.
- **ניקיון:** לאחר המיגרציה, יש לסמן את טרנזקציות המקור הישנות כלא רלוונטיות (למשל, להפוך את `is_recurring` ל-`false`) כדי למנוע יצירה כפולה.

**המלצה:** שלב זה הוא רגיש ודורש בדיקות מקיפות בסביבת פיתוח לפני הרצה על נתוני אמת. **(החלטה: שלב זה ידחה. אין כרגע נתונים ישנים במערכת שמצריכים מיגרציה זו).**

---

## שלב 2: לוגיקת צד-שרת (Web)

**סטטוס:** ✅ **בוצע**

### 2.1: יצירת פונקציית ה-Cron Job ב-SQL

**סטטוס:** ✅ **בוצע**

ניצור פונקציית SQL שתכיל את כל הלוגיקה לביצוע הוראות הקבע. הפונקציה תהיה בטוחה לריצות מרובות (idempotent) ומבוססת מצב (stateful), מה שפותר את בעיית ה"חודש החסר".

**כיצד גישת `next_due_date` פותרת בעיות?**

- **חודש חסר / כשל ב-Cron Job:** אם ה-Cron Job נכשל ב-10 לחודש ולא רץ, למחרת (ב-11 לחודש) הוא ירוץ שוב ויסרוק את כל ההוראות. הוא ימצא את ההוראה שה-`next_due_date` שלה הוא ה-10 לחודש (כלומר, תאריך בעבר), ייצור עבורה את הטרנזקציה החסרה, ויקדם את ה-`next_due_date` שלה לחודש הבא. כך המערכת "מתקנת" את עצמה באופן אוטומטי.
- **יעילות:** הפונקציה סורקת רק הוראות שהגיע זמנן (`next_due_date <= CURRENT_DATE`), ולכן היא מהירה מאוד גם עם מיליוני הגדרות. אין צורך לצמצם את תדירות הריצה שלה.

**סקריפט SQL ליצירת הפונקציה `execute_due_recurring_transactions`:**

```sql
CREATE OR REPLACE FUNCTION execute_due_recurring_transactions()
RETURNS text AS $$
DECLARE
    rec RECORD;
    new_transaction_id uuid;
    total_executed integer;
BEGIN
    -- Loop through all active recurring transactions that are due
    FOR rec IN
        SELECT * FROM public.recurring_transactions
        WHERE status = 'active' AND next_due_date <= CURRENT_DATE
        ORDER BY next_due_date -- Process oldest first
    LOOP
        -- Insert the new transaction based on the recurring definition
        INSERT INTO public.transactions (
            user_id, date, amount, currency, description, type, category, is_chomesh, recipient, source_recurring_id
        ) VALUES (
            rec.user_id, rec.next_due_date, rec.amount, rec.currency, rec.description, rec.type, rec.category, rec.is_chomesh, rec.recipient, rec.id
        ) RETURNING id INTO new_transaction_id;

        -- Update the recurring transaction definition
        UPDATE public.recurring_transactions
        SET
            execution_count = rec.execution_count + 1,
            -- Calculate the next due date by adding one month
            next_due_date = (rec.next_due_date + INTERVAL '1 month')::date,
            -- If this was the last occurrence, mark as completed
            status = CASE
                        WHEN (rec.execution_count + 1) >= rec.total_occurrences THEN 'completed'
                        ELSE 'active'
                     END
        WHERE id = rec.id;

    END LOOP;

    RETURN 'Recurring transactions processed successfully.';
END;
$$ LANGUAGE plpgsql;
```

**נקודות למחשבה ואתגרים:**

- **אטומיות:** מה קורה אם ה-`INSERT` מצליח אבל ה-`UPDATE` נכשל? הטרנזקציה תיווצר שוב בריצה הבאה. הפונקציה בנויה בתוך בלוק טרנזקציה מובנה של `plpgsql`, מה שמבטיח ששתי הפעולות יצליחו או ייכשלו יחד, ושומר על אטומיות.
- **חישוב תאריכים מורכב:** מה קורה אם `day_of_month` הוא 31 והחודש הבא הוא פברואר? מנגנון ה-`INTERVAL` של PostgreSQL חכם מספיק כדי להתמודד עם זה ויבחר את היום האחרון של החודש הבא (למשל, 28 בפברואר).

### 2.2: תזמון הפונקציה כ-Cron Job

**סטטוס:** ✅ **בוצע**

1.  ב-Supabase Studio, נווט אל `Database` > `Cron Jobs`.
2.  צור "New Job" חדש.
3.  **שם:** `Daily Recurring Transactions Executor`
4.  **לו"ז:** `0 0 * * *` (ירוץ כל יום בחצות UTC).
5.  **פונקציה:** בחר את `execute_due_recurring_transactions`.

---

## שלב 3: הטמעה בממשק המשתמש (Frontend - Web)

**סטטוס:** ✅ **בוצע**

### 3.1: שירות צד-לקוח לניהול הוראות קבע

**סטטוס:** ✅ **בוצע**

- ניצור קובץ חדש, `src/lib/recurringTransactionsService.ts` (או נוסיף לקובץ שירות קיים).
- השירות יכיל פונקציות CRUD לניהול הוראות קבע באמצעות קריאות RPC ל-Supabase.
  - `createRecurringTransaction(definition)`
  - `getRecurringTransactions()`
  - `updateRecurringTransaction(id, updates)` (למשל, שינוי סטטוס ל-'paused' או 'cancelled').
  - `deleteRecurringTransaction(id)`

### 3.2: עדכון טופס יצירת הטרנזקציה

**סטטוס:** ✅ **בוצע**

- בקומפוננטה `src/components/forms/TransactionForm.tsx`:
  - נשנה את לוגיקת `onSubmit`.
  - אם ה-checkbox של הוראת קבע מסומן, הפונקציה תקרא ל-`createRecurringTransaction` מהשירות החדש.
  - אם ה-checkbox אינו מסומן, הפונקציה תתנהג כרגיל ותיצור טרנזקציה רגילה.

### 3.3: עדכון תצוגת טבלת הטרנזקציות הראשית

**סטטוס:** ✅ **בוצע**

- בקומפוננטה `src/components/TransactionsTable/TransactionRow.tsx`:
  - נשנה את לוגיקת הרנדור.
  - אם `transaction.source_recurring_id` אינו `null`, נצטרך לשלוף (או לקבל מראש) את המידע מההגדרה המתאימה.
  - נשתמש במידע זה כדי להציג את הסטטוס המבוקש, למשל: "תשלום 3 מתוך 12 (פעיל)".

**אתגר ופתרון:**

- **אתגר:** איך להציג את המידע "תשלום X מתוך Y" ביעילות, מבלי לבצע שאילתה נפרדת עבור כל שורת טרנזקציה (בעיית N+1).
- **פתרון:** בעת שליפת הטרנזקציות לתצוגה, נבצע `JOIN` בין טבלת `transactions` לטבלת `recurring_transactions` על בסיס העמודה `source_recurring_id`. כך, כל המידע הנדרש (`execution_count`, `total_occurrences`, `status`) יהיה זמין לכל טרנזקציה שנוצרה מהוראת קבע, ללא צורך בשאילתות נוספות. **(בוצע באמצעות עדכון פונקציית `get_user_transactions`).**

---

## שלב 4: הטמעה בפלטפורמת הדסקטופ (Tauri/SQLite)

**סטטוס:** ⏳ **לביצוע**

לאחר שהכל עובד באופן מלא ויציב בפלטפורמת הווב, נבצע את ההתאמות לדסקטופ.

### 4.1: מיגרציית מסד נתונים (SQLite)

**סטטוס:** ⏳ **לביצוע**

- נעדכן את קוד ה-Rust ב-`src-tauri/src/main.rs` (או במודול ייעודי לניהול DB) כדי לבצע את אותם שינויים בסכמת ה-SQLite:
  - יצירת טבלת `recurring_transactions`.
  - הוספת עמודת `source_recurring_id` לטבלת `transactions`.

### 4.2: לוגיקת צד-שרת (Rust)

**סטטוס:** ⏳ **לביצוע**

- ניצור פקודת Rust חדשה (`#[tauri::command]`), לדוגמה `execute_desktop_recurring_transactions`.
- הפקודה תכיל לוגיקה **זהה** לזו של פונקציית ה-SQL ב-Supabase.
- נקרא לפקודה זו באופן אוטומטי פעם אחת, בעת טעינת האפליקציה ב-`App.tsx` (כאשר `platform === 'desktop'`).

### 4.3: טיפול ב"סגירת פערים" בגרסת הדסקטופ

**סטטוס:** ⏳ **לביצוע**

בניגוד ל-Cron Job שרץ כל יום, גרסת הדסקטופ רצה רק כשהמשתמש מפעיל אותה. לכן, הלוגיקה ב-Rust צריכה לדעת להתמודד עם פערים של ימים, שבועות או חודשים.

**הלוגיקה בתוך `execute_desktop_recurring_transactions` תהיה:**

1.  הפקודה תרוץ בתוך **לולאת `while`**.
2.  בכל איטרציה של הלולאה, היא תסרוק את טבלת `recurring_transactions` ותחפש הוראות עם `status = 'active'` ו-`next_due_date <= CURRENT_DATE`.
3.  אם היא **לא מוצאת** הוראות כאלה, זה אומר שהמערכת מעודכנת, והלולאה מסתיימת.
4.  אם היא **כן מוצאת** הוראות כאלה, היא תבצע את אותן פעולות כמו פונקציית ה-SQL: תיצור את הטרנזקציות הנדרשות ותעדכן את ה-`next_due_date` וה-`execution_count` של ההוראות שבוצעו.
5.  הלולאה תחזור על עצמה, תבצע סריקה נוספת, וחוזר חלילה.

תהליך זה מבטיח שאם משתמש לא פתח את האפליקציה במשך שלושה חודשים, עם הפתיחה, הלולאה תרוץ שלוש פעמים (פעם לכל חודש שהוחמצ) עד שכל ה-`next_due_date` יהיו בעתיד והמערכת תהיה מסונכרנת לחלוטין.

**אתגר ופתרון:**

- **אתגר:** אם משתמש לא פתח את האפליקציה במשך זמן רב (למשל, שנה), תהליך "סגירת הפערים" עלול לקחת זמן ולתקוע את ממשק המשתמש.
- **פתרון:** יש להריץ את הפקודה `execute_desktop_recurring_transactions` ב-thread נפרד ב-Rust כדי לא להקפיא את ה-UI. במקביל, ניתן להציג חיווי בממשק המשתמש (למשל, "מעדכן הוראות קבע...") כל עוד התהליך רץ ברקע.

---

## שלב 5: ניקיון (Cleanup)

**סטטוס:** ⏳ **לביצוע**

שלב זה יתבצע רק לאחר שהמערכת החדשה הוכחה כיציבה.

### 5.1: מיגרציה סופית

**סטטוס:** ⏳ **לביצוע**

- ניצור מיגרציה נוספת (ב-Supabase וב-Rust) שתסיר את העמודות המיותרות מטבלת `transactions`:
  - `is_recurring`
  - `recurring_day_of_month`
  - `recurring_total_count`

שלב זה ישלים את המעבר המלא לארכיטקטורה החדשה.
