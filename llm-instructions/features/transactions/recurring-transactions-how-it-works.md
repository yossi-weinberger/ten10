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
  - **שדות המרת מטבע (נוסף ינואר 2026):**
    - `original_amount`: הסכום המקורי (לפני המרה, אם רלוונטי).
    - `original_currency`: מטבע המקור.
    - `conversion_rate`: שער ההמרה שנקבע ביצירה.
    - `conversion_date`: תאריך קביעת השער.
    - `rate_source`: "auto" (API) או "manual" (ידני).
  - `created_at` ו-`updated_at`: חותמות זמן.
- **חשוב:** כאשר נוצרת הוראת קבע עם מטבע זר, השדה `amount` מכיל את הסכום **המומר** (במטבע ברירת המחדל), והפרטים המקוריים נשמרים בשדות `original_*`. גישה זו ("Locked-in Rate") מבטיחה עקביות ביצירת התנועות.
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

- **תזמון:** Cron Job יומי (בחצות UTC) דרך Supabase, קורא ל-Edge Function `process-recurring-transactions`.
- **לוגיקה (Edge Function - TypeScript):**
  - **שליפה:** שולף הוראות עם `status = 'active'` ו-`next_due_date <= CURRENT_DATE`.
  - **לכל הוראה:**
    1. **בדיקת פרטי המרה שמורים:** אם `original_amount` ו-`original_currency` קיימים בהוראה, משתמש בנתונים אלו ישירות (השער "ננעל" בעת יצירת ההוראה).
    2. **Fallback להמרה דינמית:** אם אין פרטי המרה שמורים ומטבע ההוראה שונה מהמטבע הראשי, קורא ל-API חיצוני (`exchangerate-api.com`) לקבלת שער עדכני.
    3. **יצירת תנועה:** מכניס תנועה חדשה לטבלת `transactions` עם:
       - `amount`: הסכום המומר (במטבע הראשי).
       - `original_amount`: הסכום המקורי במטבע ההוראה.
       - `conversion_rate`, `conversion_date`, `rate_source`: פרטי ההמרה.
       - `source_recurring_id` ו-`occurrence_number`.
    4. **עדכון הוראה:** מעדכן `execution_count`, מחשב `next_due_date` (מוסיף חודש), ומעדכן סטטוס אם הסתיים.
- **אטומיות:** ריצה סדרתית בתוך ה-Function, עם טיפול בשגיאות פרטני לכל הוראה.
- **קובץ:** `supabase/functions/process-recurring-transactions/index.ts`

---

## תהליך ביצוע הוראות הקבע (Desktop - Tauri/SQLite)

- **תזמון:** מופעל אוטומטית בעת טעינת האפליקציה (ב-`App.tsx` קורא ל-`RecurringTransactionsService.processDueTransactions`).
- **לוגיקה (TypeScript Service - `src/lib/services/recurring-transactions.service.ts`):**
  - השירות משתמש ב-`invoke` לשליפת ההוראות (`get_due_recurring_transactions_handler`).
  - **לכל הוראה עם פרטי המרה שמורים:**
    1. **שער ידני (`rate_source === "manual"`):** תמיד משתמש בשער שנקבע בעת ההגדרה. המשתמש הגדיר אותו במפורש.
    2. **שער אוטומטי (`rate_source === "auto"`):** מנסה למשוך שער עדכני מה-API. אם הצליח - משתמש בשער החדש. אם נכשל (אין אינטרנט) - משתמש בשער השמור מעת ההגדרה.
  - **לכל הוראה legacy (ללא פרטי המרה):** משתמש ב-`ExchangeRateService` לקבלת שער (API עם fallback ל-DB/Cache).
  - **יצירה:** קורא ל-`addTransaction` עם הנתונים המומרים ופרטי ההמרה.
  - **עדכון:** קורא ל-`update_recurring_transaction_handler` לעדכון המונה והתאריך הבא.
- **עקרון מרכזי:** לעולם לא מדלגים על תנועה בגלל חוסר שער. שער ידני קבוע לנצח. שער אוטומטי מנסה להתרענן אך חוזר לשער השמור אם צריך.
- **יתרון:** שימוש בלוגיקה משותפת (TS) להמרת מטבעות ומניעת כפילות קוד מול Rust.
- **הערה:** קיים גם קוד Rust מקביל ב-`recurring_transaction_commands.rs`, אך כרגע הקוד ב-TypeScript הוא הפעיל.

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

---

## עריכת הוראות קבע - רכיבי UI

### RecurringTransactionEditModal

מודל העריכה משתמש בפטרן **Variant Locking** למניעת שגיאות DOM בנייד:

- **בדסקטופ:** משתמש ב-`Dialog`
- **בנייד:** משתמש ב-`Drawer`
- **נעילת וריאנט:** כשהמודל פתוח, לא מתבצע מעבר בין Dialog ל-Drawer גם אם גודל המסך משתנה (למשל, כשמקלדת נפתחת בנייד)

### RecurringTransactionsTableDisplay

טבלת הצגת הוראות הקבע כוללת:

- **Dropdown Menu:** פעולות עריכה ומחיקה משתמשות ב-`requestAnimationFrame` לדחיית הפתיחה עד שה-Dropdown נסגר
- **Portal Cleanup:** לאחר שמירה/מחיקה, רענון הטבלה מתבצע ב-`requestAnimationFrame` למניעת race conditions עם ניקוי ה-Portal

```typescript
// דוגמה מהקוד
requestAnimationFrame(() => {
  fetchRecurring();
  toast.success(t("messages.recurringUpdateSuccess"));
});
```

ראה `ui-component-guidelines.md` סעיף 11 לפירוט מלא על הפטרן.

---

מסמך זה מעודכן נכון לתאריך ינואר 2026; עודכן לאחרונה עם תמיכה בהמרת מטבע להוראות קבע (שער ידני קבוע / שער אוטומטי עם fallback). בדוק שינויים בקוד בפועל.
