# PR 1 — יישור קו ובדיקות לפני Ten10 AI

> **לסוכן:** משימה אחת לסשן. קודם תוכנית, אחר כך ביצוע. בסוף: לעדכן `ai-progress.md`. הכללים ב־`.cursor/rules/ai-multichannel/RULE.md`.

**מטרה:** לסדר תשתית ולאסוף מידע לפני שמשנים משהו. ה־PR הזה לא משנה התנהגות של המוצר. התוצרים הם תיקון בסקריפטי הפריסה, מסמך ממצאים, וקלט ל־PR 1c ול־PR 1b.

**סעיפים במסמך:** §3.2, §3.5, §22, §22.1, ושורת שלב 0 בטבלה של §23, ונספח ו׳.

**השפעה על הייצור:** אפסית. `deploy-functions.js` אינו בשימוש ב־CI, ושאר המשימות הן מסמכים, קריאות ו־testing.

**ענף:** `feat/ai-pr01-foundation-audit`

## אילוצים

- אין migrations שמשנות התנהגות. מותרת migration שמתעדת הגדרה קיימת בלי לשנות אותה.
- אין שינוי בפונקציות שעובדות היום, חוץ מסקריפט הפריסה.
- ענף ה־testing (`bbcllewcotypedqsnwmi`) מכיל נתוני ייצור. רק קריאות; בלי כתיבה לשורות של משתמשים אמיתיים.
- הממצאים נכתבים לקובץ `docs/superpowers/specs/2026-10-18-ai-pr01-findings.md`.

## מה כבר נבדק (18/10/2026, קריאות קטלוג בלבד)

להעתיק לקובץ הממצאים ולהשלים משם:
- **פונקציות בייצור:** 11. `unsubscribe` פעילה עם `verify_jwt=false`, גרסה 62, לא נפרסה מאז ספטמבר 2025.
- **`SECURITY DEFINER` שמשתמש מחובר יכול להריץ:** 15, כולן עם `search_path` קשיח ובלי הרשאה ל־`anon`. נבדקו `calculate_user_tithe_balance` (שתי החתימות, בודקות `auth.uid()` מול `p_user_id`), `get_user_categories` (מסנן לפי `auth.uid()`) ו־`get_earliest_system_date` (בודקת admin). נשארו לבדיקה: `get_admin_dashboard_stats` (שתיים), `get_admin_monthly_trends`, `handle_contact_form` (שתיים), `is_admin_user`, `get_user_payment_methods`, `get_category_breakdown`, `get_daily_transaction_heatmap`, `get_analytics_breakdowns`, `get_analytics_range_stats`.
- **`update_user_transaction`:** הגוף נמצא ב־repo (`20260122_update_transaction_rpc_currency_fields.sql`), `SECURITY INVOKER`, רשימה סגורה של עמודות בלי `origin`. משימה 4 סגורה.
- **`get_user_transactions`:** לחתימה עם 9 פרמטרים יש 8 ברירות מחדל, ולחתימות עם 12 ו־13 אין. קורא יחיד: `tableTransactionService.ts`, ששולח תמיד 13 שמות. `track_functions=none`.
- **testing:** 183 migrations כמו בייצור, ארבעת ה־crons כבויים. ב־Vault יש `service_role_key` ו־`functions_base_url`.
- **Storage:** רק `contact-attachments` (פרטי, 5MB, PNG/JPEG/PDF/TXT/ZIP). אין bucket בשם `avatars`.

## משימות

### משימה 1: מקור אמת אחד לפריסה (§3.2)
- [ ] `deploy-changed-functions.sh` הוא הסקריפט ש־CI מריץ (10 פונקציות ב־`ALL_FUNCTIONS`). `supabase/scripts/deploy-functions.js` (הסקריפט `npm run deploy-supabase`) מחזיק רשימה נפרדת של 8 פונקציות, והיא כבר לא מסונכרנת.
- [ ] להחליט ולבצע אחד מהשניים: למחוק את `deploy-functions.js` ואת סקריפט ה־npm, או להפוך אותו לעטיפה של `deploy-changed-functions.sh`. לעדכן את התיעוד ב־`llm-instructions/backend/supabase-edge-functions-maintenance.md`.

