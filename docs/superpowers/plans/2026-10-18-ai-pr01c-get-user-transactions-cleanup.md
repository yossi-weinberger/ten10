# PR 1c — ניקוי החתימות של `get_user_transactions`

> **לסוכן:** משימה אחת לסשן. קודם תוכנית. בסוף: לעדכן `ai-progress.md`. הכללים ב־`.cursor/rules/ai-multichannel/RULE.md`.

**מטרה:** להשאיר לפונקציה חתימה קנונית אחת, בלי לשנות את מה שהטבלה מקבלת היום.

**עדיפות:** ניקיון רצוי, **לא חסם** ל־PR 4. לפי ה־DB החי (18/10/2026), לחתימות עם 12 ו־13 פרמטרים אין ברירות מחדל. drop+create של החתימה עם 13 לחתימה עם `p_origin` לא יוצר עמימות, כי קריאה עם 13 שמות לא מתאימה לחתימה עם 12. אפשר לבצע את ה־PR הזה לבד, או כ־migration ראשונה בתוך PR 4.

**סעיפים במסמך:** §6.1 ("שינוי ב־`get_user_transactions`"), §24.1 (שורת 1c), §26.

**תלות:** PR 1 (משימה 5: מיפוי החתימות והקריאות). PR עם migration, אז רק הוא מול testing באותו זמן.

**השפעה על הייצור:** ה־migration רצה בייצור במיזוג. החתימות שנמחקות אינן נקראות לפי הקוד הנוכחי. טאב פתוח עם bundle ישן מאוד עלול לשלוח סט פרמטרים אחר, ולכן בודקים את ה־API logs לפני המחיקה.

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

ב־DB החי: לחתימה 1 יש 8 ברירות מחדל (כל הפרמטרים חוץ מ־`p_user_id`), ולחתימות 2 ו־3 אין. כולן `SECURITY INVOKER`, `search_path=public`, EXECUTE ל־`authenticated` בלבד.

`tableTransactionService.ts` הוא הקורא היחיד בקוד ושולח תמיד 13 שמות, כך שהוא מגיע רק לחתימה 3. `pg_stat_user_functions` לא זמין (`track_functions=none`); השלמה מ־API logs של הייצור ב־PR 1.

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
