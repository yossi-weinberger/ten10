# מדריך: מה נשאר עד המיזוג ל־`main` ועד ההשקה

*(נכתב 2026-11-03 בסוף הסקירה החוזרת. למי שממשיך: Cursor, Claude או יוסי.)*

## 0. איפה אנחנו

- `feat/ai-intake` מכיל עכשיו:
  - [#656](https://github.com/yossi-weinberger/ten10/pull/656): תיקוני הסקירה (שמירה כפולה, מרוצים במגירה, הקלטה, lazy drawer, מגבלות עלות, חישובים).
  - [#657](https://github.com/yossi-weinberger/ten10/pull/657): כל ה־AI במיגרציה אחת, `supabase/migrations/20261103100000_ai_intake.sql`, ו־rollback מלא אחד, `supabase/migrations/rollback/20261103100000_ai_intake_down.sql`.
- **מה הוכח:** על עותק מקומי של סכמת `public` של פרודקשן (551 בדיקות זהות לפרודקשן), 46 הקבצים הישנים והקובץ המאוחד נותנים תוצאה זהה. ה־rollback מחזיר בדיוק לפרודקשן של היום.
- **testing (`bbcllewcotypedqsnwmi`) יושר:**
  - ההיסטוריה ב־`schema_migrations` זהה לקבצים.
  - `ai.is_trial_user` נמחקה.
  - `followed_up` היתום בוטל.
  - גיבוי 47 השורות הישנות שמור אצל Claude ב־scratchpad.
- **מה עוד לא נבדק:**
  1. התיקונים של #656 לא נבדקו באפליקציה, ופונקציות ה־Edge ב־testing עדיין בגרסה שלפני #656.
  2. ~~הקובץ המאוחד לא רץ על Postgres מאוחסן, רק מקומית.~~ נבדק ב־2026-11-09 בענף staging משוכפל מפרודקשן. ראו "תוצאות החזרה" בסוף שלב ב.
- **מתג הניסוי** הוא עכשיו רק `AI_TRIAL_ONLY` ב־Edge (`supabase/functions/_shared/ai/trial-users.ts`). ב־SQL אין רשימה. שבעת משתמשי הניסוי קיימים בפרודקשן.

## 1. כללי ברזל

1. **לא לגעת ב־`main`.** PR ל־`main` ומיזוג אליו הם רק של יוסי (שלב ד). כל PR אחר הולך ל־`feat/ai-intake`.
2. **לא להדליק AI בפרודקשן** לפני שלב ה. במיזוג כל המתגים כבויים.
3. **לא לשלוח מיילים ממשתמשים משוכפלים.** בכל סביבה ששוכפלה מפרודקשן מכבים מיד את ה־cron ואת ה־webhook (שלב ב).
4. **סודות:** את ערכי הסודות רואים רק כ־hash. את `VERCEL_AI_GATEWAY_API_KEY` מגדיר יוסי. לא מעתיקים מפתחות AWS/SES לסביבה זמנית, וכך היא גם לא יכולה לשלוח מיילים.
5. **רשת:** מהמחשב של יוסי בעבודה הפורטים של Postgres ל־Supabase (5432, 6543 וחיבור ישיר) חסומים, ולכן `supabase db push` ו־`supabase db dump` נכשלים שם. מה שעובד הוא `supabase db query --remote=<ref>` (HTTPS) ו־`supabase functions deploy`. מרשת אחרת או מ־GitHub Actions אפשר להריץ `db push` רגיל.
6. **ריצות מודל עולות כסף.** לפי כללי הסקירה: כל ריצה מודדת את האפליקציה עצמה, שתי ריצות לכל סט, מספרים כנים מתוך קובצי התוצאה, בלי רשימות מילים.

## 2. שלב א: פריסה ל־testing ו־QA באפליקציה

**למה:** #656 שינה זרימות שמירה, את המגירה ואת ה־Edge, ואת כל זה עוד לא ראו באפליקציה. testing כבר מחובר ל־Vercel Preview, ו־CORS שם מתיר Preview, אז ה־QA המלא נעשה כאן.

**איך:**

1. לפרוס את פונקציות ה־AI ל־testing מתוך `origin/feat/ai-intake`. CLI 3.0 משתמש ב־`--remote=`; בגרסה 2.x זה `--project-ref`.
   ```bash
   for fn in ai-classify-intent ai-split-items ai-read-question ai-read-receipt ai-receipt-url ai-rank-duplicates ai-transcribe-speech ai-purge-receipts get-ai-admin-spend; do npx supabase functions deploy $fn --remote=bbcllewcotypedqsnwmi; done
   ```
   - `ai-read-question`, `ai-read-receipt` ו־`ai-split-items` צריכים את ה־import map. הוא כבר מוגדר ב־`supabase/config.toml`; אם `zod` לא נארז, להוסיף `--import-map supabase/functions/deno.json`.
   - `cors.ts` השתנה, ולכן כדאי לפרוס ל־testing גם את הפונקציות שאינן AI.
   - The text quota fix ([#668](https://github.com/yossi-weinberger/ten10/pull/668): classification, splitting and question reading for one message are counted once, and helper calls stop when the monthly quota is exhausted) changed `ai.consume_usage`, `ai.consume_call`, `ai.release_usage` and `ai.usage_events` within the consolidated migration. On testing, where the old migration has already run, run the SQL in the PR description **first**, then deploy `ai-classify-intent`, `ai-split-items` and `ai-read-question`. In the reverse order, every text message will return "unavailable".
2. **Vercel Preview:** לוודא ש־`VITE_AI_INTAKE_ENABLED=true` מוגדר ב־**Preview**. זה ה־kill switch של גל 6, וברירת המחדל שלו כבוי. בלעדיו המגירה לא תופיע. לא להגדיר אותו ב־Production.
3. לפתוח את ה־Preview של `feat/ai-intake` ולהתחבר כמשתמש ניסוי.

**QA (לכל בדיקה: מה עושים ומה אמור לקרות):**

| # | מה עושים | מה אמור לקרות |
|---|---|---|
| 1 | «קניתי קפה ב־12 ש״ח», שומרים | נשמר פעם אחת, מופיע בטבלה עם סימון AI |
| 2 | שומרים ומיד מקלידים הודעה חדשה | בזמן השמירה תיבת הכתיבה חסומה ("שומר…"), ו"שיחה חדשה" כבוי |
| 3 | שומרים, ביטול, ושוב שמירה | השמירה השנייה מצליחה בלחיצה הראשונה |
| 4 | משנים סכום בכרטיס ומיד לוחצים "שמור" | "שמור" ממתין לבדיקת הכפילויות, ואם יש כפילות מופיעה אזהרה |
| 5 | «שכר דירה 4000 ב־1 לחודש עד סוף השנה, החודש כבר שילמתי», "גם החודש: כן" | שני חיובים (1/11 ו־1/12), ובטבלת הוראות הקבע `total_occurrences = 2` |
| 6 | לוח עברי בהגדרות, «100 לבית הכנסת כל חודש» בלי יום | היום שבכרטיס הוא היום שנשמר |
| 7 | «כמה תרמתי בממוצע לחודש השנה?» | מחולק בכ־10 חודשים, לא ב־12 |
| 8 | «12,50» כתשובה לשאלת סכום | 12.5 |
| 9 | העלאת קבלה (תמונה) | כרטיס עם סכום, "צפה בקבלה" פותח את הקובץ הנכון גם מההיסטוריה |
| 10 | הקלטה קולית, סגירת המגירה, פתיחה, הקלטה נוספת | גם ההקלטה השנייה מתומללת |
| 11 | כרטיס רב בהיסטוריה (שאלה הלכתית אישית ואז הודעה חדשה) | בכרטיס שבהיסטוריה אין כפתור שליחה |
| 12 | לחיצה על קישור בתשובה ("פתח טופס") | המגירה נסגרת והשיחה נשמרת |
| 13 | גלילה בטבלת התנועות לעמוד 3, מעבר ללשונית אחרת וחזרה | הטבלה לא חוזרת לעמוד 1 |
| 14 | משתמש שאינו משתמש ניסוי | אין כפתור עוזר, אין קריאות AI ברשת |

כל כשל נרשם עם צעדים לשחזור, PR מתקן ל־`feat/ai-intake`, ושוב QA של אותה שורה.

## 3. שלב ב: חזרה גנרלית ב־staging זמני

**למה:** זו ההוכחה היחידה שחסרה: שהקובץ המאוחד רץ על Supabase מאוחסן, בהרשאות של Supabase, ושה־rollback עובד שם. אין סיכון לפרודקשן. עלות: ענף micro, בערך דולר לכמה ימים. מוחקים בסוף.

**איך:**

1. **יצירה.** בלי `--git-branch`, כדי שה־GitHub integration לא יפרוס אליו אוטומטית.
   ```bash
   npx supabase branches create ai-staging --with-data --remote=flpzqbvbymoluoeeeofg
   npx supabase branches list --remote=flpzqbvbymoluoeeeofg
   ```
   לרשום את ה־`project_ref` של הענף (להלן `<STG>`).

2. **נטרול מיידי** (לפני 00:00, 07:00, 18:00 או 19:00 UTC). כל פקודה היא `npx supabase db query --remote=<STG> --yes "<SQL>"`:
   ```sql
   -- כל ה-cron כבוי
   SELECT cron.alter_job(jobid, active := false) FROM cron.job;
   -- לבדוק לאן ה-vault מצביע (כתובת בלבד, בלי המפתח)
   SELECT name, left(decrypted_secret, 45) FROM vault.decrypted_secrets WHERE name = 'functions_base_url';
   -- בשכפול של 2026-11-09 הוא הצביע לפרודקשן, וב-vault יושב גם service_role_key של פרודקשן. להפנות לענף עצמו:
   SELECT vault.update_secret(id, 'https://<STG>.supabase.co') FROM vault.secrets WHERE name = 'functions_base_url';
   -- ה-webhook של טופס יצירת הקשר
   DROP TRIGGER IF EXISTS "Trigger Contact Email" ON public.contact_messages;
   -- אופציונלי: מיילים בדויים לכל מי שאינו משתמש ניסוי
   UPDATE auth.users SET email = 'user_' || id || '@example.test'
   WHERE id NOT IN ('01665dce-d261-4a9b-b89d-04ce2460859b','45e3efc0-171b-48ce-9f15-4468394dfaeb','a0a4fdd4-49bf-48a0-a3b0-4c76d60597e4','5403d7d1-3f44-4243-a84a-f905c4aad30c','f336e5d1-4dc2-40c6-b176-c0b199ee836d','a3f81dec-f634-4784-9cc0-9921838a6037','c4e7d297-9ed3-421a-af9c-92ccccf95ba0');
   ```
   אם `functions_base_url` מצביע לפרודקשן, ה־cron נשאר כבוי עד המחיקה.

3. **לוודא שהענף זהה לפרודקשן לפני המיגרציה:**
   ```sql
   SELECT count(*), max(version) FROM supabase_migrations.schema_migrations; -- 184, 20261019195400
   SELECT count(*) FROM pg_namespace WHERE nspname = 'ai';                   -- 0
   ```

4. **הרצת המיגרציה**, כמו ש־`db push` יעשה (קובץ אחד, טרנזקציה אחת):
   ```bash
   (echo "BEGIN;"; cat supabase/migrations/20261103100000_ai_intake.sql; echo; echo "SELECT cron.alter_job(jobid, active := false) FROM cron.job WHERE jobname LIKE 'ai-%';"; echo "COMMIT;") > /tmp/ai_intake_tx.sql
   npx supabase db query --remote=<STG> --yes -f /tmp/ai_intake_tx.sql
   npx supabase db query --remote=<STG> --yes "INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('20261103100000', 'ai_intake')"
   ```
   ואז לבדוק:
   ```sql
   SELECT count(*) FROM pg_proc WHERE pronamespace = 'ai'::regnamespace;        -- 25
   SELECT jobname FROM cron.job WHERE jobname LIKE 'ai-%' ORDER BY 1;           -- 3 jobs
   SELECT id, public FROM storage.buckets WHERE id = 'intake-artifacts';        -- false
   SELECT to_regprocedure('ai.is_trial_user(uuid)');                            -- NULL
   SELECT pronargs FROM pg_proc WHERE proname = 'get_user_transactions' AND pronamespace = 'public'::regnamespace ORDER BY 1; -- 9, 12, 14
   ```
   - ה־cron החדש של ה־AI נוצר כשהוא פעיל. בגלל זה הפקודה למעלה מכבה אותו באותה טרנזקציה, כך שהוא לא רץ אפילו רגע.
   - ל־`get_user_transactions` יש גם גרסאות ישנות עם 9 ועם 12 ארגומנטים, שקיימות גם בפרודקשן וגם ב־testing. בגללן `::regproc` נכשל ב־"more than one function", ולכן בודקים לפי מספר הארגומנטים.

5. **פריסת כל 19 הפונקציות**, כמו `supabase/scripts/deploy-changed-functions.sh`. `--no-verify-jwt` רק ל־`process-email-request`. כך בודקים גם את ה־redeploy של הפונקציות הקיימות.
   ```bash
   npx supabase secrets set --remote=<STG> AI_INTAKE_ENABLED=true
   ```
   `VERCEL_AI_GATEWAY_API_KEY` מגדיר יוסי. `AI_TRIAL_ONLY` לא מגדירים (ניסוי בלבד).

6. **בדיקת עשן בלי UI:**
   - קריאה ל־`ai-classify-intent` עם JWT של משתמש ניסוי מחזירה כוונה.
   - בלי JWT מחזירה 401.
   - משתמש שאינו בניסוי מקבל `intent: null`.
   - ⚠️ **QA של ה־UI על staging לא עובד כמו שהוא.** PostHog לא נטען ב־localhost, ולכן המגירה לא מופיעה בהרצה מקומית. ו־CORS ב־staging לא מתיר Vercel Preview, כי `cors.ts` מתיר Preview רק לפרויקט testing. ה־QA המלא נעשה בשלב א על testing. אם רוצים UI גם על staging: לשנות **מקומית ובלי קומיט** את `isTestingProject` ב־`supabase/functions/_shared/cors.ts` כך שיכלול גם את `<STG>`, לפרוס, ולעשות `vercel deploy` עם build env שמצביע ל־staging.

7. **rollback ו־re-apply:**
   ```bash
   (echo "BEGIN;"; cat supabase/migrations/rollback/20261103100000_ai_intake_down.sql; echo; echo "COMMIT;") > /tmp/ai_down_tx.sql
   npx supabase db query --remote=<STG> --yes -f /tmp/ai_down_tx.sql
   npx supabase db query --remote=<STG> --yes "DELETE FROM supabase_migrations.schema_migrations WHERE version = '20261103100000'"
   ```
   ה־bucket נמחק אחרי ה־SQL דרך ה־Storage API (מפתח service role), כי Supabase חוסם כל מחיקה ב־SQL מטבלאות storage:
   ```bash
   curl -X POST   "https://<STG>.supabase.co/storage/v1/bucket/intake-artifacts/empty" -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE"
   curl -X DELETE "https://<STG>.supabase.co/storage/v1/bucket/intake-artifacts"       -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE"
   ```
   ואז לבדוק:
   - אין `ai`.
   - `get_user_transactions` חזרה ל־9, 12 ו־13 ארגומנטים.
   - דף התנועות עובד: `SELECT public.get_user_transactions(<uuid של משתמש ניסוי>, 0, 5, NULL, NULL, NULL, NULL, 'date', 'desc', NULL, NULL, NULL, NULL);`
   - אין bucket בשם `intake-artifacts`.

   אחר כך להריץ שוב את שלב 4 (המיגרציה עולה גם אחרי rollback).

8. **מחיקה:** `npx supabase branches delete ai-staging --remote=flpzqbvbymoluoeeeofg`

9. **דו"ח קצר:** מה עבר, מה נכשל, כמה זמן הענף חי, והמלצת go/no-go.

### תוצאות החזרה (2026-11-09, `feat/ai-intake` ‏ff990143)

ענף `ai-staging` (micro, משוכפל מפרודקשן עם נתונים: 666 משתמשים, 20,298 תנועות) חי בערך שעה ונמחק.

- **נטרול:** 4 crons כובו. `functions_base_url` הצביע לפרודקשן והופנה לענף. ה־webhook "Trigger Contact Email" הוסר. 659 מיילים של מי שאינם משתמשי ניסוי הוחלפו בכתובות `@example.test`. בענף לא היו סודות SES או AI, חוץ ממפתח ה־Gateway שיוסי הגדיר.
- **מיגרציה:** עברה בטרנזקציה אחת, ב־7 שניות. כל הבדיקות של שלב 4 עברו.
- **פריסה:** כל 19 הפונקציות. בעשר הפונקציות שאינן AI, הגדרת ה־JWT זהה לפרודקשן.
- **עשן:** משתמש ניסוי קיבל `add_transaction` ו־`ask_data` מקריאה אמיתית למודל. משתמש רגיל קיבל `null`. בלי JWT או עם anon התקבל 401.
- **rollback:** בפעם הראשונה **נכשל**: `DELETE FROM storage.buckets` נחסם (42501), וכל ה־rollback בוטל. תוקן בקובץ ה־rollback, שמוחק עכשיו את ה־bucket דרך ה־Storage API. אחרי זה הענף חזר בדיוק לפרודקשן: 184 מיגרציות, בלי `ai`, בלי עמודות `origin`.
- **הרצה חוזרת:** המיגרציה עלתה שוב, ובדיקת העשן עברה שוב.
- **שום דבר ישן לא נשבר:** 27 קריאות שהאפליקציה של `main` עושה (RPC וקריאות REST, כולל מסכי האדמין) רצו כאותו משתמש באותם נתונים, לפני המיגרציה ואחריה.
  - 21 החזירו תוצאה זהה לגמרי.
  - `get_user_transactions`: אותן 338 תנועות, באותו סדר ובאותם ערכים. התווספו שני שדות, `origin` ו־`receipt_expires_at`.
  - `get_admin_dashboard_stats`: התווספו `ai_transactions` ו־`ai_users`.
  - הכתיבות של הטופס הישן עברו: הוספה, עדכון, עדכון מרובה, מחיקה ומחיקה מרובה של תנועות; הוספה, עדכון ומחיקה של הוראת קבע; וטופס יצירת קשר.
  - `process-recurring-transactions` חייב הוראת קבע שהגיע מועדה, יצר תנועה עם `origin` ריק וקידם את התאריך.
- **קוד Edge ישן:** עשר הפונקציות שאינן AI זהות ל־`main`. השתנו רק `_shared/cors.ts` (אותם origins, Preview רק ב־testing) והוספת `zod` ל־import map.
- **המלצה:** go ל־`main`, עם קובץ ה־rollback המתוקן.

## 4. שלב ג: לפני ה־PR ל־`main` (יוסי)

- [ ] שלב א ושלב ב עברו.
- [ ] אישור הניסוח החדש בפרטיות ובתנאים: סעיף על קבלות שנשמרות עד 30 יום (`privacy.json` ‏`dataRetention.item4`, ‏`terms.json` ‏`dataAndPrivacy.item6`). עולה לכולם גם כשה־AI כבוי.
- [ ] חותמת המיגרציה עדיין אחרי המיגרציה האחרונה ב־`main` (היום `20261019195400`). אם נכנסה ל־`main` מיגרציה חדשה יותר, לשנות את השם של `20261103100000_ai_intake.sql` ושל ה־rollback לחותמת מאוחרת יותר. אם היא נגעה ב־`get_admin_dashboard_stats`, למזג את השינוי לקובץ ולהריץ שוב את בדיקת ההשוואה.
- [ ] בפרודקשן **לא** מוגדרים `AI_INTAKE_ENABLED`, ‏`VERCEL_AI_GATEWAY_API_KEY` ו־`VITE_AI_INTAKE_ENABLED` (ב־Vercel Production), והדגל `ai_intake_web` ב־PostHog כבוי.
- [ ] החלטות על שינויים שעולים לכולם:
  - ה־X של תפריט המובייל עובר צד בעברית (`sheet.tsx`, ‏`end-4`).
  - שער ידני מעוגל ל־4 ספרות.
  - `microphone=(self)` ב־`vercel.json`.
  - "צור קשר" עובר לתפריט הצד אצל כל משתמשי הווב, והכפתור הצף נשאר רק לעוזר. מי שאין לו AI לא רואה כפתור צף. באפליקציית הדסקטופ הכפתור הצף של יצירת הקשר נשאר.
- [ ] לא לבנות AAB חדש ל־Play מ־`main` עד ההשקה: `twa-manifest.json` מוסיף share target ו־`minSdk` 24.
- [ ] Supabase Preview מדולג ב־PRs האלה, ולכן הוא לא יתפוס בעיית מיגרציה. שלב ב הוא שמכסה את זה.

## 5. שלב ד: המיזוג ל־`main` (יוסי)

- **מתי:** בשעה רחוקה מה־cron, לא ב־00:00, 07:00, 18:00 או 19:00 UTC.
- **מה קורה אוטומטית** (`.github/workflows/deploy-supabase-production.yml`):
  1. `supabase db push` מריץ את `20261103100000_ai_intake.sql`.
  2. בגלל ש־`config.toml` השתנה, כל 19 הפונקציות נפרסות מחדש, כולל `process-recurring-transactions` ו־`send-reminder-emails`. פונקציות ה־AI נפרסות אבל עונות `unavailable`, כי `AI_INTAKE_ENABLED` לא מוגדר.
  3. Vercel פורס את האתר. המגירה לא נטענת בכלל, כי `VITE_AI_INTAKE_ENABLED` לא מוגדר.
- **בדיקות מיד אחרי** (קריאה בלבד, `db query --remote=flpzqbvbymoluoeeeofg --read-only`):
  ```sql
  SELECT max(version) FROM supabase_migrations.schema_migrations;     -- 20261103100000
  SELECT count(*) FROM pg_namespace WHERE nspname = 'ai';             -- 1
  SELECT jobname, active FROM cron.job ORDER BY 1;                    -- הישנים + 3 ai-*
  ```
  - באפליקציה: דף התנועות נטען, הוספת תנועה רגילה עובדת, טופס יצירת קשר נשלח.
  - ב־GitHub: שני ה־jobs ב־workflow ירוקים.
- **אם משהו נשבר** (רק יוסי, כתיבה לפרודקשן):
  1. Vercel: Instant Rollback לפריסה הקודמת.
  2. DB: להריץ את `rollback/20261103100000_ai_intake_down.sql` בטרנזקציה ואז `DELETE FROM supabase_migrations.schema_migrations WHERE version = '20261103100000'`. ה־rollback מוחק את כל נתוני ה־AI; תנועות שנשמרו נשארות. אחריו לרוקן ולמחוק את ה־bucket ‏`intake-artifacts` דרך ה־Storage API או ה־Dashboard, כמו בשלב ב, סעיף 7.
  3. Edge: `git revert` לקומיט המיזוג ב־`main`. ה־workflow יפרוס שוב את הגרסאות הקודמות.

## 6. שלב ה: הדלקה הדרגתית בפרודקשן

הסדר חשוב. כל שלב מוסיף שכבה אחת:

1. **שרת, ניסוי בלבד:** סוד בפרודקשן: `VERCEL_AI_GATEWAY_API_KEY`, ואז `AI_INTAKE_ENABLED=true`. הקוד קורא רק את שני אלה ואת `AI_TRIAL_ONLY` (בנוסף ל־`SUPABASE_*` המובנים). `AI_TRIAL_ONLY` נשאר לא מוגדר, כלומר רק שבעת משתמשי הניסוי.
2. **לקוח:** `VITE_AI_INTAKE_ENABLED=true` ב־Vercel Production, ופריסה מחדש (זה משתנה build).
3. **PostHog:** `ai_intake_web` רק לשבעת משתמשי הניסוי.
4. **QA בפרודקשן** של משתמשי הניסוי (הטבלה בשלב א, בקיצור). לעקוב אחרי העלות בלשונית ה־AI באדמין.
5. **פתיחה רחבה**, רק אחרי שלב ו: `AI_TRIAL_ONLY=false` ב־Edge (מתג אחד), ואז אחוזים ב־PostHog.

**כיבוי חירום:**
- הדגל ב־PostHog: מיידי, ה־UI נעלם.
- `AI_INTAKE_ENABLED`: מיידי, השרת מפסיק לקרוא למודלים.
- `VITE_AI_INTAKE_ENABLED` הוא **לא** מתג חירום, כי הוא דורש build.

**share target** (שיתוף מאנדרואיד) הוא שלב נפרד: `VITE_AI_SHARE_TARGET=true` ב־Production ו־AAB חדש עם `minSdk` 24.

## 7. שלב ו: לפני פתיחה לכל המשתמשים

| נושא | מצב היום | מה צריך |
|---|---|---|
| דיוק שיחה (C7) | `turn_correct` ‏82–83%, ‏`dead_end` ‏3 | יעד התוכנית: ≥90% ו־0. שתי ריצות על סט השיחות (≈$0.12 לריצה) |
| קבלות | שינויי prompt ו־thinking כבוי, נבדקו רק על `rcpt-he-31` | שתי ריצות על 80 הקבלות (≈$0.6 לריצה) |
| פיצול וחריצים | סט ה־264, חריצים, holdout, שמות ותקופות לא הורצו אחרי גלים 2–3 | שתי ריצות לכל סט |
| עלות וקצב | מגבלות אורך ומכסה תוקנו ב־#656, לא נבדקו בעומס | לעקוב שבוע בניסוי; לבדוק את המכסה (300 ביום, 30 בדקה) |
| פרטיות | ספקי ה־AI לא מפורטים במדיניות | להוסיף לפני ההשקה |
| ידועים ופתוחים | `conv-026`, תקופות חגים, `followed_up` לא נבנה, latency | החלטת מוצר |

## 8. נספח: מה תוקן בסקירה ומה נשאר במכוון

**תוקן ב־#656:**
- **שמירה:**
  - תשובה שנאבדה כבר לא מביאה לשמירה כפולה (כרטיס בודד, רשימה, הוראת קבע).
  - שמירה מאוחרת לא נוחתת על תור חדש.
  - הכרטיס נעול בזמן שמירה.
  - "שמור" ממתין לבדיקת הכפילויות.
  - ביטול ואז שמירה עובד בלחיצה הראשונה.
  - פעולה אחת בכל פעם בזוגות כפולים.
- **חישוב:**
  - יום עברי בהוראת קבע.
  - ממוצע חודשי (כולל "כל הזמן" מהתנועה הראשונה).
  - "עד סוף השנה" יחד עם "גם החודש".
  - «12,50».
  - `conversion_date`.
- **UI:**
  - הקלטה אחרי סגירה ופתיחה.
  - lazy drawer (134KB gzip פחות לכולם).
  - הדגל נקרא מחדש כש־PostHog נטען.
  - שיתוף ממתין לא נמחק.
  - כרטיסי היסטוריה לקריאה בלבד.
  - קישור סוגר את המגירה.
  - חזרה ללשונית לא מאפסת את הטבלה.
- **שרת:**
  - מגבלות אורך.
  - מכסת קבלה לא מוחזרת אחרי חיוב.
  - PDF עד כ־3MB.
  - CORS ל־Preview רק ב־testing.
  - נמחק נתיב release מת.
  - קבלה שמורה נפתחת גם כשה־AI כבוי.
  - timeout לדוח העלויות.

**נשאר במכוון או להחלטה:**
- `releaseAs` ב־`assistant-turn.ts` הוא שדה שכבר לא בשימוש.
- `deno check` מדווח על שגיאות טיפוס ישנות ב־`ai-split-items/index.ts` (‏`userData.user`, ‏`lists.context`). הן לא חוסמות פריסה.
- ב־testing שתי פונקציות תזכורת שאינן AI שונות מפרודקשן בעיצוב בלבד, וה־webhook מצביע לכתובת של testing.
- `npm run typecheck` ו־`lint:ratchet` מדווחים על `resizable.tsx` כשמריצים מתוך worktree. זו תופעה של נתיב ה־`node_modules`, לא שגיאה.

**שיטת הבדיקה של המיגרציה** (אם צריך לחזור עליה, למשל אחרי שינוי ב־`get_admin_dashboard_stats`):
1. לבנות את סכמת `public` של פרודקשן משאילתות קטלוג קריאה־בלבד ב־HTTPS: טבלאות, עמודות, constraints, indexes, `pg_get_functiondef`, policies, triggers, grants מתוך `aclexplode`.
2. לטעון אותה ל־`supabase/postgres:17.6.1.178` מקומי כמשתמש `postgres`. צריך גם את `pg_cron`, את `pg_net`, את `storage.buckets` ו־stub ל־`supabase_functions.http_request`.
3. A = פרודקשן. B = A + קבצי ה־AI. C = A + הקובץ המאוחד.
4. להשוות `pg_dump --schema-only -n public -n ai` לפי רשומות, כש־grants נחשבים כקבוצה ולא לפי סדר, יחד עם `cron.job` ו־`storage.buckets`. ואז לבדוק ש־C + rollback = A.

הסקריפטים אצל Claude ב־scratchpad (`mig/`), ומחוץ לריפו.
