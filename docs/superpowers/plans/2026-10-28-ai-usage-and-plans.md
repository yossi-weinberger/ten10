# מדידה, מכסות, ובהמשך תשלום

תוכנית. אושרה ב־28/10/2026, עם ההחלטות בסעיף «החלטות».

היום אין גבול לשימוש. כל משתמש ברשימת הניסוי יכול לשלוח קבלות בלי סוף, והעלות ידועה רק בסיכום של השער ליום ולמודל. לפני פתיחה למשתמשים אמיתיים צריך שתי שכבות: מדידה לכל קריאה, ומונה שעוצר. מסלולים ותשלום באים רק אחרי החלטה על תמחור.

## מה קיים

- **שש פונקציות קוראות למודל, כולן דרך `ai-gateway.vercel.sh`:**

  | פונקציה | קריאה לספק | מודל | `feature` |
  |---|---|---|---|
  | `ai-classify-intent` | `index.ts:45` | `typesafe-ai/jev` | `intent` |
  | `ai-read-question` | `index.ts:77` | `typesafe-ai/jev` | `question_slots` |
  | `ai-rank-duplicates` | `index.ts:119` | `typesafe-ai/jev` | `duplicates` |
  | `ai-shadow-type` | `index.ts:105` | `typesafe-ai/jev` | `shadow` |
  | `ai-read-receipt` | `index.ts:141` | `anthropic/claude-sonnet-5` | `receipt` |
  | `ai-transcribe-speech` | `index.ts:51` | `microsoft/mai-transcribe-2` | `speech` |

  `ai-receipt-url` ו־`ai-purge-receipts` לא קוראות למודל.
- **תיוג:** `_shared/ai/gateway-tags.ts`. `source:app` או `source:eval`, ו־`feature`. המשתמש נשלח כ־hash עם `AI_GATEWAY_USER_SALT` ב־`providerOptions.gateway.user`, לא כ־`user:<id>` כמו שכתוב ב־`2026-10-23-ai-admin.md`.
- **אף פונקציה לא קוראת טוקנים או עלות מהתשובה.** טוקנים ועלות קיימים היום רק בדוח של השער (`get-ai-admin-spend/report.ts:32-33`), מסוכמים לפי יום, מודל ותג.
- **סדר הבדיקות בכל אחת מהשש:**
  - `isAiIntakeEnabled()`.
  - JWT ו־`getUser`.
  - `isTrialUser`, מיד לפני ה־`fetch`. השורות: classify 35, question 53, duplicates 71, shadow 41, receipt 119, speech 38.

  שם נכנס המונה.
- **כשל ספק מוחזר ללקוח כ־200 עם `reason: "unavailable"`.**
  - בקבלה ובקול הוא מוצג כ־`aiIntake.providerFailed` (`AssistantDrawer.tsx:372,409`).
  - בכוונה, הלקוח נופל ל־parser המקומי בלי הודעה (`assistant-shown-intent.ts:27-29`).
- **דפוס המונה:** `public.increment_download_count(p_email)`. ההגדרה לא נמצאת ב־migrations, רק ההרשאות ב־`20260717120000`. נקראה מ־testing: `INSERT … ON CONFLICT (email) DO UPDATE`, עם איפוס כשהתאריך התחלף, ו־`RETURNING count`. רק `service_role`.
  - כדאי להוסיף את ההגדרה ל־migrations בהזדמנות, בנפרד מהתוכנית הזו.
  - `process-email-request` אוכף 5 ביום, והמדריך אומר 3.

## שכבה 1: מדידה

### `ai.model_calls`

שורה לכל קריאה לספק, גם בכשל. בלי טקסט, בלי תמונה, בלי סכום ובלי נתיב.

| עמודה | תוכן |
|---|---|
| `id` | uuid |
| `user_id` | המשתמש. כאן ה־id האמיתי, כי הטבלה פנימית. `REFERENCES auth.users (id) ON DELETE CASCADE` |
| `operation` | אחד מערכי `GatewayFeature` |
| `model` | מחרוזת המודל שנשלחה |
| `ok` | האם התקבלה תשובה שנקראה |
| `http_status` | הסטטוס מהשער, או `null` כשלא הגיעה תשובה |
| `error_code` | `timeout`, `network`, `http_4xx`, `http_5xx`, `unreadable`, או `null` |
| `latency_ms` | מתחילת ה־`fetch` עד סוף קריאת הגוף |
| `input_tokens`, `output_tokens` | מהתשובה, אם יש. אחרת `null` |
| `cost_usd` | מהתשובה, אם השער מחזיר. אחרת `null` |
| `usage_id` | הקישור לצריכה בשכבה 2, או `null` |
| `created_at` | |

