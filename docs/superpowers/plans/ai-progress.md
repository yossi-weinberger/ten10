# Ten10 AI — יומן התקדמות

- **המסמך:** `docs/superpowers/specs/2026-10-18-ai-multichannel-design.md` (v2.7)
- **הכלל לסוכנים:** `.cursor/rules/ai-multichannel/RULE.md`

**איך משתמשים בקובץ:**
- **בתחילת סשן:** קוראים את הקובץ הזה ואת תוכנית ה־PR הרלוונטית.
- **בסוף סשן:** מעדכנים את טבלת המצב ומוסיפים 3–5 שורות ליומן.

## מצב ה־PRs

| PR | תוכנית | סוג | תלות | מצב | ענף |
|---|---|---|---|---|---|
| 1 | `2026-10-18-ai-pr01-foundation-audit.md` | בדיקות ותשתית, בלי שינוי התנהגות | — | מוזג ל־main; נשארו פעולות משתמש | [#444](https://github.com/yossi-weinberger/ten10/pull/444) |
| 2.0 | `2026-10-18-ai-pr02-0-characterization-tests.md` | בדיקות ו־CI בלבד | — | מוזג ל־main | [#443](https://github.com/yossi-weinberger/ten10/pull/443) |
| 2a | `2026-10-18-ai-pr02-transaction-domain.md` משימות 1–3 | קוד, בלי שינוי התנהגות | PR 2.0 | מוזג ל־`feat/ai-intake` | [#446](https://github.com/yossi-weinberger/ten10/pull/446) |
| 2b | אותו קובץ, משימות 4–6 | קוד | PR 2a | מוזג ל־`feat/ai-intake` | [#447](https://github.com/yossi-weinberger/ten10/pull/447) |
| 1c | `2026-10-18-ai-pr01c-get-user-transactions-cleanup.md` | DB, רצוי ולא חסם | PR 1 | לא התחיל | |
| 1b | `2026-10-18-ai-pr01b-delete-account.md` | DB + UI + Edge, מסלול צדדי | PR 1 + החלטת מדיניות | לא התחיל | |
| 3 | `2026-10-19-ai-pr03-eval-harness.md` | eval harness, offline | contracts מ־PR 2b | מוזג ל־`feat/ai-intake` | [#448](https://github.com/yossi-weinberger/ten10/pull/448) |
| 4 | `20261019020000_ai_schema_foundation.sql` | schema `ai`, עמודת `origin`, `p_origin` | PR 2–3 | מוזג ל־`feat/ai-intake`, ורץ על testing | [#449](https://github.com/yossi-weinberger/ten10/pull/449) |
| 5 | `20261019033000_ai_commit_intake_items.sql` | RPC רישום, בלי שמירה אוטומטית ובלי UI | PR 4 | מוזג ל־`feat/ai-intake`, ורץ על testing | [#450](https://github.com/yossi-weinberger/ten10/pull/450) |
| 6 | `supabase/functions/_shared/ai/intent.ts` | סיווג כוונות, בלי רשת ובלי DB | PR 3 | מוזג ל־`feat/ai-intake` | [#451](https://github.com/yossi-weinberger/ten10/pull/451) |
| 7 | מעטפת צ'אט מאחורי `ai_intake_web` | UI + רישום טקסט | PR 6 | מוזג ל־`feat/ai-intake` | [#458](https://github.com/yossi-weinberger/ten10/pull/458) |
| 8 | אייקון ומסנן מקור בטבלת התנועות | UI, Web בלבד | PR 4 + PR 7 | מוזג ל־`feat/ai-intake` | [#459](https://github.com/yossi-weinberger/ten10/pull/459) |
| 9 | רענון אחרי שמירת טקסט | UI | PR 7–8 | מוזג ל־`feat/ai-intake` | [#460](https://github.com/yossi-weinberger/ten10/pull/460) |
| 10 | `ai.undo_intake_commit` וכפתור בטל בצ'אט | DB על testing + UI | PR 5 + PR 9 | מוזג ל־`feat/ai-intake` | [#462](https://github.com/yossi-weinberger/ten10/pull/462) |
| 11 | ביטול מתפריט השורה בטבלה | DB על testing + UI | PR 10 | נפתח מול `feat/ai-intake` | |
| 12 | נכתב כשהגל הקודם נסגר | | §24.1 במסמך | | |

**ענף אינטגרציה:** כל ה־PRs של ה־AI מכוונים ל־`feat/ai-intake` (CI רץ גם עליו). הוא ממוזג ל־`main` רק כשיכולת שלמה עובדת. תיקונים שאינם AI הולכים ישר ל־`main`.

**סדר מומלץ:**
1. PR 2a ואחריו PR 2b, מול `feat/ai-intake`. במקביל: המשימות שאינן קוד, וה־eval harness (PR 3) offline על הקבלות.
2. מסלול DB, אחד אחד כי ענף ה־testing משותף: PR 1c (או בתוך PR 4), ו־PR 1b כשמדיניות המחיקה הוחלטה. לבדוק אם אינטגרציית ה־Preview של Supabase מריצה migrations גם ל־PRs שמכוונים ל־`feat/ai-intake`.
3. כשממזגים את `feat/ai-intake` ל־`main` עם שינוי ב־`_shared`: בשעה רחוקה מה־crons, כי כל פונקציות ה־Edge נפרסות.

## משימות בלי קוד (להתחיל עכשיו, לוקחות זמן קלנדרי)

- [ ] אימות עסק (Business Verification) מול Meta, ובחירת מספר ל־WhatsApp
- [ ] איסוף 50–100 קבלות ישראליות אמיתיות, באישור ובאנונימיזציה, ל־evals (§21.2)
- [ ] החלטת פרטיות: אילו נתונים מותר לשלוח לספקי AI, ולאילו ספקים (§9.5)
- [ ] פתיחת חשבונות ומפתחות אצל ספקי AI, עם תקרת תקציב לכל סביבה
- [x] רשימת `user_id` של משתמשי הניסוי ב־testing, ל־allowlist (§22.1)

## פעולות משתמש פתוחות (מ־PR 1, פירוט ב־`docs/superpowers/specs/2026-10-18-ai-pr01-findings.md`)

- [x] **Vercel Preview.** משתני הייצור הוגדרו ל־Production בלבד, ומשתני testing לכל ה־Preview (19/10/2026). שינוי `VITE_*` נכנס רק אחרי Redeploy.
- [x] Vault של testing: שני הסודות כבר של testing (אומת בדשבורד).
- [x] Webhook "Trigger Contact Email" ב־testing הועבר לכתובת ולמפתח של testing (19/10/2026). בייצור לא נגענו.
- [x] `unsubscribe`: נמחקה מהדשבורד. הביטול באתר נשאר דרך `verify-unsubscribe-token`.
- [x] משתמשי הניסוי ב־testing (מזהים בלבד; לנתונים נוספים אפשר לייצר משתמשים סינתטיים):
  - `01665dce-d261-4a9b-b89d-04ce2460859b`
  - `45e3efc0-171b-48ce-9f15-4468394dfaeb`
  - `a0a4fdd4-49bf-48a0-a3b0-4c76d60597e4`
  - `5403d7d1-3f44-4243-a84a-f905c4aad30c`
  - `f336e5d1-4dc2-40c6-b176-c0b199ee836d`
  - `a3f81dec-f634-4784-9cc0-9921838a6037`

## החלטות פתוחות

- **`handle_contact_form`:** קובע `verified_captcha = true` בלי בדיקה בשרת; ה־CAPTCHA נאכף רק בלקוח. חומרה נמוכה–בינונית (ספאם למייל התמיכה, בלי חשיפת נתונים). לתקן ב־PR נפרד.

- **מדיניות מחיקת תנועות במחיקת חשבון:** מחיקה מלאה, או שמירה לתקופה מוגדרת? נדרשת לפני PR 1b (§13.6).
- **התנהגויות שנראות כמו באגים, שנמצאו בבדיקות האפיון (PR 2.0).** הבדיקות מקבעות אותן כמו שהן; לכל אחת צריך להחליט אם מתקנים, ב־PR נפרד ולא בתוך PR 2:
  1. `type-resolver.ts:80` מתאים מילות הכנסה לפי תת־מחרוזת (`includes`): "Homework" או "network fee" עם סכום שלילי הופכים להכנסה. באג בייבוא CSV גם בלי קשר ל־AI.
  2. `category-registry.ts:134-141`: מפת הנרמול נשמרת בקריאה הראשונה. אם ה־namespace `transactions` עוד לא נטען, "מזון" לא יתמפה ל־`food` עד סוף הסשן. כדאי לבדוק בייצור.
  3. `recognized-expense`, `exempt-income`, `non_tithe_donation` ו־`initial_balance` כפי שהם אינם aliases; הסוג נקבע לפי סימן. רק "recognized expense" עם רווח מזוהה.
  4. שער 0: הלקוח מדלג לספק הבא, אבל `process-recurring-transactions/index.ts:69` מקבל 0, ואז הסכום המומר שנשמר הוא 0. סיכון אמיתי (נדיר) ב־cron שכותב תנועות.
  5. `toFixed(2)` בטופס אינו "עיגול חצי למעלה" (1.005 נותן 1, 2.675 נותן 2.67). `applyConversion` של ה־AI חייב לשחזר בדיוק את זה, או שמחליטים לתקן את כל המסלולים יחד (כלל 6 ב־RULE).
  6. השער ההפוך ב־cache מחושב מהשער לפני העיגול.
  7. `fromDebitCredit`, `debitValue` ו־`creditValue` מועברים ל־`resolveTypeWithIssues` ולא משפיעים.
- **שיפור סקריפט הפריסה:** היום כל שינוי ב־`_shared` פורס את כל 10 הפונקציות. האם לפרוס רק את הפונקציות שמייבאות את הקובץ שהשתנה? לא חוסם; מחליטים לפני PR 2a.

## יומן

- **2026-10-18:** נוצרה הערכה. המסמך v2.5 הועתק לריפו, ונוספו ה־rule, היומן ותוכניות ל־PRs 1, 1b, 1c ו־2.
- **2026-10-18:** אימות מול ה־DB החי (קריאות קטלוג בלבד), ה־CI והקוד. המסמך עודכן ל־v2.6 (נספח ו׳). עיקרי הממצאים: `track_functions=none`; PR 1c אינו חסם; ב־Vault של testing צריך להחליף גם את `functions_base_url`; אין bucket בשם `avatars`; שינוי ב־`_shared` פורס את כל פונקציות ה־Edge; כיסוי הבדיקות דל. נוסף PR 2.0, PR 2 פוצל ל־2a ו־2b, והמעבר של `process-recurring-transactions` הוצא ממנו. הצעד הבא: PR 1 המקוצר ו־PR 2.0.
- **2026-10-18:** PR 2.0 נפתח כ־draft ([#443](https://github.com/yossi-weinberger/ten10/pull/443)): 140 בדיקות אפיון, שלב ה־Deno ב־CI מריץ כל `*_deno_test.ts`, בלי שינוי בקוד מוצר, CI ירוק. parity של השערים ב־`process-recurring-transactions` לא נבדק, כי הקובץ מפעיל `Deno.serve` בייבוא; ה־fixture מוכן ל־PR 2. נמצאו 7 התנהגויות חשודות (בהחלטות הפתוחות). בדיקת "Supabase Preview" מופיעה ב־PR (skipping, כי אין migrations): סימן שהאינטגרציה פעילה ל־PRs חדשים.
- **2026-10-18:** PR 1 נפתח כ־draft ([#444](https://github.com/yossi-weinberger/ten10/pull/444)): נמחקו `deploy-functions.js` והסקריפט `deploy-supabase`, התיעוד עודכן, ונוסף קובץ הממצאים. ה־audit של 15 פונקציות `SECURITY DEFINER` לא מצא חור קריטי. לפי לוגים של 85 יום (דגימה), כל הקריאות ל־`get_user_transactions` הן עם 13 הפרמטרים. ממצאים חדשים: Vercel Preview מצביע על הייצור, ה־webhook של טופס יצירת הקשר מכיל מפתח ייצור (אומת בקטלוג), וה־CAPTCHA נאכף רק בלקוח. הצעד הבא: פעולות המשתמש, ואחרי מיזוג PR 2.0 להתחיל את PR 2a.
- **2026-10-18:** #442, #443 ו־#444 מוזגו ל־`main` (בלי פריסת Supabase ובלי תגית שחרור). Vault של testing נמצא תקין. הוחלט על ענף אינטגרציה `feat/ai-intake` מ־`main`, ו־CI הורחב אליו. הצעד הבא: PR 2a מול `feat/ai-intake`.
- **2026-10-18:** יושרו המסמכים לגבי Vault של testing (תקין). נוספה ל־PR 2b משימה להחליף את הביטוי ה־inline של ההמרה ב־`applyConversion` ואת בדיקת הנוסחה המועתקת. ה־MCP של Supabase לייצור הוגדר `read_only=true`. הצעד הבא: PR קטן ל־`main` שמתקן את שער 0 ב־`process-recurring-transactions`, ואז PR 2a.
- **2026-10-18:** נפתח [#445](https://github.com/yossi-weinberger/ten10/pull/445) מול `main` (לא מוזג): שער לא חיובי, כולל שער שמתעגל ל־0, מדלג לספק הבא ב־`process-recurring-transactions`. CI ירוק חוץ מ־Rust שעוד רץ. המיזוג פורס רק את הפונקציה הזו, ועדיף מחוץ לשעות ה־crons.
- **2026-10-18:** נפתח [#446](https://github.com/yossi-weinberger/ten10/pull/446) (PR 2a) מול `feat/ai-intake`: מפתחות, כינויי parsing ו־`normalize-core` ב־`_shared`, עם `FILE_IMPORT` ו־`AI_DRAFT`. בדיקות האפיון נשארו ירוקות. מקטע `parsing` הוסר מ־`import.json` (לא היה בשימוש ב־UI). נרמול קטגוריות באפליקציה עדיין עובר דרך i18n, כדי שבדיקת "בלי תרגום" תישאר נכונה; ב־Deno הרשימה סטטית. לא מוזג: מיזוג ל־`main` היה פורס את כל פונקציות ה־Edge.
- **2026-10-19:** #446 (PR 2a) מוזג ל־`feat/ai-intake`. נפתח [#447](https://github.com/yossi-weinberger/ten10/pull/447) (PR 2b) מול `feat/ai-intake`, לא מוזג: המרת מטבע משותפת וחוזה הטיוטה (משימות 4–6). `applyConversion` שומר את `toFixed(2)`. התנהגות CSV/`FILE_IMPORT` ללא שינוי, ו־`process-recurring-transactions` לא נגע. לא ל־`main`.
- **2026-10-19:** #445 מוזג ל־`main`. #447 (PR 2b) מוזג ל־`feat/ai-intake`, ואז `origin/main` מוזג לתוכו עם תיקון שער 0. נפתח [#448](https://github.com/yossi-weinberger/ten10/pull/448) (PR 3) מול `feat/ai-intake`, לא מוזג: harness אופליין, בלי ספק ובלי קבלות.
- **2026-10-19:** #448 מוזג ל־`feat/ai-intake`. נפתח PR 4 מול אותו ענף: schema `ai` (קריאה בלבד למשתמש), עמודת `transactions.origin`, והחלפת החתימה שבשימוש של `get_user_transactions` עם `p_origin` שברירת המחדל שלו NULL. החתימות המתות נשארו. לא ל־`main`.
- **2026-10-19:** #449 מוזג ל־`feat/ai-intake` אחרי CI ירוק. Supabase Preview דילג, כך שהמיגרציה לא רצה על testing ולא על הייצור. נפתח PR של `ai.commit_intake_items`: רישום רק למשתמש המחובר, בלי שמירה אוטומטית. כשל אחד מבטל את כל הקריאה.
- **2026-10-19:** #450 מוזג ל־`feat/ai-intake`. נוסף סיווג כוונות דטרמיניסטי (`classifyIntent`) עם בדיקות Deno. הוא מחזיר תווית בלבד, בלי רשת ובלי כתיבה.
- **2026-10-19:** #451 מוזג ל־`feat/ai-intake`. שתי המיגרציות רצו על testing בלבד. Vercel Preview הועבר ל־testing, `unsubscribe` נמחקה, וה־webhook של יצירת הקשר ב־testing מצביע על testing. נוסף `llm-instructions/features/ai/ai-intake-how-it-works.md` כתיעוד איך הפיצ'ר עובד היום.
- **2026-10-19:** על testing, `get_user_transactions` עם 13 ארגומנטים ועם `p_origin` ריק החזיר אותו מספר שורות למשתמש ניסוי, ואפס שורות עם `origin`. נוספה מעטפת צ'אט מאחורי הדגל `ai_intake_web`. היא מסווגת טקסט ולא שומרת.
- **2026-10-19:** תוקן `replaceAll` ששבר את ה-typecheck. לתנועה שזוהתה נוסף חילוץ דטרמיניסטי של סכום, מטבע, סוג, אתמול/שלשום ושער שנכתב בטקסט. עדיין בלי שמירה.
- **2026-10-19:** על testing נוספו `create_ai_text_intake` ו-`commit_ai_intake_items`. בכפתור "אשר ושמור" הטיוטה נרשמת אחרי המרה. בלי שער אין שמירה. הייצור לא נגע.
- **2026-10-19:** התיאור נוקה מפקודה, סכום ומטבע. "קניתי מאפים באליס ב-15 שח" נשמר כ"מאפים באליס". קטגוריה ואמצעי תשלום רק ממילים ברורות.
- **2026-10-19:** #458 מוזג ל־`feat/ai-intake`. בטבלת התנועות ב-Web נוסף אייקון כש-`origin` הוא `ai` או `ai_auto`, ומסנן מקור. `p_origin` נשלח רק כשהמסנן לא "הכל". Desktop בלי האייקון ובלי המסנן.
- **2026-10-19:** #459 מוזג ל־`feat/ai-intake`. אחרי שמירת טקסט מוצלחת מתעדכן `lastDbFetchTimestamp` וטבלת התנועות נטענת מחדש.
- **2026-10-19:** #460 מוזג ל־`feat/ai-intake`. המסמך עודכן ל־v2.7: `domain_adjacent` מציג סעיף הלכה שפורסם בלי ניסוח מודל, בדיקת grounding למספרים לפני טקסט חופשי, ושמירת שאילתה מובנית אחת להמשך. סדר הבנייה לא השתנה.
- **2026-10-19:** נוסף `ai.undo_intake_commit` על testing, וכפתור "בטל" בצ'אט אחרי שמירה. ביטול מותר 7 ימים ורק אם התנועה לא נערכה. כפתור בטבלה עדיין לא קיים.
- **2026-10-19:** #462 מוזג ל־`feat/ai-intake`. בתפריט השורה ב-Web נוסף "בטל שמירת AI", דרך `undo_ai_transaction`. אותם תנאים כמו בצ'אט. Desktop בלי הפריט.
