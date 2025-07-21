# מדריך להבנת מנגנון הוראות הקבע (Recurring Transactions)

מסמך זה מספק הסבר מפורט ומקיף על אופן פעולת מערכת ניהול הוראות הקבע (Standing Orders) באפליקציה, הן בפלטפורמת הווב (Supabase) והן בפלטפורמת הדסקטופ (Tauri v2 עם SQLite). המסמך מבוסס על מדריך ההטמעה הקיים (`recurring-transactions-implementation-guide.md`) ועל קוד האפליקציה בפועל, כפי שנבדק בקבצים הרלוונטיים.

המסמך מותאם במיוחד לשימוש כקונטקסט איכותי למודלי שפה (LLMs), עם מבנה מובנה, כותרות ברורות, רשימות ממוספרות ותתי-רשימות, הסברים מדויקים והפניות לקבצים ספציפיים בקוד. זה מאפשר ל-LLM להבין את הלוגיקה, לזהות קשרים בין מרכיבים ולייצר תשובות מדויקות בנוגע למערכת.

---

## מבוא ומטרה

- **מטרה:** מערכת הוראות הקבע מאפשרת למשתמשים להגדיר תנועות פיננסיות חוזרות (כגון תשלומים חודשיים) שיופעלו אוטומטית, ללא צורך בהזנה ידנית כל פעם. זה משפר את חווית המשתמש ומבטיח דיוק בחישובים פיננסיים כמו מאזן מעשר.
- **ארכיטקטורה כללית:**
  - **מבנה נתונים:** שתי טבלאות נפרדות - `transactions` (לתנועות בפועל) ו-`recurring_transactions` (להגדרות הוראות הקבע).
  - **לוגיקה מבוססת מצב (Stateful):** המערכת משתמשת בשדות כמו `next_due_date` ו-`execution_count` כדי להתמודד עם כשלים או ריצות שהוחמצו, מה שהופך אותה ל-idempotent (בטוחה לריצות חוזרות).
  - **הבדלים בין פלטפורמות:** בווב - Cron Job יומי. בדסקטופ - הרצה בעת טעינת האפליקציה.
- **קבצים מרכזיים בקוד:**
  - Frontend: `src/lib/data-layer/recurringTransactions.service.ts`, `src/lib/data-layer/transactionForm.service.ts`, `src/components/forms/TransactionForm.tsx`.
  - Desktop (Rust): `src-tauri/src/commands/recurring_transaction_commands.rs`, `src-tauri/src/commands/db_commands.rs`.
  - סוגים: `src/types/transaction.ts`.

---

## מבנה הנתונים

המערכת משתמשת בשתי טבלאות עיקריות, עם קישור ביניהן דרך `source_recurring_id`.

### 1. טבלת `recurring_transactions` (הגדרות הוראות הקבע)

- **תיאור:** מאחסנת את ההגדרה של הוראת הקבע, ללא יצירת תנועות בפועל עד להפעלה.
- **עמודות מרכזיות (מבוסס על `src/types/transaction.ts` ו-`src-tauri/src/models.rs`):**
  - `id`: UUID ייחודי.
  - `user_id`: קישור למשתמש (רלוונטי לווב; null בדסקטופ).
  - `status`: "active", "paused", "completed", "cancelled".
  - `start_date` ו-`next_due_date`: תאריכי התחלה וביצוע הבא (ISO string).
  - `frequency`: "monthly" (כרגע תמיכה ראשונית; TODO: weekly/yearly).
  - `day_of_month`: יום בחודש לביצוע (1-31).
  - `total_occurrences`: מספר ביצועים כולל (אופציונלי).
  - `execution_count`: מספר ביצועים שבוצעו.
  - שדות תנועה: `amount`, `currency`, `type`, `category`, `is_chomesh`, `recipient`.
  - `created_at` ו-`updated_at`: חותמות זמן.
- **אבטחה (ווב):** RLS מופעל, עם פוליסה המאפשרת גישה רק לנתוני המשתמש עצמו.

### 2. טבלת `transactions` (תנועות בפועל)

- **תיאור:** מאחסנת את התנועות שנוצרו מהוראות הקבע (או ידנית).
- **עמודות מרכזיות:**
  - שדות סטנדרטיים: `id`, `date`, `amount`, `currency`, `type` וכו'.
  - `source_recurring_id`: קישור להגדרה ב-`recurring_transactions` (אם נוצר מהוראת קבע).
  - `occurrence_number`: מספר הסידורי של הביצוע (למשל, 3/12).
- **JOIN בקוד:** שאילתות משתמשות ב-LEFT JOIN כדי לשלב מידע מהוראות הקבע (ראה `src-tauri/src/commands/transaction_commands.rs`).

### 3. ניקיון (Cleanup)

- עמודות ישנות כמו `is_recurring` הוסרו במיגרציה סופית (בוצע ב-`src-tauri/src/commands/db_commands.rs`).

---

## תהליך יצירת הוראת קבע

