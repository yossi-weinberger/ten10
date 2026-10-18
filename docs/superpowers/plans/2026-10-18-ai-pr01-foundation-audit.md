# PR 1 — יישור קו ובדיקות לפני Ten10 AI

> **לסוכן:** משימה אחת לסשן. קודם תוכנית, אחר כך ביצוע. בסוף: לעדכן `ai-progress.md`. הכללים ב־`.cursor/rules/ai-multichannel/RULE.md`.

**מטרה:** לסדר תשתית ולאסוף מידע לפני שמשנים משהו. ה־PR הזה לא משנה התנהגות של המוצר. התוצרים הם תיקון בסקריפטי הפריסה, מסמך ממצאים, וקלט ל־PR 1c ול־PR 1b.

**סעיפים במסמך:** §3.2, §3.5, §22, §22.1, ושורת שלב 0 בטבלה של §23.

**ענף:** `feat/ai-pr01-foundation-audit`

## אילוצים

- אין migrations שמשנות התנהגות. מותרת migration שמתעדת הגדרה קיימת בלי לשנות אותה.
- אין שינוי בפונקציות שעובדות היום, חוץ מסקריפט הפריסה.
- ענף ה־testing (`bbcllewcotypedqsnwmi`) מכיל נתוני ייצור. רק קריאות; בלי כתיבה לשורות של משתמשים אמיתיים.
- הממצאים נכתבים לקובץ `docs/superpowers/specs/2026-10-18-ai-pr01-findings.md`.

## משימות

### משימה 1: מקור אמת אחד לפריסה (§3.2)
- [ ] `deploy-changed-functions.sh` הוא הסקריפט ש־CI מריץ (10 פונקציות ב־`ALL_FUNCTIONS`). `supabase/scripts/deploy-functions.js` (הסקריפט `npm run deploy-supabase`) מחזיק רשימה נפרדת של 8 פונקציות, והיא כבר לא מסונכרנת.
- [ ] להחליט ולבצע אחד מהשניים: למחוק את `deploy-functions.js` ואת סקריפט ה־npm, או להפוך אותו לעטיפה של `deploy-changed-functions.sh`. לעדכן את התיעוד ב־`llm-instructions/backend/supabase-edge-functions-maintenance.md`.

### משימה 2: הפונקציה `unsubscribe` שבייצור ואינה ב־repo (§3.2)
- [ ] לבדוק בדשבורד של Supabase את ההפעלות שלה ב־90 הימים האחרונים, ואם מיילים ישנים מקשרים אליה. הקישור הנוכחי במיילים הוא `https://ten10-app.com/unsubscribe` (route באתר), שקורא ל־`verify-unsubscribe-token`.
- [ ] לכתוב החלטה בממצאים: לשחזר את הקוד ל־repo, או להסיר אחרי תקופה מוגדרת. **לא מוחקים ב־PR הזה.**

### משימה 3: audit של `SECURITY DEFINER` (§3.5)
- [ ] להפיק רשימה של הפונקציות `SECURITY DEFINER` ש־`authenticated` יכול להריץ, עם `pg_proc` ו־`has_function_privilege` על testing.
- [ ] לכל אחת: האם היא בודקת בעלות, האם `search_path` קשיח, מה ה־grants, ואיך היא מטפלת בקלט. טבלה בממצאים.
- [ ] ממצא אמיתי מתוקן ב־PR נפרד וממוקד, לא כאן.

### משימה 4: השדות ש־`update_user_transaction` מעדכן (§6.1)
- [ ] הגוף של `update_user_transaction(uuid, uuid, jsonb)` לא נמצא ב־repo. לשלוף אותו עם `pg_get_functiondef` מ־testing ולשמור בממצאים.
- [ ] לוודא שהוא מעדכן רק רשימה סגורה של עמודות, כך שעמודה עתידית `origin` לא תתעדכן דרכו.

### משימה 5: מיפוי `get_user_transactions`, קלט ל־PR 1c (§6.1)
- [ ] לפי `20260715090000_harden_user_transaction_rpcs.sql` יש שלוש חתימות: 9, 12 ו־13 פרמטרים.
- [ ] `src/lib/tableTransactions/tableTransactionService.ts` שולח 13 פרמטרים בשמם, ולכן נראה שהוא קורא לחתימה עם 13. לאמת את זה.
- [ ] לבדוק אם יש קריאות לחתימות האחרות. ב־API logs של Supabase, 30 יום, `rpc/get_user_transactions` לפי סט הפרמטרים. אם `track_functions` מופעל, אפשר גם `pg_stat_user_functions`.
- [ ] לשמור את ההגדרות המלאות של שלוש החתימות (`pg_get_functiondef`) בממצאים. הן ישמשו את ה־rollback של PR 1c.

### משימה 6: סביבת ה־testing (§3.2, §22, §22.1)
- [ ] לוודא שאינטגרציית GitHub של Supabase עדיין מריצה migrations של PRs חדשים על ענף ה־testing. התיעוד משייך אותו ל־`feat/hebrew-calendar-foundation`. לעדכן את `supabase-database-migrations-workflow.md` לפי המצב בפועל.
- [ ] Vault של testing: להחליף את `service_role_key` במפתח של testing. ה־crons העסקיים נשארים כבויים.
- [ ] לוודא שמשתני הסביבה של Vercel Preview מצביעים על testing.
- [ ] לרשום ב־`ai-progress.md` את ה־`user_id` של משתמשי הניסוי. אלה מזהים, לא סודות.

### משימה 7 (אופציונלי): Storage כקוד (§3.5)
- [ ] migration שמתעדת את ההגדרות הקיימות של ה־buckets `contact-attachments` ו־`avatars` (פרטי/ציבורי, גודל, MIME) עם `on conflict do nothing`, בלי לשנות אותן. אם יש ספק, דוחים לסוף ה־PR או מוותרים.

## מתי זה "גמור"

- יש מקור אמת אחד לפריסה, והתיעוד מעודכן.
- קובץ הממצאים כולל: החלטה על `unsubscribe`, טבלת `SECURITY DEFINER`, את הגוף של `update_user_transaction`, ואת מיפוי `get_user_transactions` עם ההגדרות המלאות.
- אין ממצא הרשאה קריטי פתוח, או שנפתח לו PR נפרד.
- testing בטוח: אינטגרציה מאומתת, Vault של testing, crons כבויים, ומשתמשי ניסוי רשומים.
- `npm run typecheck`, `npm run lint:ratchet`, `npm test` ו־`npm run check-supabase-imports` עוברים.

## מחוץ ל־PR הזה

מחיקת חשבון (PR 1b), ניקוי החתימות (PR 1c), כל קוד AI, ו־`Permissions-Policy` (שלב 5).
