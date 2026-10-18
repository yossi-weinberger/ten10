# PR 1c — ניקוי החתימות של `get_user_transactions`

> **לסוכן:** משימה אחת לסשן. קודם תוכנית. בסוף: לעדכן `ai-progress.md`. הכללים ב־`.cursor/rules/ai-multichannel/RULE.md`.

**מטרה:** להשאיר לפונקציה חתימה קנונית אחת, בלי לשנות את מה שהטבלה מקבלת היום. זה תנאי ל־PR 4, שמוסיף לה `p_origin`. בלי הניקוי, PostgREST עלול לא לדעת לאיזו גרסה לפנות.

**סעיפים במסמך:** §6.1 ("שינוי ב־`get_user_transactions`"), §24.1 (שורת 1c), §26.

**תלות:** PR 1 (משימה 5: מיפוי החתימות והקריאות). PR עם migration, אז רק הוא מול testing באותו זמן.

**ענף:** `feat/ai-pr01c-get-user-transactions-cleanup`

## מה ידוע

שלוש חתימות, לפי `supabase/migrations/20260715090000_harden_user_transaction_rpcs.sql`:
1. `(uuid, integer, integer, date, date, text[], text, text, text)`: 9 פרמטרים.
2. `(uuid, integer, integer, text, text, text[], text, text, text, boolean, text[], text[])`: 12 פרמטרים.
3. `(uuid, integer, integer, text, text, text[], text, text, text, boolean, text[], text[], text[])`: 13 פרמטרים.

`tableTransactionService.ts` שולח בשמם 13 פרמטרים:
- `p_user_id`, `p_offset`, `p_limit`, `p_date_from`, `p_date_to`, `p_types`, `p_search`
- `p_payment_methods`, `p_sort_field`, `p_sort_direction`
- `p_is_recurring`, `p_recurring_statuses`, `p_recurring_frequencies`

השערה: רק החתימה השלישית בשימוש. PR 1 מאמת את זה.

## משימות

### משימה 1: אימות
- [ ] לקרוא את הממצאים של PR 1 (משימה 5). אם נמצאו קריאות לחתימה 1 או 2, לעצור ולהחליט על wrapper במקום מחיקה.

### משימה 2: migration
- [ ] `supabase/migrations/<timestamp>_drop_dead_get_user_transactions_overloads.sql`
- [ ] `DROP FUNCTION IF EXISTS public.get_user_transactions(<types>)` לכל חתימה מתה, עם הטיפוסים המדויקים.
- [ ] לא לגעת בחתימה הקנונית. לוודא שה־grants שלה (`authenticated`, revoke מ־`anon`/PUBLIC) לא השתנו.
- [ ] בדיקה בסוף ה־migration: נשארה בדיוק חתימה אחת. `RAISE EXCEPTION` אם לא, כמו בדפוס של `20260715090000`.

### משימה 3: rollback
- [ ] `supabase/migrations/rollback/<timestamp>_drop_dead_get_user_transactions_overloads_down.sql`, שמחזיר את החתימות שנמחקו מההגדרות ששמרנו ב־PR 1 (`pg_get_functiondef`), כולל ה־grants.

### משימה 4: בדיקות
- [ ] על testing, עם משתמש ניסוי: הטבלה נטענת, הסינונים (סוג, אמצעי תשלום, הוראות קבע, חיפוש) והמיון עובדים, והתוצאה זהה לפני ואחרי.
- [ ] `select count(*) from pg_proc where proname = 'get_user_transactions'` מחזיר 1.

## מתי זה "גמור"

- נשארה חתימה קנונית אחת, או wrapper מתועד אם נמצא צרכן.
- טבלת התנועות עובדת בלי שינוי.
- קובץ rollback קיים.
- `npm run typecheck`, `npm run lint:ratchet` ו־`npm test` עוברים.

## מחוץ ל־PR הזה

הוספת `origin` ו־`p_origin` (PR 4), ושום שינוי בקוד ה־frontend.