- **הרשאות:** RLS בלי גישה ל־`authenticated`, כמו `ai.intake_events`. נכתבת רק דרך `ai.record_model_call(...)` עם `service_role`.
- **שמירה:** 13 חודשים. job יומי ב־`pg_cron` מוחק שורות ישנות יותר, באותה migration.
- **מחיקת חשבון:** `ON DELETE CASCADE` מ־`auth.users` מוחק את השורות עם המשתמש. בדיקה על testing בתוך טרנזקציה שמתבטלת: משתמש זמני, שורה, מחיקה, ואפס שורות.
- **עזר משותף:** `_shared/ai/model-call.ts`. עוטף את ה־`fetch`, מודד זמן, קורא שימוש לפי סוג ה־endpoint, וכותב את השורה ב־`finally`.
  - כשל בכתיבה נרשם ב־`logger.error` ולא מכשיל את הבקשה של המשתמש.
  - שש הפונקציות עוברות אליו. שום דבר אחר בהן לא משתנה.
- **צעד ראשון, לפני הטבלה:** קריאה אחת על testing לכל אחד משלושת ה־endpoints (`/typesafe/v1/systemone`, `/v1/responses`, `/v4/ai/transcription-model`), כדי לראות אילו שדות שימוש ועלות חוזרים בפועל. התוצאה נרשמת ביומן, והעזר קורא רק שדות שנצפו.
  - endpoint שלא מחזיר שימוש נשאר עם `null`.
  - העלות שלו מגיעה מהשוואה לדוח של השער לפי יום ומודל.
- **סקריפטי המדידה** (`intent-eval-run.ts`, `question-slot-eval-run.ts`) לא עוברים דרך Edge ולא כותבים. הם נשארים מופרדים בתג `source:eval`.

### תצוגה בטאב ה־AI

- RPC חדש `public.get_admin_ai_calls(p_from, p_to)`, `SECURITY DEFINER` ו־`is_admin_user()`. לא בתוך `get_admin_ai_stats`, כדי שהקיים לא ישתנה.
- **לכל `operation`:**
  - קריאות ואחוז כשל.
  - p50 ו־p95 של `latency_ms`.
  - טוקנים ועלות.
  - קוד השגיאה הנפוץ.
- **לכל משתמש:** קריאות ועלות, בלי תוכן.
- **השוואה לשער:** שורת הבדל בין סכום `cost_usd` לבין הדוח של השער באותו טווח. הבדל גדול אומר שחסרות שורות.

## שכבה 2: מונים

### יחידות ומשקלות

צורכים פעם אחת לכל **פעולה של המשתמש**, לא לכל קריאה למודל:

| פעולה | איפה צורכים | משקל לדוגמה |
|---|---|---|
| `receipt` | `ai-read-receipt` | 5 |
| `speech` | `ai-transcribe-speech` | 3 |
| `text` | `ai-classify-intent` | 1 |

- **בלי משקל:** `question_slots` ו־`duplicates` הן קריאות המשך של אותה הודעה. `shadow` היא מדידה שלנו, והמשתמש לא צריך לשלם עליה.
- **הגבלת הקצב לדקה** חלה על כל השש, כולל אלה.
- **תקרה יומית על כל הקריאות למשתמש**, כולל `question_slots`, `duplicates` ו־`shadow` שאין להן משקל. למשל 300 ביום. בלי זה הן מוגבלות רק לדקה, ואפשר לקרוא להן ישירות עם ה־token של המשתמש. נספרת באותה `ai.usage_rate`, בדלי `day`.
- המשקלות בטבלה הם דוגמה. המספרים האמיתיים בסעיף «מספרים».

### `ai.consume_usage(p_user_id, p_kind)`

