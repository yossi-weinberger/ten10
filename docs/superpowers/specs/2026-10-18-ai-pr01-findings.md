# PR 1 — Foundation audit findings (2026-10-18)

> קלט ל־PR 1b, PR 1c ו־PR 2. כל הבדיקות כאן נעשו בקריאה בלבד: קטלוג (`pg_proc`, `pg_policies`, `information_schema`) ולוגים. לא נקראו שורות של משתמשים ולא ערכי סודות.
> ייצור: `flpzqbvbymoluoeeeofg`. testing: `bbcllewcotypedqsnwmi`.

## 1. Facts verified before this session

- **Edge Functions בייצור:** 11. `unsubscribe` פעילה עם `verify_jwt=false`, גרסה 62, לא נפרסה מאז ספטמבר 2025.
- **`SECURITY DEFINER` שמשתמש מחובר יכול להריץ:** 15, כולן עם `search_path` קשיח ובלי הרשאה ל־`anon` ול־`PUBLIC`.
- **`update_user_transaction`:** `SECURITY INVOKER`, רשימה סגורה של עמודות בלי `origin` (גוף מלא בסעיף 5).
- **`get_user_transactions`:** לחתימה עם 9 פרמטרים יש 8 ברירות מחדל, ולחתימות עם 12 ו־13 אין. קורא יחיד: `src/lib/tableTransactions/tableTransactionService.ts`, ששולח תמיד 13 שמות. `track_functions=none`.
- **testing:** 183 migrations כמו בייצור. ב־Vault יש `service_role_key` ו־`functions_base_url`.
- **Storage:** רק `contact-attachments` (פרטי, 5MB, PNG/JPEG/PDF/TXT/ZIP). אין bucket בשם `avatars`.

## 2. Deploy: single source of truth (task 1) — done

- נמחקו `supabase/scripts/deploy-functions.js` וסקריפט ה־npm `deploy-supabase`. הסקריפט פרס רק לייצור (guard על ה־ref ועל `main`), החזיק רשימה של 8 פונקציות מתוך 10, ולא היה בשימוש ב־CI. אין לו שימוש שאינו ייצור.
- מקור האמת: `.github/workflows/deploy-supabase-production.yml` → `supabase/scripts/deploy-changed-functions.sh` (`ALL_FUNCTIONS`, 10 פונקציות, כולל `--no-verify-jwt` ל־`process-email-request`).
- המחיקה לא מפעילה פריסה: ה־`paths` של ה־workflow כוללים רק את `deploy-changed-functions.sh`, לא את `deploy-functions.js` ולא את `package.json`.
- התיעוד עודכן: `supabase-edge-functions-maintenance.md`, `email-unsubscribe-system-guide.md`, `project-structure.md`. אזכורים היסטוריים ב־`docs/research/2026-09-18-hebrew-calendar-research.md` נשארו כמו שהם.
- `scripts/branch-guard.cjs` נשאר; `scripts/release.cjs` משתמש בו.

## 3. `SECURITY DEFINER` audit (task 3)

כל ה־15: `search_path` קשיח (`public`, ובפונקציה אחת `""`), `EXECUTE` ל־`authenticated` בלבד, אין `anon` ואין `PUBLIC`. אין SQL דינמי באף אחת מהן.

| Function | Auth check | Input handling | Verdict |
|---|---|---|---|
| `calculate_user_tithe_balance(uuid)`, `(uuid,date)` | `auth.uid()` מול `p_user_id` | static SQL | OK (נבדק קודם) |
| `get_user_categories(text)` | מסנן `auth.uid()` | static SQL | OK (נבדק קודם) |
| `get_earliest_system_date()` | admin | static SQL | OK (נבדק קודם) |
| `get_admin_dashboard_stats()` | `auth.uid()` לא null + `is_admin_user()` | ללא קלט | OK |
| `get_admin_dashboard_stats(integer)` | עוטפת את הגרסה בלי פרמטרים, שבודקת admin | הפרמטר מתעלם | OK. legacy, מועמדת לניקוי |
| `get_admin_monthly_trends(date,date)` | `auth.uid()` + `is_admin_user()` | תאריכים מוגבלים ל־2000..היום+2 שנים; `trunc_unit` נקבע בקוד, לא מהקלט | OK |
| `is_admin_user()` | `sub` מה־JWT → `auth.users.email` → `admin_emails` | ללא קלט | OK. `admin_emails` עם RLS: קריאה/הוספה/מחיקה רק ל־admin, אין policy ל־UPDATE |
| `get_user_payment_methods()` | מסנן `auth.uid()` | ללא קלט | OK |
| `get_category_breakdown(text,text,text)` | מסנן `auth.uid()` | `::date` cast; `p_type` דרך `CASE` סגור | OK |
| `get_daily_transaction_heatmap(text,text,text)` | מסנן `auth.uid()` | `::date` cast; `p_type_group` מושווה לקבועים | OK |
| `get_analytics_breakdowns(text,text)` | מסנן `auth.uid()` | `::date` cast | OK |
| `get_analytics_range_stats(text,text)` | מסנן `auth.uid()` | `::date` cast; `search_path=""` | OK |
| `handle_contact_form(...9 args)` | **אין** | מכניסה ל־`contact_messages`; `user_id` מקבל `auth.uid()` כברירת מחדל | **Low–Medium**, ראו 3.1 |
| `handle_contact_form(...13 args)` | **אין** | כנ"ל, ומקבלת גם `p_user_name`/`p_user_email` חופשיים | **Low–Medium**, ראו 3.1 |

