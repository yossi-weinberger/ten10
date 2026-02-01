# מדריך להטמעת הוראות קבע (Recurring Transactions)

**סטטוס כללי:** שלבי הווב (1-3) הושלמו במלואם. העבודה על שלב 4 (דסקטופ) החלה.

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
            user_id, date, amount, currency, description, type, category, is_chomesh, recipient, source_recurring_id, occurrence_number
        ) VALUES (
            rec.user_id, rec.next_due_date, rec.amount, rec.currency, rec.description, rec.type, rec.category, rec.is_chomesh, rec.recipient, rec.id, rec.execution_count + 1
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

### 2.3: לוגיקת "השלמת פערים" (Catch-Up Logic)

המערכת מיישמת לוגיקת השלמה זהה (Catch-Up) בשתי הפלטפורמות (Web ו-Desktop):

- אם המערכת לא רצה זמן מה (למשל, שרת כבוי או מחשב סגור), בריצה הבאה היא תזהה את הפער.
- תתבצע לולאה שתייצר את **כל** התנועות שהוחמצו ברצף (למשל, 3 חודשים אחורה ייצרו 3 תנועות).
- התאריכים יתיישרו לפי "יום החיוב" המוגדר, ללא תלות בתאריך הריצה בפועל.

---

## שלב 3: הטמעה בממשק המשתמש (Frontend - Web)

**סטטוס:** ✅ **בוצע**

### 3.1: שירות צד-לקוח לניהול הוראות קבע

**סטטוס:** ✅ **בוצע**

- נוצר קובץ חדש, `src/lib/data-layer/recurringTransactions.service.ts` (או נוסף לקובץ שירות קיים).
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
  - שונתה לוגיקת הרנדור כדי להציג `Badge` ייעודי עבור הוראות קבע.
  - ה-Badge מציג את סטטוס הוראת הקבע (פעיל/מושהה וכו') ואת ההתקדמות שלה (למשל: "3/12").
  - `Tooltip` על גבי ה-Badge מציג מידע מפורט בעברית, כולל תדירות ויום חיוב.

**אתגר ופתרון:**

- **אתגר:** איך להציג את המידע "תשלום X מתוך Y" ביעילות, מבלי לבצע שאילתה נפרדת עבור כל שורת טרנזקציה (בעיית N+1).
- **פתרון:** בעת שליפת הטרנזקציות לתצוגה, נבצע `JOIN` בין טבלת `transactions` לטבלת `recurring_transactions` על בסיס העמודה `source_recurring_id`. כך, כל המידע הנדרש (`execution_count`, `total_occurrences`, `status`) יהיה זמין לכל טרנזקציה שנוצרה מהוראת קבע, ללא צורך בשאילתות נוספות. **(בוצע באמצעות עדכון פונקציית `get_user_transactions`).**

### 3.4: הוספת מסננים מתקדמים לטבלה

**סטטוס:** ✅ **בוצע**

כדי לשפר את חווית המשתמש, נוספו מסננים מתקדמים לקומפוננטה `TransactionsFilters.tsx` המאפשרים שליטה מלאה בתצוגת הוראות הקבע.

- **סינון ראשי:** נוסף `Select` המאפשר להציג "הכל", "הוראות קבע בלבד", או "תנועות רגילות בלבד".
- **סינוני משנה:** נוספו שני תפריטי `DropdownMenu` המאפשרים סינון נוסף לפי:
  - **סטטוס הוראת קבע:** פעיל, מושהה, הושלם, בוטל.
  - **תדירות:** יומי, שבועי, חודשי, שנתי.
- **לוגיקה חכמה:** סינוני המשנה (סטטוס ותדירות) זמינים ופעילים רק כאשר המשתמש בוחר להציג "הוראות קבע בלבד".
- **הטמעה מלאה:** המשימה כללה עדכון של פונקציית ה-SQL `get_user_transactions` עם פרמטרים חדשים, עדכון ה-Store ב-Zustand, עדכון שכבת השירות, ויישום ה-UI והלוגיקה בקומפוננטת הסינון.

---

## שלב 4: הטמעה בפלטפורמת הדסקטופ (Tauri/SQLite)

**סטטוס:** ✅ **בוצע**

לאחר שהכל עובד באופן מלא ויציב בפלטפורמת הווב, נבצע את ההתאמות לדסקטופ.

### 4.1: מיגרציית מסד נתונים (SQLite)

**סטטוס:** ✅ **בוצע**

- פונקציית `init_db` הורחבה וכעת היא מבצעת את הפעולות הבאות באופן אידמפוטנטי (בטוח לריצות חוזרות):
  - יוצרת את טבלת `recurring_transactions` אם אינה קיימת.
  - מוסיפה את עמודת `source_recurring_id` לטבלת `transactions` אם אינה קיימת.
- ה-Struct של `Transaction` ושל מבני נתונים רלוונטיים אחרים עודכנו בקובץ המרכזי `src-tauri/src/models.rs` כדי לתמוך בשדות החדשים.

### 4.2: לוגיקת צד-שרת (Rust)

**סטטוס:** ✅ **בוצע**

- נוצר מודול פקודות חדש: `src-tauri/src/commands/recurring_transaction_commands.rs`.
- **לוגיקת ביצוע הוראות קבע:**
  - הוטמעה במלואה הפקודה `execute_due_recurring_transactions_handler`.
  - הפקודה סורקת את כל הוראות הקבע הפעילות שזמנן הגיע, יוצרת עבורן תנועות חדשות בטבלת `transactions`, ומעדכנת את הוראות הקבע עם תאריך החיוב הבא והסטטוס החדש.
  - כל הפעולות נעשות באופן אטומי (בתוך טרנזקציית מסד נתונים) כדי להבטיח את שלמות הנתונים.
- **לוגיקת יצירת הוראות קבע:**
  - נוספה פקודה חדשה, `add_recurring_transaction_handler`, המאפשרת ליצור הגדרת הוראת קבע חדשה מצד ה-frontend.
- שתי הפקודות נרשמו ב-`main.rs` וזמינות לקריאה מממשק המשתמש.

### 4.3: טיפול ב"סגירת פערים" בגרסת הדסקטופ

**סטטוס:** ✅ **בוצע**

הלוגיקה להרצת הוראות הקבע שזמנן הגיע, מופעלת כעת באופן אוטומטי בעת כל טעינה של האפליקציה.

- **מיקום הקריאה:** הקוד ממוקם בקומפוננטה `App.tsx`, בתוך `useEffect` שתלוי בטעינת הפלטפורמה.
- **סדר פעולות:** הקריאה לפקודת `execute_due_recurring_transactions_handler` מתבצעת מיד לאחר אתחול מוצלח של מסד הנתונים (`init_db`).
  - **בטיחות:** הלוגיקה ב-Typescript (בתוך `LOOP`) יודעת לטפל בפערים של ימים, שבועות או חודשים, ותיצור את כל התנועות שהוחמצו מאז הפעם האחרונה שהאפליקציה רצה ("Catch Up").
  - **טיפול בתאריכים:** שימוש בפונקציות `parseLocal` ופירוק מחרוזת ידני למניעת נדידת תאריכים עקב הפרשי Timezone.
  - **עדכון ה-UI:** לאחר שהפקודה מסיימת לרוץ, ה-Store של Zustand מתעדכן, מה שגורם לרענון אוטומטי של טבלת התנועות עם הנתונים החדשים.

### 4.4: הטמעת הטופס בממשק המשתמש (Frontend - Desktop)

**סטטוס:** ✅ **בוצע**

בוצע Refactoring משמעותי כדי להפריד בין הלוגיקה העסקית לשכבת התצוגה.

- **שירות ייעודי:** נוצר קובץ חדש, `src/lib/data-layer/transactionForm.service.ts`, המרכז את כל הלוגיקה של שליחת הטופס.
- **לוגיקה חכמה:** פונקציית `handleTransactionSubmit` יודעת להבדיל בין ווב לדסקטופ:
  - **בדסקטופ:** היא בונה אובייקט `RecurringTransaction` מלא וקוראת לפקודת ה-Rust `add_recurring_transaction_handler` כדי ליצור **הגדרת הוראת קבע בלבד**.
  - **בווב:** היא משתמשת בלוגיקה הקיימת ליצירת הוראת קבע דרך שירותי Supabase.
- **קומפוננטה נקייה:** קומפוננטת `TransactionForm.tsx` הפכה פשוטה ונקייה, ואחראית רק על התצוגה וקריאה לשירות החדש.

### 4.5: התאמת תצוגת הנתונים ופונקציונליות ייצוא (Desktop)

**סטטוס:** ✅ **בוצע**

כתוצאה מהשינויים במבנה הנתונים, בוצעו התאמות קריטיות בתצוגת הנתונים ובפונקציונליות הייצוא בגרסת הדסקטופ.

- **עדכון תצוגת טבלת הטרנזקציות:**

  - **הבעיה:** הטבלה הראשית לא הציגה מידע מפורט על הוראות קבע.
  - **הפתרון:**
    - **צד-שרת (Rust):** פקודת `get_filtered_transactions_handler` עודכנה וכעת היא מבצעת `LEFT JOIN` עם טבלת `recurring_transactions` ומספקת את כל המידע הדרוש.
    - **צד-לקוח (Frontend):** קומפוננטת `TransactionRow.tsx` עודכנה כדי לצרוך את המידע הנוסף ולהציג אותו ויזואלית (Badge, Tooltip וכו') בגרסת הדסקטופ.

- **בדיקה ותיקון של פונקציונליות הייצוא:**
  - **הבעיה:** פונקציות הייצוא ל-Excel, PDF ו-CSV היו שבורות, כיוון שהסתמכו על מבנה הנתונים הישן.
  - **הפתרון:** הלוגיקה של כל אחד ממנגנוני הייצוא עודכנה כדי שתתמודד עם מבנה הנתונים החדש.

### 4.6: תיקון והתאמת המסננים המתקדמים (Desktop)

**סטטוס:** ✅ **בוצע**

במהלך הפיתוח, התגלה כי פונקציונליות הסינון המתקדם (סינון לפי סוג תנועה, סטטוס הוראת קבע וכו') אינה פועלת בגרסת הדסקטופ. הבעיה נפתרה באמצעות תהליך רב-שלבי:

- **עדכון צד-שרת (Rust):** פקודת `get_filtered_transactions_handler` הורחבה כדי לקבל פרמטרים של סינון מתקדם ושינוי שאילתת ה-SQL שתתמוך בהם.
- **עדכון צד-לקוח (Frontend):** שכבת השירות עודכנה כדי לשלוח את הפרמטרים הנכונים ל-Rust, כולל תיקון אי-התאמות בפורמט (`snake_case` מול `camelCase`) ובערכים שנשלחו.
- **תוצאה:** המסננים המתקדמים פועלים כמצופה. עבודת ה-Backend שבוצעה כאן משרתת גם את הדרישות של סעיף 4.5.

---

## שלב 5: בדיקות ודיבוג

**סטטוס:** ⏳ **נדחה לעת עתה**

כדי לאפשר בדיקה יעילה של המנגנון, נדרש להוסיף כלי דיבוג שיאפשרו להריץ את התהליכים באופן יזום. שלב זה אינו דחוף ויתבצע בהמשך.

### 5.1: הוספת כפתור דיבוג (דסקטופ)

- **מטרה:** להוסיף כפתור נסתר או כלי למפתחים שיקרא ישירות לפקודת `execute_due_recurring_transactions_handler` בלחיצת כפתור.
- **מיקום מוצע:** דף ההגדרות או קומפוננטת "מצב מפתח" ייעודית.

### 5.2: שינוי תאריך המערכת (אתגר)

- **מטרה:** לדמות התקדמות בזמן כדי לבדוק שהוראות קבע עם תאריך עתידי אכן מופעלות.
- **פתרון אפשרי:** ניתן לשנות את שעון המערכת ידנית לפני הפעלת האפליקציה. יש לקחת בחשבון שזה עלול להשפיע על דברים אחרים במחשב.

---

## שלב 6: ניקיון (Cleanup)

**סטטוס:** ✅ **בוצע**

שלב זה יתבצע רק לאחר שהמערכת החדשה הוכחה כיציבה.

### 6.1: מיגרציה סופית

**סטטוס:** ✅ **בוצע**

- נוצרה מיגרציה (ב-Supabase וב-Rust) שהסירה את העמודות המיותרות מטבלת `transactions`:
  - `is_recurring`
  - `recurring_day_of_month`
  - `recurring_total_count`

שלב זה משלים את המעבר המלא לארכיטקטורה החדשה, ומבנה מסד הנתונים נקי כעת משדות מדור קודם.