- אטומית, עם `service_role` בלבד. Edge קורא לה אחרי `isTrialUser` ולפני ה־`fetch`.
- **שתי טבלאות מונים**, באותו דפוס של `increment_download_count`:
  - `ai.usage_counters (user_id, period_start, units_used)`: יחידות בתקופה.
  - `ai.usage_rate (user_id, bucket, bucket_start, calls)`: קריאות, בשני דליים. `minute` להגבלת הקצב, ו־`day` לתקרה יומית.
- **בדיקה ועדכון באותה פקודה:** `INSERT … ON CONFLICT DO UPDATE … WHERE units_used + weight <= quota … RETURNING`. כשהתנאי לא מתקיים לא חוזרת שורה, וזו התשובה «נגמר». אין חלון בין בדיקה לכתיבה, גם בשתי בקשות במקביל.
- **החזרה:** `{ allowed, reason, usage_id, units_left, resets_at }`. `reason` הוא `quota_exhausted`, `rate_limited` או `daily_limit`.
- **קריאות בלי משקל** עוברות דרך `ai.consume_call(p_user_id)`, שבודקת רק את שני הדליים, באותה פקודה אטומית.
- **שחרור:** כשהספק נכשל אחרי הצריכה, Edge קורא ל־`ai.release_usage(p_usage_id)`, באותה בקשה. אם Edge נפל לפני השחרור, המשתמש מפסיד יחידה אחת. זה מקובל.
- **בנוי לקרדיטים:**
  - המונה סופר יחידות, לא קריאות.
  - התקרה מגיעה מפונקציה אחת `ai.usage_quota(p_user_id)`. עד שכבה 3 היא מחזירה ערך קבוע אחד לכולם.
  - בשכבה 3 היא קוראת מסלול. בקרדיטים, תקרה ועוד יתרה שנקנתה. `consume_usage` לא משתנה.

### מה המשתמש רואה

- **כשהמכסה נגמרה:** Edge מחזיר 200 עם `reason: "quota_exhausted"` ו־`resets_at`. `"rate_limited"` כשעברו את הקצב.
- **הודעות:** `aiIntake.quotaExhausted` («נגמרה המכסה של החודש. היא מתחדשת ב־…») ו־`aiIntake.rateLimited` («יותר מדי בקשות. נסה שוב בעוד דקה»). מוצגות דרך `STATUS_MESSAGES`, כמו `providerFailed`.
- **טקסט ממשיך לעבוד בלי מודל:** `fallbackIntent` ו־`draftFromText` לא עולים כסף. כשמכסת הטקסט נגמרה, מוצגת הערה קטנה אחת לשיחה, והשיחה ממשיכה עם ה־parser המקומי.
- **קבלה וקול נעצרים**, עם ההודעה.

## שכבה 3: מסלולים. תכנון בלבד

- `ai.plans`: `id`, `name` (`free`, `plus`…), `units_per_period`, `period` (`month`), `rate_per_minute`.
- `ai.user_plans`: `user_id`, `plan_id`, `period_anchor`, `valid_until`, `source` (`manual`, `processor`, `play`), `external_ref`.
- `ai.usage_quota` קוראת מכאן. בלי שורה, `free`.
- **איפוס:** חודש קלנדרי UTC ל־`free`, כמו הטאב. מיום העוגן (`period_anchor`) במנוי.

## שכבה 4: ממשק. תכנון בלבד

- `public.get_my_ai_usage()` ל־`authenticated`: `units_used`, `quota`, `resets_at`, ושם המסלול. בלי פרטים של קריאות.
- **«נשארו לך X החודש»** בתחתית המגירה, רק מתחת ל־20%. אין מונה שמלווה כל הודעה.
- **בסוף המכסה:** כרטיס עם «מתחדש ב־…» והצעת שדרוג, כשיש למה לשדרג.

## שכבה 5: חיוב. תכנון בלבד

- Edge `billing-webhook`:
  - מאמת חתימה.
  - idempotent לפי מזהה האירוע של הספק.
  - מעדכן את `ai.user_plans`.
  - הלקוח לא כותב מסלול אף פעם.