### 3.1 `handle_contact_form`: ה־CAPTCHA נאכף רק בלקוח

- שתי החתימות כותבות `verified_captcha = true` תמיד. ההערה בגוף ("Captcha is verified in the Edge Function before calling this") לא נכונה: `contact.service.ts` קורא ל־`verify-captcha` ואז ל־RPC ישירות מהדפדפן. משתמש מחובר יכול לקרוא ל־RPC בלי CAPTCHA, וגם לקבוע `p_ip` ו־`p_user_email` כרצונו.
- כל INSERT ל־`contact_messages` מפעיל את ה־trigger `Trigger Contact Email`, שקורא ל־`send-contact-email` ושולח מייל. כלומר משתמש מחובר יכול לשלוח הרבה מיילים לתמיכה.
- זה לא חור גישה לנתונים: `user_id` נקבע מ־`auth.uid()`, ו־RLS מאפשר ממילא INSERT ישיר עם `user_id = auth.uid()` (עם `verified_captcha` שרירותי). אין חשיפה של נתוני משתמשים אחרים.
- **המלצה (PR נפרד):** לאמת CAPTCHA בצד שרת לפני ה־INSERT (Edge Function עם service role), או להוסיף rate limit; למחוק את החתימה הישנה עם 9 פרמטרים. לא תוקן כאן.

### 3.2 סוד בקטלוג: ה־trigger `Trigger Contact Email`

- ה־trigger (Database Webhook שנוצר בדשבורד, לא ב־migration) מחזיק בהגדרה שלו את ה־URL של הייצור ו־**JWT של `service_role` של הייצור** בתוך header. ה־JWT לא נמצא ב־repo ולא בהיסטוריית git (נבדק).
- **ב־testing ה־trigger קיים עם אותו URL של הייצור ואותו מפתח.** INSERT ל־`contact_messages` ב־testing יפעיל את `send-contact-email` של **הייצור** וישלח מייל אמיתי, וה־service role של הייצור נמצא בקטלוג של ענף ה־testing.
- **Medium (היגיינת סודות והפרדת סביבות), לא חור הרשאה למשתמש:** הקטלוג לא חשוף דרך PostgREST.
- **המלצה:** ב־testing להחליף את ה־webhook ל־URL ולמפתח של testing, או למחוק אותו שם; בייצור להעביר את ה־webhook לקריאה דרך Vault (כמו ה־crons). פעולה של המשתמש, ראו סעיף 8.

### 3.3 הערה קטנה ב־`update_user_transaction`

`array_length('{}'::text[], 1)` מחזיר `NULL`, לכן הבדיקה `= 0` לא נתפסת אף פעם. כשאין אף מפתח מותר, הפונקציה מעדכנת רק `updated_at` ומחזירה את השורה. לא בעיית אבטחה (`SECURITY INVOKER` + `user_id = $2` + RLS). לתקן ב־PR 2 אם נוגעים בה.

## 4. `get_user_transactions` (task 5)

### 4.1 Log evidence