### משימה 2: הפונקציה `unsubscribe` שבייצור ואינה ב־repo (§3.2)
- [ ] לבדוק בדשבורד של Supabase את ההפעלות שלה ב־90 הימים האחרונים, ואם מיילים ישנים מקשרים אליה. הקישור הנוכחי במיילים הוא `https://ten10-app.com/unsubscribe` (route באתר), שקורא ל־`verify-unsubscribe-token`.
- [ ] לכתוב החלטה בממצאים: לשחזר את הקוד ל־repo, או להסיר אחרי תקופה מוגדרת. **לא מוחקים ב־PR הזה.**

### משימה 3: audit של `SECURITY DEFINER` (§3.5)
- [x] רשימת 15 הפונקציות (ראו "מה כבר נבדק").
- [ ] להשלים את 11 הפונקציות שנשארו: האם בודקות בעלות או admin, ואיך מטפלות בקלט. טבלה בממצאים.
- [ ] ממצא אמיתי מתוקן ב־PR נפרד וממוקד, לא כאן.

### משימה 4: השדות ש־`update_user_transaction` מעדכן (§6.1)
- [x] סגורה. רשימה סגורה בלי `origin`, `SECURITY INVOKER`. לשמור את הגוף בממצאים.

### משימה 5: מיפוי `get_user_transactions`, קלט ל־PR 1c (§6.1)
- [x] שלוש חתימות, ברירות המחדל שלהן, וקורא יחיד בקוד ששולח 13 שמות.
- [ ] `pg_stat_user_functions` לא זמין (`track_functions=none`). לבדוק ב־API logs של **הייצור** קריאות ל־`rpc/get_user_transactions` עם סט פרמטרים אחר, בטווח שה־plan שומר בפועל (לוודא את הטווח). אם אין לוגים מספיקים, הקוד הוא הראיה.
- [ ] לשמור את ההגדרות המלאות של שלוש החתימות (`pg_get_functiondef`) בממצאים. הן ישמשו את ה־rollback של PR 1c.

### משימה 6: סביבת ה־testing (§3.2, §22, §22.1)
- [ ] לוודא שאינטגרציית GitHub של Supabase עדיין מריצה migrations של PRs חדשים על ענף ה־testing. התיעוד משייך אותו ל־`feat/hebrew-calendar-foundation`. לעדכן את `supabase-database-migrations-workflow.md` לפי המצב בפועל.
- [ ] Vault של testing: להחליף **גם** את `service_role_key` **וגם** את `functions_base_url` בערכי testing. בלי `functions_base_url`, cron של testing יקרא לפונקציות של הייצור. ה־crons העסקיים נשארים כבויים.
- [ ] לוודא שמשתני הסביבה של Vercel Preview מצביעים על testing.
- [ ] לרשום ב־`ai-progress.md` את ה־`user_id` של משתמשי הניסוי. אלה מזהים, לא סודות.

### משימה 7 (אופציונלי): Storage כקוד (§3.5)
- [ ] migration שמתעדת את ההגדרות הקיימות של ה־bucket `contact-attachments` (פרטי, 5MB, MIME) עם `on conflict do nothing`, בלי לשנות אותן. אין bucket בשם `avatars`. אם יש ספק, דוחים לסוף ה־PR או מוותרים.

## מתי זה "גמור"

- יש מקור אמת אחד לפריסה, והתיעוד מעודכן.
- קובץ הממצאים כולל: החלטה על `unsubscribe`, טבלת `SECURITY DEFINER`, את הגוף של `update_user_transaction`, ואת מיפוי `get_user_transactions` עם ההגדרות המלאות.
- אין ממצא הרשאה קריטי פתוח, או שנפתח לו PR נפרד.
- testing בטוח: אינטגרציה מאומתת, Vault של testing, crons כבויים, ומשתמשי ניסוי רשומים.
- `npm run typecheck`, `npm run lint:ratchet`, `npm test` ו־`npm run check-supabase-imports` עוברים.

## מחוץ ל־PR הזה

מחיקת חשבון (PR 1b), ניקוי החתימות (PR 1c), כל קוד AI, ו־`Permissions-Policy` (שלב 5).