- **ממשק משתמש:** דרך `TransactionForm.tsx` (ב-`src/components/forms/TransactionForm.tsx`).
  - אם `is_recurring` מסומן, הטופס אוסף `frequency`, `recurringTotalCount` ו-`day_of_month` (מחושב מתאריך ההתחלה).
- **לוגיקה (Frontend):**
  - `transactionForm.service.ts` קובע את סוג התנועה הסופי (למשל, "exempt-income" אם `isExempt`).
  - אם recurring, בונה אובייקט `NewRecurringTransaction` וקורא ל-`createRecurringTransaction` מ-`recurringTransactions.service.ts`.
- **פלטפורמות:**
  - **ווב:** מכניס ישירות ל-Supabase דרך `supabase.from("recurring_transactions").insert()`.
  - **דסקטופ:** מייצר ID מקומי (nanoid), קורא לפקודת Rust `add_recurring_transaction_handler` שמכניס ל-SQLite.
- **הערות:** אין יצירת תנועה ראשונית; ההגדרה נשמרת, והביצוע מתרחש מאוחר יותר.

---

## תהליך ביצוע הוראות הקבע (Web - Supabase)

- **תזמון:** Cron Job יומי (בחצות UTC) דרך Supabase, קורא לפונקציית SQL `execute_due_recurring_transactions`.
- **לוגיקה (SQL):**
  - סורק הוראות עם `status = 'active'` ו-`next_due_date <= CURRENT_DATE`.
  - לכל הוראה:
    1. יוצר תנועה חדשה ב-`transactions` עם `source_recurring_id` ו-`occurrence_number = execution_count + 1`.
    2. מעדכן `execution_count`, מחשב `next_due_date` (מוסיף חודש).
    3. אם הגיע ל-`total_occurrences`, משנה סטטוס ל-'completed'.
- **אטומיות:** בתוך לולאת FOR, מבטיחה idempotence; מתקנת כשלים אוטומטית.

---

## תהליך ביצוע הוראות הקבע (Desktop - Tauri/SQLite)

- **תזמון:** מופעל אוטומטית בעת טעינת האפליקציה (ב-`App.tsx` בתוך `useEffect`, אחרי `init_db`).
- **לוגיקה (Rust - `execute_due_recurring_transactions_handler` ב-`recurring_transaction_commands.rs`):**
  - מקבל תאריך נוכחי.
  - סורק הוראות עם `status = 'active'` ו-`next_due_date <= today`.
  - לכל הוראה (בתוך טרנזקציה):
    - לופ פנימי על כל התאריכים שהוחמצו (עד היום).
    - יוצר תנועה ב-`transactions` עם `source_recurring_id` ו-`occurrence_number`.
    - מעדכן `execution_count`, מחשב `next_due_date` (מוסיף חודש, פונקציה `calculate_next_due_date`).
    - אם הגיע ל-`total_occurrences`, משנה סטטוס ל-'completed'.
  - Commit בסוף כל הוראה; rollback אם כשל.
- **אטומיות ויעילות:** לופים מקוננים מבטיחים טיפול בפערים גדולים; idempotent.

---

## תצוגה ומסננים בטבלה

- **תצוגה:** ב-`TransactionRow.tsx` (ב-`src/components/TransactionsTable/TransactionRow.tsx`):
  - אם `source_recurring_id` קיים, מציג Badge עם סטטוס, התקדמות (execution_count / total_occurrences) ו-Tooltip עם פרטים (תדירות, יום).
- **מסננים (ב-`TransactionsFilters.tsx`):**
  - סינון ראשי: "הכל", "הוראות קבע בלבד", "תנועות רגילות".
  - משנה: סטטוס (active/paused וכו') ותדירות (monthly וכו').
  - לוגיקה: מסננים משנה פעילים רק אם "הוראות קבע בלבד" נבחר.
- **שאילתות:** בווב - RPC `get_user_transactions`; בדסקטופ - `get_filtered_transactions_handler` עם JOIN.

---

## ייצוא וייבוא נתונים

- **ייצוא:** כולל מידע recurring דרך JOIN (ב-`export_transactions_handler` ב-Rust; דומה בווב).
- **ייבוא:** ב-`dataManagement.service.ts`:
  - יוצר הגדרות recurring חדשות ומקשר תנועות (משמר IDים חדשים).
  - תומך בהעברה בין פלטפורמות (web-to-desktop ולהיפך).

---

## הערות נוספות ומגבלות

- **תדירויות נוספות:** כרגע רק "monthly" מוטמע במלואו; weekly/yearly דורשים הרחבה ב-`calculate_next_due_date`.
- **בדיקות:** מומלץ להוסיף כפתור דיבוג להרצה ידנית.
- **אתגרים פוטנציאליים:** טיפול בתאריכים (למשל, 31 בפברואר) מטופל על ידי chrono ב-Rust ו-INTERVAL ב-SQL.
- **עדכונים עתידיים:** הרחבת תמיכה בסטטוסים (pause/resume) ועריכת הוראות קיימות.

מסמך זה מעודכן נכון לתאריך [הכנס תאריך]; בדוק שינויים בקוד בפועל.