- **שמירת לוגים בפועל:** הלוג המוקדם ביותר שנמצא הוא 2026-07-25 18:00 UTC, כלומר כ־85 ימים. חלון של 2026-07-19 ריק. כל שאילתה מוגבלת ל־24 שעות, לכן נדגמו ימים ולא כל הטווח.
- **ימים שנדגמו:** 17–18/10, 04/10, 19/08, 25/07. בכל הקריאות: `POST` עם `200`, `supabase-js` (`runtime=web`), ואורך גוף של 299 בייטים (פעמיים 300). אין `GET`, אין 300 (PGRST203, חתימה עמומה) ואין 404 (PGRST202).
- גוף הבקשה לא נשמר בלוג. אבל JSON של 13 המפתחות שהקוד שולח, עם מסננים ריקים, `p_limit=20` ומיון `date desc`, הוא בדיוק 299 בייטים; עם 9 מפתחות הוא 193. 300 בייטים מתאים לאותו payload עם ערך ספרתי אחד ארוך יותר (`p_limit`/`p_offset`).
- **מסקנה:** כל הקריאות בדגימה מגיעות מהקורא היחיד בקוד, עם 13 פרמטרים. אין סימן לקורא חיצוני שמשתמש ב־9 או ב־12 פרמטרים. עם זאת, הדגימה חלקית, ו־desktop לא קורא ל־RPC.

### 4.2 Full definitions (for PR 1c rollback)

כל שלוש החתימות `SECURITY INVOKER`, `search_path=public`, `EXECUTE` ל־`authenticated` בלבד.

#### `get_user_transactions(uuid,integer,integer,date,date,text[],text,text,text)` — 9 args, 8 defaults

```sql
CREATE OR REPLACE FUNCTION public.get_user_transactions(p_user_id uuid, p_offset integer DEFAULT 0, p_limit integer DEFAULT 20, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date, p_types text[] DEFAULT NULL::text[], p_search text DEFAULT NULL::text, p_sort_field text DEFAULT 'created_at'::text, p_sort_direction text DEFAULT 'desc'::text)
 RETURNS TABLE(transactions jsonb, total_count integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_total_count integer;
BEGIN
    -- First, get the total count based on the filters
    SELECT COUNT(*)
    INTO v_total_count
    FROM transactions t
    WHERE t.user_id = p_user_id
      AND (p_date_from IS NULL OR t.date >= p_date_from)
      AND (p_date_to IS NULL OR t.date <= p_date_to)
      AND (p_types IS NULL OR t.type = ANY(p_types))
      AND (p_search IS NULL OR
           (t.description ILIKE '%' || p_search || '%' OR
            t.category ILIKE '%' || p_search || '%' OR
            t.recipient ILIKE '%' || p_search || '%'));

    -- Then, get the paginated and joined data
    RETURN QUERY
    SELECT
      jsonb_agg(t_data) as transactions,
      v_total_count as total_count
    FROM (
      SELECT
        t.*,
        CASE
          WHEN rt.id IS NOT NULL THEN
            jsonb_build_object(
              'id', rt.id,
              'frequency', rt.frequency,
              'status', rt.status,
              'execution_count', rt.execution_count,
              'total_occurrences', rt.total_occurrences,
              'day_of_month', rt.day_of_month
            )
          ELSE
            NULL
        END as recurring_info
      FROM transactions t
      LEFT JOIN recurring_transactions rt ON t.source_recurring_id = rt.id
      WHERE t.user_id = p_user_id
        AND (p_date_from IS NULL OR t.date >= p_date_from)
        AND (p_date_to IS NULL OR t.date <= p_date_to)
        AND (p_types IS NULL OR t.type = ANY(p_types))
        AND (p_search IS NULL OR
             (t.description ILIKE '%' || p_search || '%' OR
              t.category ILIKE '%' || p_search || '%' OR
              t.recipient ILIKE '%' || p_search || '%'))
      ORDER BY
        CASE WHEN p_sort_field = 'date' AND p_sort_direction = 'asc' THEN t.date END ASC,
        CASE WHEN p_sort_field = 'date' AND p_sort_direction = 'desc' THEN t.date END DESC,
        CASE WHEN p_sort_field = 'amount' AND p_sort_direction = 'asc' THEN t.amount END ASC,
        CASE WHEN p_sort_field = 'amount' AND p_sort_direction = 'desc' THEN t.amount END DESC,
        CASE WHEN p_sort_field = 'type' AND p_sort_direction = 'asc' THEN t.type END ASC,
        CASE WHEN p_sort_field = 'type' AND p_sort_direction = 'desc' THEN t.type END DESC,
        CASE WHEN p_sort_field = 'description' AND p_sort_direction = 'asc' THEN t.description END ASC,
        CASE WHEN p_sort_field = 'description' AND p_sort_direction = 'desc' THEN t.description END DESC,
        CASE WHEN p_sort_field = 'category' AND p_sort_direction = 'asc' THEN t.category END ASC,
        CASE WHEN p_sort_field = 'category' AND p_sort_direction = 'desc' THEN t.category END DESC,
        CASE WHEN p_sort_field = 'created_at' AND p_sort_direction = 'asc' THEN t.created_at END ASC,
        CASE WHEN p_sort_field = 'created_at' AND p_sort_direction = 'desc' THEN t.created_at END DESC,
        -- Add a stable tie-breaker to ensure consistent ordering
        t.id ASC
      LIMIT p_limit
      OFFSET p_offset
    ) as t_data;
END;
$function$
```

