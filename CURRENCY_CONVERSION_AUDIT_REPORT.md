# דוח בדיקה: תמיכה בהמרת מטבעות (Currency Conversion)

**תאריך:** 23 בינואר 2026  
**מטרה:** בדיקה מעמיקה ששום דבר לא נשבר אחרי הוספת תמיכה בהמרת מטבעות

---

## סיכום ביצועים

⚠️ **הערה חשובה:** הבדיקה שבוצעה היא **בדיקה סטטית** (code review) - לא הרצתי את הקוד בפועל!

**מה נבדק:**
- ✅ קיום השדות החדשים בקוד
- ✅ הכללת השדות בפונקציות export/import
- ✅ טיפול בשדות ב-recurring transactions
- ✅ התאמת טיפוסים בין TypeScript ו-Rust
- ✅ אי-מחיקה של השדות בפונקציות addTransaction

**מה לא נבדק:**
- ❌ הרצה בפועל של export/import
- ❌ בדיקה שהנתונים נשמרים נכון ב-DB
- ❌ בדיקה שהנתונים נקראים נכון מה-DB
- ❌ בדיקת edge cases (null values, missing fields, וכו')

**המלצה:** יש לבצע בדיקות ידניות לפני שימוש בפרודקשן!  

---

## 1. בדיקת ייצוא (Export)

### Desktop (Rust)
**קובץ:** `src-tauri/src/commands/transaction_commands.rs`

✅ **מצב:** תקין  
- הפונקציה `export_transactions_handler` כוללת את כל השדות החדשים בשורה 203:
  ```rust
  t.original_amount, t.original_currency, t.conversion_rate, t.conversion_date, t.rate_source,
  ```
- השדות נכללים ב-SELECT query ונשלחים ב-JSON

### Web (Supabase)
**קובץ:** `src/lib/data-layer/dataManagement.service.ts`

✅ **מצב:** תקין (בדיקה סטטית)  
- הפונקציה `fetchAllTransactionsForExportWeb` משתמשת ב-`select("*")` (שורה 268)
- זה כולל אוטומטית את כל השדות החדשים מטבלת `transactions`
- השדות נשמרים ב-JSON export

⚠️ **צריך לבדוק:** שהשדות החדשים אכן מופיעים ב-JSON export בפועל

---

## 2. בדיקת ייבוא (Import)

### Desktop
**קובץ:** `src/lib/data-layer/dataManagement.service.ts` (שורות 180-186)

✅ **מצב:** תקין  
- הקוד מעביר את כל ה-transaction object עם spread operator:
  ```typescript
  const transactionForRust = {
    ...transaction,
    source_recurring_id: desktopSourceRecurringId,
  };
  ```
- זה כולל את כל השדות החדשים (`original_amount`, `original_currency`, וכו')
- הפונקציה `add_transaction` ב-Rust (שורה 621) מטפלת בכל השדות

### Web
**קובץ:** `src/lib/data-layer/dataManagement.service.ts` (שורות 488-496)

✅ **מצב:** תקין (בדיקה סטטית)  
- הקוד מעביר את כל ה-transaction object:
  ```typescript
  const transactionToInsert = {
    ...transaction,
    user_id: user.id,
    source_recurring_id: webSourceRecurringId,
  };
  ```
- הפונקציה `addTransaction` ב-`transactions.service.ts` (שורות 220-225) **לא מוחקת** את שדות ההמרה:
  - מוחקת רק: `is_recurring`, `recurring_day_of_month`, `recurring_total_count`, `recurring_info`, `id`
  - **לא מוחקת** את: `original_amount`, `original_currency`, `conversion_rate`, `conversion_date`, `rate_source`
- השדות אמורים להישמר ב-Supabase

⚠️ **צריך לבדוק:** שהשדות אכן נשמרים ב-Supabase בפועל

---

## 3. בדיקת Recurring Transactions

### Desktop (TypeScript Service)
**קובץ:** `src/lib/services/recurring-transactions.service.ts`

✅ **מצב:** תקין  
- השירות מטפל נכון בהמרת מטבעות (שורות 40-60)
- יוצר transaction עם כל שדות ההמרה (שורות 79-83):
  ```typescript
  original_amount: originalAmount,
  original_currency: originalCurrency as any,
  conversion_rate: conversionRate,
  conversion_date: conversionDate,
  rate_source: rateSource
  ```

### Web (Edge Function)
**קובץ:** `supabase/functions/process-recurring-transactions/index.ts`

✅ **מצב:** תקין  
- ה-Edge Function מטפל נכון בהמרת מטבעות (שורות 58-89)
- יוצר transaction עם כל שדות ההמרה (שורות 104-108):
  ```typescript
  original_amount: originalAmount,
  original_currency: originalCurrency,
  conversion_rate: conversionRate,
  conversion_date: conversionDate,
  rate_source: rateSource,
  ```

---

## 4. בדיקת טיפוסים (Types)

### TypeScript
**קובץ:** `src/types/transaction.ts`

✅ **מצב:** תקין  
- ה-interface `Transaction` כולל את כל השדות החדשים (שורות 63-67):
  ```typescript
  original_amount?: number | null;
  original_currency?: Currency | null;
  conversion_rate?: number | null;
  conversion_date?: string | null;
  rate_source?: "auto" | "manual" | null;
  ```

### Rust
**קובץ:** `src-tauri/src/models.rs`

✅ **מצב:** תקין  
- ה-struct `Transaction` כולל את כל השדות החדשים (שורות 32-40):
  ```rust
  pub original_amount: Option<f64>,
  pub original_currency: Option<String>,
  pub conversion_rate: Option<f64>,
  pub conversion_date: Option<String>,
  pub rate_source: Option<String>,
  ```
- ה-`from_row` implementation קורא את כל השדות (שורות 60-64)

---

## 5. בדיקת Backward Compatibility

### תנועות ישנות (ללא שדות conversion)

✅ **מצב:** נתמך  
- כל השדות החדשים הם `nullable` (Option<T> ב-Rust, `| null` ב-TypeScript)
- תנועות ישנות יקבלו `NULL` בשדות האלה
- הקוד לא מניח שהשדות קיימים - הוא בודק עם `if (original_amount)` או `Option::is_some()`

### דוגמאות בקוד:
- `TransactionForm.tsx` (שורה 213): בודק `if (!values.is_recurring && values.currency !== defaultCurrency && values.conversion_rate)`
- `OpeningBalanceModal.tsx` (שורה 137): מגדיר `original_amount: null` אם אין המרה

---

## 6. נקודות שדורשות תשומת לב

### ⚠️ 1. Validation ב-Import
**מיקום:** `dataManagement.service.ts`

**בעיה פוטנציאלית:** ה-validation ב-import (שורות 117-124, 362-375) בודק רק:
- `id`, `amount`, `date`, `type`

**המלצה:** זה בסדר כי השדות החדשים הם אופציונליים. אבל כדאי להוסיף validation שהשדות החדשים הם מהטיפוס הנכון אם הם קיימים.

### ⚠️ 2. Recurring Transaction Definition Currency
**מיקום:** `TransactionForm.tsx` (שורה 211)

**הערה:** הקוד לא ממיר מטבע עבור recurring definitions - זה נכון! ה-recurring definition שומרת את המטבע המקורי, וההמרה מתבצעת רק בעת יצירת התנועה.

### ✅ 3. Export/Import של Recurring Info
**מיקום:** `dataManagement.service.ts`

**מצב:** תקין - ה-recurring_info נשמר נכון ב-export ונקרא נכון ב-import, אבל הוא לא כולל את שדות ההמרה (זה נכון - ההמרה מתבצעת רק בעת יצירת התנועה).

---

## 7. המלצות לבדיקות נוספות

### בדיקות ידניות מומלצות:

1. **ייצוא/ייבוא Desktop:**
   - [ ] ייצא תנועות עם המרת מטבע
   - [ ] ייבא את אותו קובץ
   - [ ] וודא שכל שדות ההמרה נשמרו

2. **ייצוא/ייבוא Web:**
   - [ ] ייצא תנועות עם המרת מטבע
   - [ ] ייבא את אותו קובץ
   - [ ] וודא שכל שדות ההמרה נשמרו

3. **העברה בין פלטפורמות:**
   - [ ] ייצא מ-Desktop עם תנועות מומרות
   - [ ] ייבא ל-Web
   - [ ] וודא שהכל עובד

4. **Recurring Transactions:**
   - [ ] צור recurring transaction במטבע זר
   - [ ] המתן/הפעל את ה-processing
   - [ ] וודא שהתנועה נוצרה עם שדות ההמרה

5. **Backward Compatibility:**
   - [ ] ייבא קובץ ישן (ללא שדות conversion)
   - [ ] וודא שהכל עובד

---

## 8. סיכום

⚠️ **הערה חשובה:** זו בדיקה סטטית בלבד!

**מה נבדק ונמצא תקין:**
- ✅ השדות החדשים קיימים בטיפוסים (TypeScript ו-Rust)
- ✅ Export כולל את השדות החדשים בקוד
- ✅ Import מעביר את השדות החדשים
- ✅ `addTransaction` לא מוחקת את השדות החדשים
- ✅ Recurring transactions כוללות לוגיקת המרה
- ✅ Backward compatibility - השדות הם nullable

**מה לא נבדק:**
- ❌ הרצה בפועל של export/import
- ❌ בדיקה שהנתונים נשמרים ב-DB
- ❌ בדיקה שהנתונים נקראים מה-DB
- ❌ Edge cases (null, undefined, missing fields)

**המלצה:** יש לבצע בדיקות ידניות מקיפות לפני שימוש בפרודקשן!

---

## 9. הערות טכניות

### מבנה הנתונים:
- `amount` - תמיד במטבע הראשי (default currency)
- `original_amount` - הסכום המקורי במטבע הזר (אם היה)
- `original_currency` - המטבע המקורי
- `conversion_rate` - שער ההמרה
- `conversion_date` - תאריך ההמרה
- `rate_source` - 'auto' או 'manual'

### ארכיטקטורה:
- **Base Currency Architecture:** כל החישובים (tithe balance, charts) משתמשים ב-`amount` שהוא תמיד במטבע הראשי
- זה מבטיח שכל הקוד הקיים ממשיך לעבוד ללא שינויים