- **תשלום רק באתר.** ב־TWA רק תצוגת המסלול: בלי כפתור קנייה ובלי קישור לתשלום, עד שהמדיניות של Play נבדקה.
- **שאלה פתוחה: חשבונית או קבלה כחוק בישראל.**
  - **מעבד ישראלי עם הפקת מסמכים:** אנחנו המוכר. מסמך לכל חיוב, ומע״מ באחריותנו.
  - **Merchant of Record:** הוא המוכר מול הלקוח, ומוציא את המסמך ומטפל במס. ההכנסה שלנו מגיעה ממנו.

  שתי שאלות לרואה החשבון לפני בחירה:
  - האם מסמך של MoR זר מספיק ללקוח ישראלי שרוצה חשבונית.
  - איך נרשמת אצלנו הכנסה מ־MoR.
- **שאלה פתוחה: Google Play.** האפליקציה ב־Play היא TWA. כל אלה לבדוק מול המדיניות העדכנית לפני שכבה 5, ולא להניח:
  - האם מכירה של יכולת דיגיטלית (מכסת AI) מתוך ה־TWA מחייבת Google Play Billing.
  - האם Digital Goods API ו־Payment Request ב־TWA הם הדרך.
  - האם יש בישראל תוכנית חיוב חלופי.
  - האם מותר שהרכישה תהיה רק באתר, ושהאפליקציה רק תציג את המסלול.

  `source = 'play'` ב־`ai.user_plans` שמור לזה.

## מספרים

משקלות, מכסה לחודש, קצב לדקה ומחירים נקבעים רק אחרי חודש של נתונים מ־`ai.model_calls`: עלות ממוצעת ו־p95 לכל `operation`, ופעולות למשתמש פעיל בחודש. עד אז, למשתמשי הניסוי, ערכים נדיבים שרק מוכיחים שהמנגנון עוצר.

## סדר ופיצול ל־PRs

| PR | שכבה | מה | בדיקה |
|---|---|---|---|
| U1 | 1 | הקריאה הבודקת לשלושת ה־endpoints. `ai.model_calls`, `ai.record_model_call`, `model-call.ts`, ושש הפונקציות עליו. job השמירה של 13 חודשים. migration ו־rollback | `deno test` לעזר: הצלחה, 5xx, timeout, וכשל בכתיבה שלא מכשיל. על testing: קריאה מכל פונקציה כותבת שורה אחת, כשל מכוון כותב שורה עם `error_code`, ומחיקת משתמש זמני מוחקת את השורות שלו |
| U2 | 1 | `get_admin_ai_calls` והתצוגה בטאב, כולל ההבדל מול השער | Vitest לתצוגה. על testing: סכום `cost_usd` מול הדוח |
| U3 | 2 | `consume_usage`, `consume_call`, `release_usage`, `usage_quota` הקבועה, שתי טבלאות המונים עם דלי דקה ודלי יום, הקריאה מכל השש, ההודעות בלקוח, וה־fallback המקומי לטקסט | על testing: שתי קריאות במקביל על היחידה האחרונה, אחת עוברת ואחת נעצרת. כשל ספק משחרר. החלפת דקה מאפסת את הקצב. התקרה היומית עוצרת גם `shadow`. בדיקת אפיון במגירה להודעות |

U1 ו־U2, ואחריהם U3, לפני פתיחה למשתמשים אמיתיים. שכבות 3–5 נכתבות כתוכנית ביצוע רק אחרי החלטה על תמחור, ואחרי חודש של נתונים מ־U1.

## החלטות (28/10/2026)

1. **שחרור יחידה בכשל ספק:** כן.
2. **טקסט אחרי סוף המכסה:** ה־parser המקומי. קבלה וקול נעצרים.
3. **`ai.model_calls`:** שמירה 13 חודשים, ו־`ON DELETE CASCADE` מ־`auth.users`. נבדק שנמחק עם החשבון.
4. **איפוס:** חודש קלנדרי UTC ל־`free`, ומיום העוגן במנוי.
5. **תקרה יומית לכל הקריאות:** נכנסת ל־U3, בדלי `day` של `ai.usage_rate`.
6. **תשלום:** רק באתר. ב־TWA תצוגת מסלול בלבד עד בדיקת המדיניות של Play. שאלות החשבונית לרואה החשבון.