#### `get_user_transactions(uuid,integer,integer,text,text,text[],text,text,text,boolean,text[],text[])` — 12 args, no defaults

```sql
CREATE OR REPLACE FUNCTION public.get_user_transactions(p_user_id uuid, p_offset integer, p_limit integer, p_date_from text, p_date_to text, p_types text[], p_search text, p_sort_field text, p_sort_direction text, p_is_recurring boolean, p_recurring_statuses text[], p_recurring_frequencies text[])
 RETURNS TABLE(transactions jsonb, total_count bigint)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT *
  FROM get_user_transactions(
    p_user_id,
    p_offset,
    p_limit,
    p_date_from,
    p_date_to,
    p_types,
    p_search,
    p_sort_field,
    p_sort_direction,
    p_is_recurring,
    p_recurring_statuses,
    p_recurring_frequencies,
    NULL::TEXT[]
  );
END;
$function$
```

#### `get_user_transactions(uuid,integer,integer,text,text,text[],text,text,text,boolean,text[],text[],text[])` — 13 args, no defaults (the one in use)

```sql
CREATE OR REPLACE FUNCTION public.get_user_transactions(p_user_id uuid, p_offset integer, p_limit integer, p_date_from text, p_date_to text, p_types text[], p_search text, p_sort_field text, p_sort_direction text, p_is_recurring boolean, p_recurring_statuses text[], p_recurring_frequencies text[], p_payment_methods text[])
 RETURNS TABLE(transactions jsonb, total_count bigint)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  sort_field TEXT;
  sort_direction TEXT;
  sql TEXT;
BEGIN
  -- Use unqualified column names (aliases not in scope in paged CTE)
  sort_field := CASE p_sort_field
    WHEN 'date' THEN 'date'
    WHEN 'amount' THEN 'amount'
    WHEN 'description' THEN 'description'
    WHEN 'currency' THEN 'currency'
    WHEN 'type' THEN 'type'
    WHEN 'category' THEN 'category'
    WHEN 'recipient' THEN 'recipient'
    WHEN 'payment_method' THEN 'payment_method'
    WHEN 'is_chomesh' THEN 'is_chomesh'
    WHEN 'created_at' THEN 'created_at'
    WHEN 'updated_at' THEN 'updated_at'
    ELSE 'created_at'
  END;

  sort_direction := CASE WHEN lower(p_sort_direction) = 'asc' THEN 'ASC' ELSE 'DESC' END;

  sql := format($f$
    WITH filtered AS (
      SELECT
        t.*,
        rt.status AS recurring_status,
        rt.frequency AS recurring_frequency,
        rt.execution_count AS recurring_execution_count,
        rt.total_occurrences AS recurring_total_occurrences,
        rt.day_of_month AS recurring_day_of_month_def,
        rt.start_date AS recurring_start_date,
        rt.next_due_date AS recurring_next_due_date
      FROM transactions t
      LEFT JOIN recurring_transactions rt ON t.source_recurring_id = rt.id
      WHERE t.user_id = $1
        AND ($2 IS NULL OR t.date >= NULLIF($2, '')::date)
        AND ($3 IS NULL OR t.date <= NULLIF($3, '')::date)
        AND ($4 IS NULL OR t.type = ANY($4))
        AND (
          $5 IS NULL OR $5 = '' OR
          t.description ILIKE '%%' || $5 || '%%' OR
          t.category ILIKE '%%' || $5 || '%%' OR
          t.recipient ILIKE '%%' || $5 || '%%' OR
          t.payment_method ILIKE '%%' || $5 || '%%'
        )
        AND ($9 IS NULL OR t.payment_method = ANY($9))
        AND (
          $6 IS NULL OR
          ($6 = true AND t.source_recurring_id IS NOT NULL) OR
          ($6 = false AND t.source_recurring_id IS NULL)
        )
        AND ($7 IS NULL OR rt.status = ANY($7))
        AND ($8 IS NULL OR rt.frequency = ANY($8))
    ),
    counted AS (
      SELECT COUNT(*)::BIGINT AS total_count FROM filtered
    ),
    paged AS (
      SELECT * FROM filtered
      ORDER BY %s %s
      OFFSET $10 LIMIT $11
    )
    SELECT
      COALESCE(
        jsonb_agg(
          (to_jsonb(p) -
            'recurring_status' -
            'recurring_frequency' -
            'recurring_execution_count' -
            'recurring_total_occurrences' -
            'recurring_day_of_month_def' -
            'recurring_start_date' -
            'recurring_next_due_date'
          ) ||
          jsonb_build_object(
            'recurring_info',
            CASE
              WHEN p.recurring_status IS NULL THEN NULL
              ELSE jsonb_build_object(
                'status', p.recurring_status,
                'frequency', p.recurring_frequency,
                'execution_count', p.recurring_execution_count,
                'total_occurrences', p.recurring_total_occurrences,
                'day_of_month', p.recurring_day_of_month_def,
                'start_date', p.recurring_start_date,
                'next_due_date', p.recurring_next_due_date
              )
            END
          )
        ),
        '[]'::jsonb
      ) AS transactions,
      (SELECT total_count FROM counted) AS total_count
    FROM paged p;
  $f$, sort_field, sort_direction);

  RETURN QUERY EXECUTE sql
    USING p_user_id, p_date_from, p_date_to, p_types, p_search, p_is_recurring, p_recurring_statuses, p_recurring_frequencies, p_payment_methods, p_offset, p_limit;
END;
$function$
```

