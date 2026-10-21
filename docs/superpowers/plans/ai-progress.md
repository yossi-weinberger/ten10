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
| 11 | ביטול מתפריט השורה בטבלה | DB על testing + UI | PR 10 | מוזג ל־`feat/ai-intake` | [#463](https://github.com/yossi-weinberger/ten10/pull/463) |
| 12 | רענון בחזרה ללשונית | UI, Web בלבד | §4.6 | מוזג ל־`feat/ai-intake` | [#464](https://github.com/yossi-weinberger/ten10/pull/464) |
| 13 | שאלת הבהרה אחת: סוג ואז סכום | UI, בלי שמירה | PR 7 | מוזג ל־`feat/ai-intake` | [#465](https://github.com/yossi-weinberger/ten10/pull/465) |
| 14 | כלל קדימה אחרי אישור | DB על testing + UI | §9.9 | מוזג ל־`feat/ai-intake` | [#466](https://github.com/yossi-weinberger/ten10/pull/466) |
| 15 | כינויי עברית ואנגלית בקובץ נתונים | בלי שינוי התנהגות בעברית | §9.9 | מוזג ל־`feat/ai-intake` | [#467](https://github.com/yossi-weinberger/ten10/pull/467) |
| 16 | כינויי הטיוטה באותו קובץ | עברית ללא שינוי, ואנגלית נוספת | §9.9 | מוזג ל־`feat/ai-intake` | [#468](https://github.com/yossi-weinberger/ten10/pull/468) |
| 17 | כיבוי כלל במסך ההגדרות | DB על testing + UI | PR 14 | מוזג ל־`feat/ai-intake` | [#469](https://github.com/yossi-weinberger/ten10/pull/469) |
| 18 | מדידת צל לשמירה אוטומטית | DB על testing, בלי שמירה אוטומטית | §10.6 | מוזג ל־`feat/ai-intake` | [#470](https://github.com/yossi-weinberger/ten10/pull/470) |
| 19 | תשובה מדף הלכה שפורסם | UI, בלי מודל | §9.9 | מוזג ל־`feat/ai-intake` | [#471](https://github.com/yossi-weinberger/ten10/pull/471) |
| 20 | תוצאת המשתמש במדידת הצל | DB על testing | §10.6 | מוזג ל־`feat/ai-intake` | [#472](https://github.com/yossi-weinberger/ten10/pull/472) |
| 21 | תיקון תיאור וסכום לפני שמירה | UI + DB על testing | §10.6 | מוזג ל־`feat/ai-intake` | [#473](https://github.com/yossi-weinberger/ten10/pull/473) |
| 22 | אזהרת כפילות לפני שמירה | DB על testing + UI, בלי מודל | §10.5 | מוזג ל־`feat/ai-intake` | [#474](https://github.com/yossi-weinberger/ten10/pull/474) |
| 23 | תשובה לאזהרת כפילות | DB על testing + UI, בלי מודל | §10.5 | מוזג ל־`feat/ai-intake` | [#475](https://github.com/yossi-weinberger/ten10/pull/475) |
| 24 | טיוטה פתוחה באזהרת כפילות | DB על testing + UI, בלי מודל | §10.5 | מוזג ל־`feat/ai-intake` | [#476](https://github.com/yossi-weinberger/ten10/pull/476) |
| 25 | דירוג כפילות עם Jev | Edge על testing + UI | §10.5 | מוזג ל־`feat/ai-intake` | [#478](https://github.com/yossi-weinberger/ten10/pull/478) |
| 26 | סכום בקריאת Jev לכפילות | Edge על testing | §10.5 | מוזג ל־`feat/ai-intake` | [#480](https://github.com/yossi-weinberger/ten10/pull/480) |
| 27 | מדידת צל לבחירת סוג | Edge על testing, בלי לשנות את השאלה | §9.3 | מוזג ל־`feat/ai-intake` | [#482](https://github.com/yossi-weinberger/ten10/pull/482) |
| 28 | מדידת צל לבחירת קטגוריה | Edge על testing, בלי לשנות את השמירה | §9.3 | מוזג ל־`feat/ai-intake` | [#484](https://github.com/yossi-weinberger/ten10/pull/484) |
| 29 | Jev כששכבת המילים לא מזהה כוונה | Edge על testing + UI | §9.9 | מוזג ל־`feat/ai-intake` | [#486](https://github.com/yossi-weinberger/ten10/pull/486) |
| 30 | תאריך של יום בשבוע שעבר | parser, בלי מודל | §9.9 | מוזג ל־`feat/ai-intake` | [#488](https://github.com/yossi-weinberger/ten10/pull/488) |
| 31 | תיקון שמירה, allowlist, ודגל על הממשק | DB על testing + Edge + UI | §10.5 | מוזג ל־`feat/ai-intake` | [#490](https://github.com/yossi-weinberger/ten10/pull/490) |
| 32 | Jev דרך Vercel AI Gateway | Edge על testing | §9.4 | מוזג ל־`feat/ai-intake` | [#493](https://github.com/yossi-weinberger/ten10/pull/493) |
| 33 | קריאת תמונת קבלה | Edge על testing + UI | §4.2 | מוזג ל־`feat/ai-intake` | [#495](https://github.com/yossi-weinberger/ten10/pull/495) |
| 34 | PDF וקריאה בעברית ובאנגלית | Edge על testing + UI | §4.2 | מוזג ל־`feat/ai-intake` | [#497](https://github.com/yossi-weinberger/ten10/pull/497) |
| 35 | תמלול דיבור | Edge על testing + UI | §4.3 | מוזג ל־`feat/ai-intake` | [#499](https://github.com/yossi-weinberger/ten10/pull/499) |
| 36 | משתמש בדיקות ב-allowlist | Edge על testing | §22.1 | מוזג ל־`feat/ai-intake` | [#501](https://github.com/yossi-weinberger/ten10/pull/501) |
| 37 | logger ו-CORS משותפים ב-Edge | בלי שינוי התנהגות למשתמש | כלל 11 | מוזג ל־`feat/ai-intake` | [#503](https://github.com/yossi-weinberger/ten10/pull/503) |
| 38 | סוג ותאריך בקבלה | UI | §4.2 | מוזג ל־`feat/ai-intake` | [#506](https://github.com/yossi-weinberger/ten10/pull/506) |
| 39 | תיקוני QA: כשל ספק, כללים, תיאור, מיקרופון, גודל קבלה | UI + Edge על testing | §4.2 | מוזג ל־`feat/ai-intake` | [#507](https://github.com/yossi-weinberger/ten10/pull/507) |
| 40 | Jev ראשון לסיווג כוונה | Edge על testing + UI | §9.9 | מוזג ל־`feat/ai-intake` | [#508](https://github.com/yossi-weinberger/ten10/pull/508) |
| 41 | ש״ח לא נשאר בתיאור | parser | §9.9 | מוזג ל־`feat/ai-intake` | [#509](https://github.com/yossi-weinberger/ten10/pull/509) |
| 42 | סף ודאות 0.7 לכוונה | UI | §9.9 | מוזג ל־`feat/ai-intake` | [#511](https://github.com/yossi-weinberger/ten10/pull/511) |
| 43 | סכום שנשמר לשאלת שנה וסוג | UI, קריאה בלבד | §9.9 | מוזג ל־`feat/ai-intake` | [#512](https://github.com/yossi-weinberger/ten10/pull/512) |
| 44 | שאלה על השנה ועל החודש | UI, קריאה בלבד | §9.9 | מוזג ל־`feat/ai-intake` | [#513](https://github.com/yossi-weinberger/ten10/pull/513) |
| 45 | סריקת כפילויות בתנועות שנשמרו | UI, קריאה בלבד | §9.9 | מוזג ל־`feat/ai-intake` | [#514](https://github.com/yossi-weinberger/ten10/pull/514) |
| 46 | ספירת תנועות וחלון חודשים | UI, קריאה בלבד | §9.9 | מוזג ל־`feat/ai-intake` | [#515](https://github.com/yossi-weinberger/ten10/pull/515) |
| 47 | סריקה מלאה ותוויות כוונה קצרות | UI, קריאה בלבד | §9.9 | מוזג ל־`feat/ai-intake` | [#516](https://github.com/yossi-weinberger/ten10/pull/516) |
| 48 | תיקון שאלות: סכום, חלון וממוצע | UI, קריאה בלבד | §9.9 | מוזג ל־`feat/ai-intake` | [#517](https://github.com/yossi-weinberger/ten10/pull/517) |
| 49 | התנועה הגדולה ביותר | UI, קריאה בלבד | §9.9 | מוזג ל־`feat/ai-intake` | [#519](https://github.com/yossi-weinberger/ten10/pull/519) |
| 50 | שאלה לפי אמצעי תשלום | UI, קריאה בלבד | §9.9 | מוזג ל־`feat/ai-intake` | [#520](https://github.com/yossi-weinberger/ten10/pull/520) |
| 51 | תיקון חלונות ומילים שלמות | UI, קריאה בלבד | §9.9 | מוזג ל־`feat/ai-intake` | [#521](https://github.com/yossi-weinberger/ten10/pull/521) |
| 52 | קטגוריה וסכום ב-SQL | DB על testing + UI | §9.9 | מוזג ל־`feat/ai-intake` | [#522](https://github.com/yossi-weinberger/ten10/pull/522) |
| 54 | התאמת קטגוריה בעברית | UI, קריאה בלבד | §9.9 | מוזג ל־`feat/ai-intake` | [#524](https://github.com/yossi-weinberger/ten10/pull/524) |
| 55 | נמען, שנת מעשר וטווח | DB על testing + UI | §9.9 | מוזג ל־`feat/ai-intake` | [#525](https://github.com/yossi-weinberger/ten10/pull/525) |
| 56 | תיקון נמען וטווח | UI, קריאה בלבד | §9.9 | מוזג ל־`feat/ai-intake` | [#526](https://github.com/yossi-weinberger/ten10/pull/526) |
| 57 | לא כפול ומחיקה באישור | DB על testing + UI | §9.9 | מוזג ל־`feat/ai-intake` | [#527](https://github.com/yossi-weinberger/ten10/pull/527) |
| 58 | קצוות נמען וטווח | DB על testing + UI | §9.9 | מוזג ל־`feat/ai-intake` | [#529](https://github.com/yossi-weinberger/ten10/pull/529) |
| 59 | כולל, חודש בודד, ומחיקה | UI | §9.9 | מוזג ל־`feat/ai-intake` | [#530](https://github.com/yossi-weinberger/ten10/pull/530) |
| 60 | כיבוי AI בפרודקשן | Edge על testing | §22 | מוזג ל־`feat/ai-intake` | [#531](https://github.com/yossi-weinberger/ten10/pull/531) |
| 61 | צ'קליסט מיזוג ל־main | תיעוד | — | מוזג ל־`feat/ai-intake` | [#532](https://github.com/yossi-weinberger/ten10/pull/532) |
| 62 | אישור לפני ביטול AI | UI | §9.9 | מוזג ל־`feat/ai-intake` | [#533](https://github.com/yossi-weinberger/ten10/pull/533) |
| 63 | עיגול שער וסדר Jev | תיעוד + בדיקה | §9.9 | מוזג ל־`feat/ai-intake` | [#534](https://github.com/yossi-weinberger/ten10/pull/534) |
| 64 | כיול סף כוונה | Edge על testing + UI | §9.9 | מוזג ל־`feat/ai-intake` | [#535](https://github.com/yossi-weinberger/ten10/pull/535) |
| 65 | טווח כפילויות והקטנת קבלה | DB על testing + UI | §9.9 | מוזג ל־`feat/ai-intake` | [#536](https://github.com/yossi-weinberger/ten10/pull/536) |
| 66 | תקופות לפי הלוח הראשי | UI, קריאה בלבד | §9.9 | מוזג ל־`feat/ai-intake` | [#537](https://github.com/yossi-weinberger/ten10/pull/537) |
| 67 | כותרת שנה וניסוח ספירה | UI | §9.9 | מוזג ל־`feat/ai-intake` | [#538](https://github.com/yossi-weinberger/ten10/pull/538) |
| 68 | זוגי, שנה באנגלית, ושקל | UI | §9.9 | מוזג ל־`feat/ai-intake` | [#539](https://github.com/yossi-weinberger/ten10/pull/539) |
| 69 | כיול כוונה על 150 משפטים | Edge | §9.9 | מוזג ל־`feat/ai-intake` | [#540](https://github.com/yossi-weinberger/ten10/pull/540) |
| 70 | שאלת יכולת היא עזרה | UI | §9.9 | מוזג ל־`feat/ai-intake` | [#541](https://github.com/yossi-weinberger/ten10/pull/541) |
| 71 | Jev בטוח גובר על «אתה יכול» | UI | §9.9 | מוזג ל־`feat/ai-intake` | [#542](https://github.com/yossi-weinberger/ten10/pull/542) |
| 72 | חילוץ פרטי שאלה דרך Jev | Edge על testing + UI | §9.9 | מוזג ל־`feat/ai-intake` | [#543](https://github.com/yossi-weinberger/ten10/pull/543) |
| 73 | נמען שלא שמור לא נבלע בסיכום | UI | §9.9 | מוזג ל־`feat/ai-intake` | [#544](https://github.com/yossi-weinberger/ten10/pull/544) |
| 74 | כיול חריצי השאלה | Edge על testing | §9.9 | מוזג ל־`feat/ai-intake` | [#545](https://github.com/yossi-weinberger/ten10/pull/545) |
| 75 | שמירת קבלה בבאקט פרטי | DB על testing + Edge | §4.2, §7 | מוזג ל־`feat/ai-intake` | [#546](https://github.com/yossi-weinberger/ten10/pull/546) |
| 76 | קישור קבלה לתנועה שנשמרה | DB על testing + Edge + UI | §4.2 | מוזג ל־`feat/ai-intake` | [#547](https://github.com/yossi-weinberger/ten10/pull/547) |
| 77 | קישור קצר לקבלה מהטבלה | DB על testing + Edge + UI | §4.6 | מוזג ל־`feat/ai-intake` | [#548](https://github.com/yossi-weinberger/ten10/pull/548) |
| 78 | Share Target לקובץ קבלה | UI, Web בלבד | §8.1 | נפתח | |

**ענף אינטגרציה:** כל ה־PRs של ה־AI מכוונים ל־`feat/ai-intake` (CI רץ גם עליו). הוא ממוזג ל־`main` רק כשיכולת שלמה עובדת. תיקונים שאינם AI הולכים ישר ל־`main`.

**סדר מומלץ:**
1. PR 2a ואחריו PR 2b, מול `feat/ai-intake`. במקביל: המשימות שאינן קוד, וה־eval harness (PR 3) offline על הקבלות.
2. מסלול DB, אחד אחד כי ענף ה־testing משותף: PR 1c (או בתוך PR 4), ו־PR 1b כשמדיניות המחיקה הוחלטה. לבדוק אם אינטגרציית ה־Preview של Supabase מריצה migrations גם ל־PRs שמכוונים ל־`feat/ai-intake`.
3. כשממזגים את `feat/ai-intake` ל־`main` עם שינוי ב־`_shared`: בשעה רחוקה מה־crons, כי כל פונקציות ה־Edge נפרסות.

## צ'קליסט: PR ל־main

`20261019195400_decouple_reminders_from_marketing_consent.sql` כבר רץ בפרודקשן ב־19/10 21:02. 15 מיגרציות AI, מ־`20261019020000` עד `20261019190000`, מתוארכות לפניו. `supabase db push --linked --yes` בלי `--include-all` ייכשל עליהן. לא משנים את ה־workflow ל־`--include-all`.

רק בתוך ה־PR ש־base שלו הוא `main`:

- [ ] לשנות את חותמת הזמן של **כל** מיגרציות ה־AI (`supabase/migrations/*_ai_*.sql`, 28 קבצים) לתאריכים אחרי המיגרציה האחרונה ב־`main` באותו רגע, באותו סדר.
- [ ] לעדכן את קבצי ה־rollback המקבילים: `20261019020000_ai_schema_foundation_down.sql`, `20261020140000_ai_question_recipient_down.sql`, `20261020150000_ai_duplicate_actions_down.sql`.
- [ ] על testing בלבד: `supabase migration list`, ואז `supabase migration repair` כך שההיסטוריה תתאים לשמות החדשים.
- [ ] Supabase Preview על ה־PR ל־`main` עובר.
- [ ] למזג בשעה רחוקה מה־crons: לא ב־00:00, 07:00, 18:00 או 19:00 UTC.

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
  - `c4e7d297-9ed3-421a-af9c-92ccccf95ba0`

## החלטות פתוחות

- **`handle_contact_form`:** קובע `verified_captcha = true` בלי בדיקה בשרת; ה־CAPTCHA נאכף רק בלקוח. חומרה נמוכה–בינונית (ספאם למייל התמיכה, בלי חשיפת נתונים). לתקן ב־PR נפרד.

- **מדיניות מחיקת תנועות במחיקת חשבון:** מחיקה מלאה, או שמירה לתקופה מוגדרת? נדרשת לפני PR 1b (§13.6).
- **התנהגויות שנראות כמו באגים, שנמצאו בבדיקות האפיון (PR 2.0).** הבדיקות מקבעות אותן כמו שהן; לכל אחת צריך להחליט אם מתקנים, ב־PR נפרד ולא בתוך PR 2:
  1. `type-resolver.ts:80` מתאים מילות הכנסה לפי תת־מחרוזת (`includes`): "Homework" או "network fee" עם סכום שלילי הופכים להכנסה. באג בייבוא CSV גם בלי קשר ל־AI.
  2. `category-registry.ts:134-141`: מפת הנרמול נשמרת בקריאה הראשונה. אם ה־namespace `transactions` עוד לא נטען, "מזון" לא יתמפה ל־`food` עד סוף הסשן. כדאי לבדוק בייצור.
  3. `recognized-expense`, `exempt-income`, `non_tithe_donation` ו־`initial_balance` כפי שהם אינם aliases; הסוג נקבע לפי סימן. רק "recognized expense" עם רווח מזוהה.
  4. שער 0: הלקוח מדלג לספק הבא, אבל `process-recurring-transactions/index.ts:69` מקבל 0, ואז הסכום המומר שנשמר הוא 0. סיכון אמיתי (נדיר) ב־cron שכותב תנועות.
  5. **הוחלט.** `toFixed(2)` נשאר, והשער מעוגל ל־4 ספרות גם בהקלדה ידנית. 1000 × 3.71236 נשמר כשער 3.7124 וסכום 3712.40. זה שינוי מכוון מול הטופס הקודם, ששמר את השער המלא. 1.005 עדיין נותן 1.
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
- **2026-10-19:** #463 מוזג ל־`feat/ai-intake` (ביטול מתפריט השורה). #464 מוזג ל־`feat/ai-intake`: ב-Web, חזרה ללשונית אחרי שהייתה מוסתרת מרעננת את הכרטיסים ואת טבלת התנועות. Desktop לא.
- **2026-10-19:** בצ'אט, תנועה בלי פועל שמסמן סוג שואלת קודם "איזו תנועה זו?". בלי סכום נשאל "כמה?". אין טיוטה ואין שמירה לפני התשובה.
- **2026-10-19:** #465 מוזג ל־`feat/ai-intake`. כלל "מהיום" נשמר רק אחרי אישור, וחל על טיוטה חדשה שמזכירה את השם. "הוצאות פטורות ממעשר" שואל למה הכוונה. אין החלה על תנועות קיימות, ואין עדיין מסך הגדרות.
- **2026-10-19:** #466 מוזג ל־`feat/ai-intake`. כינויי הזיהוי בעברית ובאנגלית עברו ל־`phrase-aliases.ts`. `decide()` עדיין לא מחובר.
- **2026-10-19:** #467 מוזג ל־`feat/ai-intake`. מילות התאריך, המטבע, הקטגוריה, הסוג ואמצעי התשלום של הטיוטה עברו לאותו קובץ כינויים.
- **2026-10-19:** #469 מוזג ל־`feat/ai-intake`. במסך ההגדרות ב-Web, כשהדגל דולק, אפשר לכבות כלל פעיל. כיבוי לא משנה תנועות קיימות. Desktop לא מציג את הכרטיס.
- **2026-10-19:** #470 מוזג ל־`feat/ai-intake`. בשמירת טקסט נרשם אם הטיוטה מתאימה לצל של שמירה אוטומטית. `would_auto_save` נשאר false, והשמירה נשארת בלחיצה.
- **2026-10-19:** #471 מוזג ל־`feat/ai-intake`. שאלה על מונח מדפי ההלכה מציגה את הפסקה שפורסמה, בלי ניסוח של מודל. פסיקה אישית נשארת בלי תשובה.
- **2026-10-19:** #472 מוזג ל־`feat/ai-intake`. אישור שמירה רושם `outcome = approved`, וביטול רושם `reverted`. השמירה האוטומטית נשארת כבויה.
- **2026-10-19:** #473 מוזג ל־`feat/ai-intake`. בכרטיס הטיוטה אפשר לתקן תיאור וסכום לפני השמירה. השרת רושם `user_edited` לפי ההשוואה למה שחולץ.
- **2026-10-19:** #474 מוזג ל־`feat/ai-intake`. לפני שמירה מוצגת אזהרה אם יש תנועה דומה בטווח של שלושה ימים ו-2%. אין חסימה ואין מודל.
- **2026-10-19:** #475 מוזג ל־`feat/ai-intake`. "שמור בכל זאת" רושם `saved_anyway`, ו"זו אותה תנועה" רושם `same_event` בלי תנועה חדשה. השרת מאמת את המזהים.
- **2026-10-19:** #476 מוזג ל־`feat/ai-intake`. אזהרת הכפילות כוללת גם טיוטה פתוחה, לא רק תנועה שכבר נשמרה.
- **2026-10-19:** #478 מוזג ל־`feat/ai-intake`. כשיש מועמדי כפילות, Jev על testing מסדר אותם לפי "אותו אירוע". נשלחים תיאור, סוג והפרש ימים. אין חסימה, ואין שינוי בבחירת סוג התנועה.
- **2026-10-19:** #480 מוזג ל־`feat/ai-intake`. קריאת Jev לכפילות כוללת גם את הסכום והמטבע של הטיוטה ושל כל מועמד. מזהה המשתמש נשאר בחוץ.
- **2026-10-19:** #482 מוזג ל־`feat/ai-intake`. כשהמשתמש נשאל על הסוג ושומר, Jev רושם בחירת צל. הסוג שנשמר נשאר התשובה של המשתמש.
- **2026-10-19:** #484 מוזג ל־`feat/ai-intake`. כשאין קטגוריה שמורה, Jev רושם בחירת קטגוריה בצל. הקטגוריה שנשמרת לא משתנה. לתרומה אין קטגוריה.
- **2026-10-19:** #486 מוזג ל־`feat/ai-intake`. משפט ששכבת המילים לא מזהה נשלח ל-Jev לבחירת כוונה. אם הכוונה מוכרת למסך, הוא ממשיך איתה.
- **2026-10-19:** #488 מוזג ל־`feat/ai-intake`. "ביום ראשון שעבר" ו-"last monday" מחושבים בפרסר. אם היום הוא אותו יום, נלקח לפני שבוע.
- **2026-10-19:** נפתח [#490](https://github.com/yossi-weinberger/ten10/pull/490). שמירת שקלים נשברה כי הסכום שחולץ נכתב ל-`original_amount`. `extracted_amount` מפריד את ההשוואה, ומפתחות ההמרה נמחקים כשאין מטבע מקור. קריאות Jev חסומות ל-allowlist. רישום צל רק מ-`service_role`. האייקון, המסנן, הביטול והרענון בחזרה ללשונית מאחורי הדגל.
- **2026-10-19:** #490 מוזג ל־`feat/ai-intake`. על testing, טיוטת 50 שקלים עם `original_amount` מספרי נרשמה בלי מפתח ההמרה וה-commit הצליח. הבדיקה בוטלה בטרנזקציה.
- **2026-10-19:** [#493](https://github.com/yossi-weinberger/ten10/pull/493) מוזג ל־`feat/ai-intake`. שלוש קריאות Jev עוברות דרך Vercel AI Gateway. המודל נעול על `typesafe-ai/jev`, בלי מודל חלופי. המפתח הוא secret של Edge על testing, והפונקציות נפרסו לשם.
- **2026-10-19:** [#495](https://github.com/yossi-weinberger/ten10/pull/495) מוזג ל־`feat/ai-intake`. כפתור קבלה שולח תמונה ל-`anthropic/claude-haiku-4.5` דרך Gateway. הטיוטה היא הוצאה, והשמירה נשארת בלחיצה. הקובץ לא נשמר. PDF והקלטה עדיין לא.
- **2026-10-19:** [#497](https://github.com/yossi-weinberger/ten10/pull/497) מוזג ל־`feat/ai-intake`. קריאת הקבלה עברה ל-`anthropic/claude-sonnet-5`, שנעול ובלי מודל חלופי, כדי לקרוא עברית ואנגלית. נוסף PDF. השם נשאר בשפה שכתובה על הקבלה. הקלטה עדיין לא.
- **2026-10-19:** [#499](https://github.com/yossi-weinberger/ten10/pull/499) מוזג ל־`feat/ai-intake`. כפתור "דבר" מתמלל עד דקה עם `microsoft/mai-transcribe-2`. המשפט נכנס למסלול הטקסט. ההקלטה לא נשמרת, והשמירה נשארת בלחיצה. המיקום מאפשר מיקרופון לאתר עצמו.
- **2026-10-19:** [#501](https://github.com/yossi-weinberger/ten10/pull/501) מוזג ל־`feat/ai-intake`. נוסף משתמש בדיקות ל-allowlist של קריאות ה-AI על testing, ונוסף לדגל `ai_intake_web`. המזהה בקוד, בלי כתובת מייל.
- **2026-10-19:** [#503](https://github.com/yossi-weinberger/ten10/pull/503) מוזג ל־`feat/ai-intake`. לוגים של פונקציות ה-AI עברו ל-`_shared/logger.ts`. חריגת ה-Preview של CORS עברה ל-`getCorsHeaders`, פעם אחת.
- **2026-10-19:** קבלה לא נשמרת יותר כהוצאה בלי שאלה. לפני הטיוטה נשאל "איזו תנועה זו?", אלא אם כלל קדימה כבר קבע סוג. בכרטיס אפשר לתקן גם את התאריך. `user_edited` נשאר על תיאור וסכום.
- **2026-10-19:** כשל של קריאת קבלה, תמלול או בחירת כוונה מוצג למשתמש. "כל הוצאה על גן היא הוצאה מוכרת" נשמר על "גן". תיאור באנגלית יורד מפקודה ומסכום, ומספר חשוף לא נשמר כתיאור. "donated" הוא תרומה. "how much" עם שנה נשאר שאלה. סגירת המגירה עוצרת הקלטה. תקרת גודל הקבלה זהה בלקוח ובשרת.
- **2026-10-19:** «כמה תרמתי ב-2025?» נשאר שאלה. תאריך לפני 2000 נחסם כמו בטופס. סגירת המגירה זורקת טיוטה שלא נשמרה.
- **2026-10-19:** סיווג הכוונה מתחיל ב-Jev, שאלת Choice אחת. אם הוא לא עונה, הכללים רצים פעם אחת ורק פועל מפורש פותח תנועה. סף הוודאות לא הופעל עד כיול.
- **2026-10-19:** «קניתי מאפים ב-15 ש״ח» נשמר כ«מאפים». גרשיים עבריים, מרכאות ו-`שח` יורדים מהתיאור.
- **2026-10-19:** סף הוודאות לכוונה הוא 0.7. בכיול, הכלל בעברית קיבל 0.71 והשאר היו גבוהים יותר. מתחת לסף נשאל המשתמש.
- **2026-10-19:** «כמה תרמתי ב-2025?» מחזיר את סכום התנועות שנשמרו באותה שנה. המודל לא מחשב את המספר. שאלה בלי שנה וסוג נשארת בלי מספר.
- **2026-10-19:** «כמה תרמתי השנה» ו«החודש» משתמשים בתאריך המקומי. המספר עדיין מגיע מהתנועות שנשמרו.
- **2026-10-19:** «יש כפילויות?» מציג זוגות של תנועות שנשמרו: אותו סוג, אותו מטבע, שלושה ימים, וסכום בטווח 2%. לא נמחק כלום, ואין עדיין Jev על הסריקה.
- **2026-10-19:** «כמה תרומות» ו־«how many» סופרים תנועות שנשמרו. «כמה תרמתי» נשאר סכום. «ב-3 חודשים אחרונים» הוא חלון לאחור מהיום, עד 24 חודשים.
- **2026-10-19:** סריקת הכפילויות קוראת כל עמוד של תנועות שנשמרו. עמוד מלא אחרון נחשב כישלון, לא «לא נמצאו». הזוגות החדשים מוצגים קודם.
- **2026-10-19:** בלי פועל מוכר השאלה נשארת סכום. «החודשים» לא נתפס כ«החודש». חלון של N חודשים נגמר היום ומתחיל יום אחרי התאריך שלפני N חודשים, בלי גלישה בסוף חודש. «ממוצע» מחלק את הסכום שנשמר במספר החודשים.
- **2026-10-19:** «הכי גדול» ו-«largest» מחזירים את הסכום הגבוה ביותר שנשמר בחלון. אין שורות: נאמר שלא נמצאו תנועות.
- **2026-10-19:** «באשראי» ו-«cash» מסננים את השאלה לאמצעי תשלום אחד מהרשימה הסגורה. שני אמצעים באותו משפט לא נענים.
- **2026-10-19:** «מעשר» לא נספר כעשר, «השנה שעברה» היא השנה הקודמת, ו«ביטוח» לא נסנן לביט. ממוצע של השנה הנוכחית מחלק בחודשים שכבר עברו.
- **2026-10-20:** «על אוכל» מסנן לקטגוריה של המשתמש. בלי התאמה נשאל אם לחפש בתיאור. הסכום וזוגות הכפילויות נקראים ב-SQL על testing.
- **2026-10-20:** «על מזון» ו«על אוכל» הם הקטגוריה `food`. «השנה?» ו־"in 2025" לא נשארים בתוך שם הקטגוריה.
- **2026-10-20:** «לישיבה» מסנן נמען בתרומה. «שנת המעשר» היא השנה העברית. «מ-1.1.2025 עד 31.3.2025» הוא טווח סגור.
- **2026-10-20:** טווח לא תקין לא נופל לשנה. נמען עם רווח נשמר שלם. «לעניים» ו«לפי» אינם נמענים. «שנת המעשר הקודמת» היא השנה העברית הקודמת.
- **2026-10-20:** «לא כפול» נשמר ב-duplicate_dismissals והזוג לא חוזר. מחיקת תנועה אחת דורשת לחיצה שנייה. אין Jev על הסריקה.
- **2026-10-20:** "food from" לא בולע את from. «מינואר עד מרץ» הוא טווח. שני נמענים לא נענים. «פינת חי» הוא נמען. חב"ד וחבד נספרים יחד. «בשנת המעשר 2025» לא נענית.
- **2026-10-20:** «לכולל» חוזר להיות נמען. «ב־3» לא נדבק לשם. «במרץ 2025» הוא מרץ. «5786» היא שנת המעשר הזו. אישור מחיקה לא יושב על אותו כפתור, והטבלה מתרעננת.
- **2026-10-20:** קריאות AI ב-Edge דולקות רק כש־`AI_INTAKE_ENABLED` הוא `true`. בלי זה, או עם כל ערך אחר, חמש הפונקציות מחזירות unavailable לפני allowlist ולפני ספק. הערך מוגדר רק ב-secrets של testing.
- **2026-10-20:** צ'קליסט ל־PR ל־main: חותמות זמן חדשות לכל מיגרציות ה־AI, אחרי המיגרציה האחרונה ב־main, כולל rollback ו־repair על testing. בלי `--include-all`.
- **2026-10-20:** «בטל שמירת AI» בטבלת התנועות פותח את דיאלוג האישור הקיים לפני המחיקה.
- **2026-10-20:** הוחלט שעיגול השער ל־4 ספרות ב־`applyConversion` נשאר, גם בהקלדה ידנית. 1000 × 3.71236 הוא שער 3.7124 וסכום 3712.40. זה שינוי מכוון מול הטופס הקודם. סיווג הכוונה נשאר Jev ראשון, ושכבת המילים רק גיבוי כשאין תשובה.
- **2026-10-20:** סט של 68 משפטים מול Jev: 64 תוויות נכונות. מ־0.7 ומעלה, 57 מתוך 57 היו נכונות. ארבע הטעויות היו 0.39 ומטה. שבע תשובות נכונות ישבו בין 0.43 ל־0.63, קרוב מדי לטעויות, ולכן הסף נשאר 0.7. הוודאות נשמרת ב־`quality_signals.intent_confidence`.
- **2026-10-21:** זוגות שנשמרו משתמשים באותו טווח 2% מסודר כמו אזהרת השמירה. תמונת קבלה מעל התקרה מוקטנת ל־2000 פיקסלים. PDF לא מוקטן.
- **2026-10-21:** «השנה» ו«החודש» הולכים לפי הלוח הראשי. בלוח עברי הם השנה והחודש העבריים, כולל אדר ב'. «ב־2025» נשארת לועזית, ו«שנת המעשר» לא משתנה.
- **2026-10-21:** כותרת «ב־2025» נשארת 2025 גם בלוח עברי. חודש עברי מוצג בשמו. סכום אפס לא משאיר רווח לפני הנקודה, וספירה של תרומה אחת או כמה תרומות מנוסחת לפי המספר.
- **2026-10-21:** בעברית, שתי תנועות משתמשות בצורת הזוגי. באנגלית שנה עברית נשארת 5787. «בחשוון» ו«בתשפ״ז» בלי מקף. סכום מוצג עם ₪, גם כשהוא אפס. חודש לועזי מוצג בשמו.
- **2026-10-21:** 150 משפטי הכיול הורצו מול Jev. «האם אתה יכול» נשאר שאלה על היכולת, לא הפעולה עצמה. 145 תוויות נכונות. מ־0.7 ומעלה, 138 מתוך 138 היו נכונות. הסף נשאר 0.7.
- **2026-10-21:** «אתה יכול» ו-"can you" מציגים עזרה גם כש־Jev בטוח פחות מ־0.7. לא נפתחת טיוטה. «תמצא כפילויות» נשאר חיפוש. כשאין תשובה ברורה, השאלה מופיעה מתחת לתיבה.
- **2026-10-21:** Jev נשאר ראשון. «can you» עם סכום או שנה, כש־Jev בטוח, נשאר תנועה או שאלה. עזרה רק כשאין סכום ואין שנה והמודל לא בטוח. «תוכל» ו«אתה יכול?» כלולים.
- **2026-10-21:** בשאלת נתונים Jev בוחר משפחה, מדד, נמען, קטגוריה ואמצעי תשלום מרשימה סגורה. מתחת ל-0.7 הבחירה לא נספרת, ובלי משפחה נשאל המשתמש. התאריכים נשארים במפענח והמספר ב-SQL. בלי תשובה מ-Jev נשאר המפענח הקיים.
- **2026-10-21:** נמען או קטגוריה שלא שמורים לא נבלעים בסיכום הכולל. אם המשפט מציין שם ו-Jev לא מצא אותו ברשימה, נשאל «לא מצאתי». קטגוריה לא חלה על תרומה. כפתורי הסוג באנגלית מתחילים באות גדולה.
- **2026-10-21:** 120 משפטי חריצים הורצו מול Jev. לפני חידוד ההנחיות 86 היו נכונים ו־14 שגויים מעל 0.7. אחרי החידוד 95 נכונים ו־6 שגויים מעל 0.7. הסף נשאר 0.7. לא נוספו מילים למפענח.
- **2026-10-21:** #545 מוזג ל־`feat/ai-intake`. קבלה שעברה בדיקת כותרת נשמרת ב־`intake-artifacts` וב־`ai.source_artifacts` ל־30 יום, לפני הקריאה למודל. קובץ שהבתים שלו לא תואמים לסוג נדחה בלי שמירה ובלי מודל. הטיוטה והתצוגה לא משתנות. לא ל־`main`.
- **2026-10-21:** תיקוני QA ל־#546, עדיין לא מוזג: קובץ שלא תואם מציג «לא הצלחתי לקרוא». הרישום רק ל-service role ולמשתמשי הניסוי. קבלה שנמחקה לא חוסמת העלאה מחדש. מחיקה יומית ב-04:30 UTC. מדיניות הפרטיות והתנאים, בעברית ובאנגלית, מציינים שמירה ל-30 יום. לא ל־`main`.
- **2026-10-21:** בדיקת יישור ה-allowlist עברה ל־`scripts`, כי `src` לא כולל טיפוסי Node. לא ל־`main`.
- **2026-10-21:** על testing בלבד הוחלו `20261021120000` ו־`20261021133000`, והחותמות יושרו לשמות הקבצים. `ai-read-receipt` ו־`ai-purge-receipts` הועלו ב-CLI לפרויקט `bbcllewcotypedqsnwmi`. ארבעת ה-cron הישנים נשארו כבויים. נוסף cron אחד, `ai-purge-expired-receipts`, ב-04:30 UTC, וה-Vault מצביע על testing. לא לייצור.
- **2026-10-21:** #546 מוזג ל־`feat/ai-intake`. שמירת קבלה מקשרת את התנועה ל־`source_artifact_id`. המשתמש לא רואה את הקובץ. לא ל־`main`.
- **2026-10-21:** [#547](https://github.com/yossi-weinberger/ten10/pull/547) נפתח מול `feat/ai-intake`. על testing הוחלה `20261021170000` והחותמת יושרה. `ai-read-receipt` הועלתה שוב ב-CLI. לא ל־`main`.
- **2026-10-21:** #547 מוזג ל־`feat/ai-intake`. לחיצה על אייקון ה-AI פותחת קישור חתום ל-5 דקות, רק לבעל התנועה. תנועה בלי קובץ אומרת שאין מקור. לא ל־`main`.
- **2026-10-21:** [#548](https://github.com/yossi-weinberger/ten10/pull/548) נפתח מול `feat/ai-intake`. על testing הוחלה `20261021180000` והחותמת יושרה. `ai-receipt-url` הועלתה ב-CLI. לא ל־`main`.
- **2026-10-21:** בדיקת כתובת הקבלה לא טוענת את לקוח Supabase, כדי שה-Vitest לא ייפול בלי `VITE_SUPABASE_URL`. לא ל־`main`.
- **2026-10-21:** עוזר, מגירה וכללים נפתחים רק ב-Web למשתמש מחובר. קריאות AI לא יוצאות כשהפלטפורמה אינה web. סעיף הקבלות במדיניות הפרטיות מסומן «ווב». לא ל־`main`.
- **2026-10-21:** בטיוטת הקבלה יש «הצג את הקבלה». אותו קישור של 5 דקות, לפי מזהה הקובץ, לפני השמירה. לא ל־`main`.
- **2026-10-21:** על testing הוחלה `20261021190000` והחותמת יושרה. `ai-receipt-url` הועלתה שוב ב-CLI. לא ל־`main`.
- **2026-10-21:** מזהה קובץ הקבלה נשמר ב-state, כדי שלא ייקרא ref בזמן הרינדור. לא ל־`main`.
- **2026-10-21:** #548 מוזג ל־`feat/ai-intake`. שיתוף קובץ קבלה נשמר ב-IndexedDB ורק אז נפתחת המגירה ב-Web למשתמש מחובר. דסקטופ בלי Service Worker. לא ל־`main`.