הערה: הגרסה עם 13 משתמשת ב־SQL דינמי, אבל רק `sort_field` ו־`sort_direction` נכנסים ל־`format`, ושניהם נבחרים מרשימה סגורה. כל השאר עובר ב־`USING`.

## 5. `update_user_transaction` (task 4, closed)

`SECURITY INVOKER`, `search_path=public`, `EXECUTE` ל־`authenticated` בלבד. `origin` לא ברשימה.

```sql
CREATE OR REPLACE FUNCTION public.update_user_transaction(p_transaction_id uuid, p_user_id uuid, p_updates jsonb)
 RETURNS SETOF transactions
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  update_query TEXT;
  allowed_columns TEXT[] := ARRAY[
    'date', 'amount', 'currency', 'description', 'type',
    'category', 'is_chomesh', 'recipient', 'payment_method', 'recurring_total_count',
    'original_amount', 'original_currency', 'conversion_rate', 'conversion_date', 'rate_source'
  ];
  key TEXT;
  value JSONB;
  formatted_value TEXT;
  set_clauses TEXT[] := ARRAY[]::TEXT[];
  updated_row transactions%ROWTYPE;
BEGIN
  FOR key IN SELECT jsonb_object_keys(p_updates) LOOP
    IF key = ANY(allowed_columns) THEN
      value := p_updates -> key;
      IF value IS NULL OR value = 'null'::jsonb THEN
        formatted_value := 'NULL';
      ELSE
        formatted_value := format('%L', value #>> '{}');
      END IF;
      set_clauses := array_append(set_clauses, format('%I = %s', key, formatted_value));
    END IF;
  END LOOP;

  IF array_length(set_clauses, 1) = 0 THEN
    RAISE EXCEPTION 'No valid fields provided for update.';
  END IF;

  set_clauses := array_append(set_clauses, format('%I = %L', 'updated_at', now()));

  update_query := 'UPDATE public.transactions SET ' || array_to_string(set_clauses, ', ') ||
                  ' WHERE id = $1 AND user_id = $2 RETURNING *;';

  EXECUTE update_query
  INTO updated_row
  USING p_transaction_id, p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction ID % not found for user ID % or no valid fields to update.', p_transaction_id, p_user_id;
  END IF;

  RETURN NEXT updated_row;
END;
$function$
```

## 6. `unsubscribe` Edge Function (task 2) — pending user decision

**עובדות:**
- בייצור: `unsubscribe`, `ACTIVE`, גרסה 62, `verify_jwt=false`. נוצרה ב־2025-09-15 15:49 UTC ועודכנה לאחרונה ב־2025-09-15 16:21 UTC. הקוד לא נמצא ב־repo ואף פעם לא היה בו (אין היסטוריית git ל־`supabase/functions/unsubscribe`). ניסיון לקרוא את המקור דרך MCP (`get_edge_function`) נכשל בשגיאה פנימית.
- ב־repo אין קישור ל־`/functions/v1/unsubscribe`. ה־commit הראשון שהוסיף קישורי ביטול למיילים (`bd32280d`, 2025-09-15 16:35 UTC, אחרי העדכון האחרון של הפונקציה) כבר הצביע על `https://ten10-app.com/unsubscribe`. רק מסמך מ־2025-09-18 תיאר את `${SUPABASE_URL}/functions/v1/unsubscribe` כ־URL.
- **לוגים:** אין קריאה ל־`/functions/v1/unsubscribe` (וגם לא ל־`verify-unsubscribe-token`) בימים שנדגמו: 17–18/10, 10/10, 04/10, 01/10, 20/09, 02/09, 19/08, 03/08, 25/07. השמירה בפועל כ־85 ימים, וכל שאילתה מוגבלת ל־24 שעות, כך שזו דגימה ולא כיסוי מלא.

**המלצה:** להסיר. היא רצה בלי אימות JWT בשער, הקוד שלה לא ידוע ולא נבדק, ואין ראיה שמייל כלשהו מקשר אליה. לפני ההסרה: לבדוק בדשבורד (Edge Functions → `unsubscribe` → Invocations) את 90 הימים האחרונים. אם יש 0 הפעלות, למחוק מהדשבורד. אם יש הפעלות, להוריד את הקוד מהדשבורד ל־repo ולבחון אותו. **ההחלטה של המשתמש; לא נמחק דבר ב־PR הזה.**

## 7. Testing environment (task 6, partial)

- **Vercel Preview מצביע על הייצור, לא על testing.** ב־bundle של deployment ה־Preview האחרון שנבדק (`ten10-5nvri07ho…`, ענף `cursor/rtl-calendar-chevrons-77b5`) ה־`VITE_SUPABASE_URL` המוטמע הוא `https://flpzqbvbymoluoeeeofg.supabase.co`, וה־ref של testing לא מופיע בכלל. MCP של Vercel החזיר 403 על רשימת משתני הסביבה, לכן הבדיקה נעשתה על ה־bundle (ה־URL ציבורי בכל מקרה). נבדק deployment אחד; override לפי ענף לא נבדק.
- **crons ב־testing:** ארבעתם `active=false` (`monitor-cron-failures`, `daily-recurring-executor`, `send-reminder-emails`, `send-new-user-email-daily`).
- **trigger של `contact_messages` ב־testing** קורא לייצור (סעיף 3.2).
- אינטגרציית GitHub של Supabase: לא ניתנת לבדיקה מכאן. פעולת משתמש.

## 8. User actions (only the user can do these)

1. **Vault של testing:** להחליף **גם** את `service_role_key` **וגם** את `functions_base_url` לערכי testing. בלי זה, cron שיודלק ב־testing יקרא לפונקציות של הייצור.
2. **Vercel Preview:** להגדיר `VITE_SUPABASE_URL` ו־`VITE_SUPABASE_ANON_KEY` (וכל משתנה Supabase אחר) ל־Preview כך שיצביעו על `bbcllewcotypedqsnwmi`. היום Preview מדבר עם הייצור.
3. **webhook של `contact_messages` ב־testing:** להחליף ל־URL ולמפתח של testing, או למחוק אותו ב־testing. בייצור: לשקול העברה של ה־header ל־Vault במקום JWT קבוע בהגדרת ה־trigger.
4. **אינטגרציית GitHub של Supabase:** לוודא בדשבורד שהיא פעילה ומריצה migrations של PRs חדשים על ענף ה־testing. התיעוד משייך אותה ל־`feat/hebrew-calendar-foundation`.
5. **`unsubscribe`:** להחליט לפי סעיף 6 (לבדוק 90 ימי הפעלות בדשבורד, ואז למחוק או לשחזר ל־repo).
6. **משתמשי ניסוי:** לרשום ב־`ai-progress.md` את ה־`user_id` של משתמשי הניסוי ב־testing.
7. **`handle_contact_form`:** לאשר פתיחת PR נפרד לאימות CAPTCHA בצד שרת (סעיף 3.1).
