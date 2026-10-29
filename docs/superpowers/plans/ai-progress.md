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
| 78 | Share Target לקובץ קבלה | UI, Web בלבד | §8.1 | מוזג ל־`feat/ai-intake` | [#549](https://github.com/yossi-weinberger/ten10/pull/549) |
| 79 | Share Target לטקסט | UI, Web בלבד | §8.1 | מוזג ל־`feat/ai-intake` | [#550](https://github.com/yossi-weinberger/ten10/pull/550) |
| 80 | Share Target ב־TWA | Android | §8.1 | מוזג ל־`feat/ai-intake` | [#555](https://github.com/yossi-weinberger/ten10/pull/555) |
| 81 | תווית עברית לקטגוריה ב־Jev | Edge | §9.9 | מוזג ל־`feat/ai-intake` | [#551](https://github.com/yossi-weinberger/ten10/pull/551) |
| 82 | תשובה שמציגה את מה שהובן | UI | §9.9 | מוזג ל־`feat/ai-intake` | [#552](https://github.com/yossi-weinberger/ten10/pull/552) |
| 83 | רשימות חריצים בתוך קובץ ה־eval | Edge | §9.9 | מוזג ל־`feat/ai-intake` | [#554](https://github.com/yossi-weinberger/ten10/pull/554) |
| 84 | minSdk 24 ל־TWA | Android | §8.1 | מוזג ל־`feat/ai-intake` | [#558](https://github.com/yossi-weinberger/ten10/pull/558) |
| 85 | Share Target רק ב־Preview | UI, Web בלבד | §8.1 | מוזג ל־`feat/ai-intake` | [#560](https://github.com/yossi-weinberger/ten10/pull/560) |
| 86 | פתיחת קבלה ב־Safari | UI, Web בלבד | §4.6 | מוזג ל־`feat/ai-intake` | [#561](https://github.com/yossi-weinberger/ten10/pull/561) |
| 87 | קבלה בתפריט רק כשהיא זמינה | DB על testing + UI | §4.6 | מוזג ל־`feat/ai-intake` | [#562](https://github.com/yossi-weinberger/ten10/pull/562) |
| 88 | מדידת holdout לחריצי השאלה | Edge | §9.9 | מוזג ל־`feat/ai-intake` | [#569](https://github.com/yossi-weinberger/ten10/pull/569) |
| 89 | הוראת קבע וודאות החריצים | DB על testing + Edge | §9.9 | מוזג ל־`feat/ai-intake` | [#570](https://github.com/yossi-weinberger/ten10/pull/570) |
| 90 | מפתח שמירה יציב לטיוטה | UI, Web בלבד | §4.1 | מוזג ל־`feat/ai-intake` | [#571](https://github.com/yossi-weinberger/ten10/pull/571) |
| 91 | תוצאת שאלת נתונים | DB על testing + Edge + UI | §9.9 | מוזג ל־`feat/ai-intake` | [#572](https://github.com/yossi-weinberger/ten10/pull/572) |
| 92 | allowlist אחד ב־SQL | DB על testing | §22.1 | מוזג ל־`feat/ai-intake` | [#573](https://github.com/yossi-weinberger/ten10/pull/573) |
| 93 | תוכנית: לוגיקה מחוץ למגירה | תיעוד | §9 | מוזג ל־`feat/ai-intake` | [#574](https://github.com/yossi-weinberger/ten10/pull/574) |
| 94 | מפתח אחרי אותו אירוע, ותשובה בסגירה | UI, Web בלבד | §4.1, §9.9 | מוזג | [#575](https://github.com/yossi-weinberger/ten10/pull/575) |
| 95 | טאב AI באדמין | DB על testing + Edge + UI | §16 | מוזג ל־`feat/ai-intake`; 4 בדיקות ידניות ב־Preview פתוחות | [#576](https://github.com/yossi-weinberger/ten10/pull/576) |
| 96 | ניקוי ייבוא, קבועים משותפים, קבלה רק לעמוד | DB + בדיקה, בלי שינוי התנהגות | — | מוזג ל־`feat/ai-intake`, ורץ על testing | [#590](https://github.com/yossi-weinberger/ten10/pull/590) |
| 97 | תוכניות: הוראת קבע, מדידה ומכסות, כמה תנועות | תיעוד, לאישור | — | מוזג ל־`feat/ai-intake` | [#591](https://github.com/yossi-weinberger/ten10/pull/591) |
| 98 | החלטות על שלוש התוכניות | תיעוד | #591 | מוזג ל־`feat/ai-intake` | [#593](https://github.com/yossi-weinberger/ten10/pull/593) |
| R2 | `2026-10-28-ai-recurring.md` | מודול טהור, בלי UI | — | מוזג ל־`feat/ai-intake` | [#595](https://github.com/yossi-weinberger/ten10/pull/595) |
| U1 | `2026-10-28-ai-usage-and-plans.md` | DB על testing + Edge על testing | — | מוזג ל־`feat/ai-intake` | [#594](https://github.com/yossi-weinberger/ten10/pull/594) |
| RCP | נמען בתרומה | מודול טהור, בלי חיבור | — | מוזג ל־`feat/ai-intake` | [#597](https://github.com/yossi-weinberger/ten10/pull/597) |
| U2 | `2026-10-28-ai-usage-and-plans.md` | DB על testing + Edge על testing + UI | U1 | מוזג ל־`feat/ai-intake` | [#599](https://github.com/yossi-weinberger/ten10/pull/599) |
| NW | מספרים במילים | מודול טהור, בלי חיבור | — | מוזג ל־`feat/ai-intake` | [#601](https://github.com/yossi-weinberger/ten10/pull/601) |
| U3 | `2026-10-28-ai-usage-and-plans.md` | DB על testing + Edge על testing, בלי הודעות בממשק | U2 | מוזג ל־`feat/ai-intake` | [#602](https://github.com/yossi-weinberger/ten10/pull/602) |
| M5 | `2026-10-28-ai-multi-item.md` | UI, ייבוא בלבד | — | מוזג ל־`feat/ai-intake` | [#598](https://github.com/yossi-weinberger/ten10/pull/598) |
| VOICE | תיקון הקלטת קול | UI, Web בלבד | — | מוזג ל־`feat/ai-intake` | [#600](https://github.com/yossi-weinberger/ten10/pull/600) |
| M1 | 2026-10-28-ai-multi-item.md | Edge + UI, בלי חילוץ | — | מוזג ל־`feat/ai-intake` | [#596](https://github.com/yossi-weinberger/ten10/pull/596) |
| R1 | `2026-10-28-ai-recurring.md` | כוונה + מגירה, בלי כרטיס | M1 | מוזג | [#603](https://github.com/yossi-weinberger/ten10/pull/603) |
| R3 | `2026-10-28-ai-recurring.md` | כרטיס, עריכה, שמירה בלחיצה | R1 | מוזג | [#604](https://github.com/yossi-weinberger/ten10/pull/604) |
| R4 | `2026-10-28-ai-recurring.md` | ביטול אחרי שמירה, ועמודת origin | R3 | מוזג | [#605](https://github.com/yossi-weinberger/ten10/pull/605) |
| R3b | `2026-10-28-ai-recurring.md` | כרטיס סיכום, חודשי בלבד | R4 | מוזג | [#606](https://github.com/yossi-weinberger/ten10/pull/606) |
| M3 | `2026-10-28-ai-multi-item.md` | כמה פריטים בהודעה אחת, בלי UI | R4 | מוזג | [#607](https://github.com/yossi-weinberger/ten10/pull/607) |
| M6 | `2026-10-28-ai-multi-item.md` | kind בקבלה, בלי חילוץ מערך | — | מוזג | [#608](https://github.com/yossi-weinberger/ten10/pull/608) |
| M2a | `2026-10-28-ai-multi-item.md` | עיגון ותאריך, בלי Edge ובלי סט | M3 | מוזג | [#609](https://github.com/yossi-weinberger/ten10/pull/609) |
| M2b | `2026-10-28-ai-multi-item.md` | קריאת תשובת הפיצול, בלי מודל | M2a | נפתח | |
| UI-1 | `2026-10-22-ai-ui-redesign.md` | בדיקות אפיון לעוזר, בלי שינוי בקוד מוצר | — | מוזג ל־`feat/ai-intake` | [#564](https://github.com/yossi-weinberger/ten10/pull/564) |
| UI-2 | אותו קובץ | רכיבי AI Elements ל־Tailwind 3, לא בשימוש | UI-1 | מוזג ל־`feat/ai-intake` | [#565](https://github.com/yossi-weinberger/ten10/pull/565) |
| UI-3 | אותו קובץ | צ'אט: מיכל, שורת כתיבה, היסטוריה, טיוטה, גלריה | UI-2 | מוזג ל־`feat/ai-intake` | [#566](https://github.com/yossi-weinberger/ten10/pull/566) |
| UI-4 | אותו קובץ | כרטיסי נתונים, כפילויות, כלל, הלכה | UI-3 | מוזג ל־`feat/ai-intake` | [#567](https://github.com/yossi-weinberger/ten10/pull/567) |
| UI-5 | אותו קובץ | תנועה ורגעי wow | UI-4 | מוזג ל־`feat/ai-intake` | [#568](https://github.com/yossi-weinberger/ten10/pull/568) |
| UI-6 | אותו קובץ | QA, Playwright ותיעוד | UI-5 | לא התחיל | `feat/ai-ui6-qa-docs` |

**צורת העבודה (מ־28/10/2026):**
- **שלב הוא PR קטן.** ענף `feat/ai-<קוד>-<תיאור>` מהגרסה העדכנית של `feat/ai-intake`, ו־base תמיד `feat/ai-intake`. לא ממזגים ל־`main` עד הודעה. ממזגים מ־`main` לענף מדי פעם.
- **גוף ה־PR:** מה השתנה, תוכנית בדיקה עם תיבות, ו־«Applied on testing» כשיש DB או Edge.
- **היומן:** מתעדכן באותו PR של הקוד. «מוזג» נכתב ב־PR הבא, או ב־commit קטן מיד אחרי המיזוג.
- **מיזוג רק כש־CI ירוק.** אחרי כל מיזוג, PRs פתוחים מתעדכנים מ־`feat/ai-intake`.
- **migration אחד פתוח בכל רגע.** מוחל ידנית על testing (`bbcllewcotypedqsnwmi`), החותמת מיושרת לשם הקובץ, ויש rollback. ה־PR הבא עם migration נפתח רק אחרי שהקודם מוזג.
- **PR אחד בכל רגע במגירה:** `AssistantDrawer.tsx`, `assistant-reply-view.ts`, `ReplyBlockView.tsx`, `blocks/*`.
- **PR אחד בכל רגע בכוונה ובכיול:** `intent.ts`, `jev-intent.ts`, `phrase-aliases.ts`, וסטי ה־eval.
- **מודולים טהורים** רצים במקביל לכל השאר. לוגיקה חדשה נכתבת ב־`supabase/functions/_shared/ai/`, והמגירה רק קוראת לה.
- **מסלולים:** א (כוונה ומגירה, בטור): M1, R1, R3, M4. ב (טהור, במקביל): R2, והחלקים הטהורים של M2. ג (DB ו־Edge, בטור): U1, U2, U3, R4, M3, M2. M5 ו־M6 נכנסים כשהמסלול שלהם פנוי.
- **כללים קבועים:**
  - אין שמירה אוטומטית של הוראת קבע או של כמה פריטים.
  - את משפטי ה־eval יוסי מספק. כשחסר סט, עוצרים ומבקשים.
  - **כיול:** אף תווית לא יורדת, וכל תשובה בוודאות 0.7 ומעלה נכונה. אם ודאות גבוהה טועה, מתקנים את הקריטריון ולא את הסף.
  - **Edge חדש:** קודם `isAiIntakeEnabled()`, אחר כך JWT, ואחר כך `isTrialUser`, ורק אז ספק.
  - **לוגים:** בלי תוכן, סכומים או נתיבים, ורק דרך `_shared/logger.ts`.

**ענף אינטגרציה:** כל ה־PRs של ה־AI מכוונים ל־`feat/ai-intake` (CI רץ גם עליו). הוא ממוזג ל־`main` רק כשיכולת שלמה עובדת. תיקונים שאינם AI הולכים ישר ל־`main`.

**סדר מומלץ:**
1. PR 2a ואחריו PR 2b, מול `feat/ai-intake`. במקביל: המשימות שאינן קוד, וה־eval harness (PR 3) offline על הקבלות.
2. מסלול DB, אחד אחד כי ענף ה־testing משותף: PR 1c (או בתוך PR 4), ו־PR 1b כשמדיניות המחיקה הוחלטה. לבדוק אם אינטגרציית ה־Preview של Supabase מריצה migrations גם ל־PRs שמכוונים ל־`feat/ai-intake`.
3. כשממזגים את `feat/ai-intake` ל־`main` עם שינוי ב־`_shared`: בשעה רחוקה מה־crons, כי כל פונקציות ה־Edge נפרסות.

## צ'קליסט: PR ל־main

`20261019195400_decouple_reminders_from_marketing_consent.sql` כבר רץ בפרודקשן ב־19/10 21:02. 15 מיגרציות AI, מ־`20261019020000` עד `20261019190000`, מתוארכות לפניו. `supabase db push --linked --yes` בלי `--include-all` ייכשל עליהן. לא משנים את ה־workflow ל־`--include-all`.

רק בתוך ה־PR ש־base שלו הוא `main`:

- [ ] לשנות את חותמת הזמן של **כל** מיגרציות ה־AI (`supabase/migrations/*_ai_*.sql`) לתאריכים אחרי המיגרציה האחרונה ב־`main` באותו רגע, באותו סדר.
- [ ] לפני פריסת שש פונקציות ה־AI שקוראות ל־`consume_ai_usage` / `consume_ai_call`: להריץ את `20261029090000_ai_usage_limits.sql`. בדיקת המכסה נכשלת סגור — בלי הטבלאות כל קריאת AI נחסמת.
- [ ] לפני המיזוג: אישור לניסוח הפרטיות והתנאים. הם עולים לפרודקשן גם כשה־AI כבוי.
- [ ] לפני ההשקה: להחליף את גוף `ai.is_trial_user` ואת `trial-users.ts`.
- [ ] לפני ההשקה: לפרט במדיניות הפרטיות את ספקי ה־AI.
- [ ] `get_admin_dashboard_stats`: אם `main` שינה אותה אחרי `20260902120000_admin_dashboard_stats_one_scan.sql`, למזג את השינוי לתוך `*_ai_admin_usage.sql` (ואת הגרסה של `main` ל־rollback שלו), ולא לדרוס. ה־migration של ה־AI מקבל timestamp מאוחר יותר ורץ אחרי.
- [ ] לעדכן את קבצי ה־rollback המקבילים: `20261019020000_ai_schema_foundation_down.sql`, `20261020140000_ai_question_recipient_down.sql`, `20261020150000_ai_duplicate_actions_down.sql`.
- [ ] על testing בלבד: `supabase migration list`, ואז `supabase migration repair` כך שההיסטוריה תתאים לשמות החדשים.
- [ ] Supabase Preview על ה־PR ל־`main` עובר.
- [ ] למזג בשעה רחוקה מה־crons: לא ב־00:00, 07:00, 18:00 או 19:00 UTC.
- [ ] בהשקה: להגדיר `VITE_AI_SHARE_TARGET=true` ב־Production של Vercel. עד אז רק Preview.

## משימות בלי קוד (להתחיל עכשיו, לוקחות זמן קלנדרי)

- [ ] אימות עסק (Business Verification) מול Meta
- [x] מספר ל־WhatsApp: `055-289-3733` (`+972552893733`), קו שנרכש ב־019. WhatsApp Business פתוח עליו. משמש להעלאת סטטוסים, ובהמשך לבוט ה־AI בשלב 7. הרישום ב־Cloud API עדיין לא בוצע (§8.3).
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

- **הוחלט, 22/10/2026.** קו WhatsApp אחד: `055-289-3733`, שנרכש ב־019, ו־WhatsApp Business פתוח עליו. הוא להעלאת סטטוסים עכשיו, ואותו מספר יהיה בוט ה־AI בשלב 7. אימות העסק מול Meta והרישום ב־Cloud API עדיין פתוחים.
- **הוחלט, 22/10/2026.** שיתוף טקסט וקובץ ב־PWA מותקן על טלפון אמיתי מספיק לסגירת שלב 5 בצד ה־Web. ההגנה ב־Vercel הודלקה מחדש. בניית ה־TWA והשחרור ב־Play נדחים; האפליקציה בחנות תטופל בנפרד.

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
- **2026-10-21:** [#547](https://github.com/yossi-weinberger/ten10/pull/547) מוזג ל־`feat/ai-intake`. על testing הוחלה `20261021170000` והחותמת יושרה. `ai-read-receipt` הועלתה שוב ב-CLI. שמירת התנועה מקשרת את הקבלה. לא ל־`main`.
- **2026-10-21:** [#548](https://github.com/yossi-weinberger/ten10/pull/548) נפתח מול `feat/ai-intake`. על testing הוחלה `20261021180000` והחותמת יושרה. `ai-receipt-url` הועלתה ב-CLI. לא ל־`main`.
- **2026-10-21:** בדיקת כתובת הקבלה לא טוענת את לקוח Supabase, כדי שה-Vitest לא ייפול בלי `VITE_SUPABASE_URL`. לא ל־`main`.
- **2026-10-21:** עוזר, מגירה וכללים נפתחים רק ב-Web למשתמש מחובר. קריאות AI לא יוצאות כשהפלטפורמה אינה web. סעיף הקבלות במדיניות הפרטיות מסומן «ווב». לא ל־`main`.
- **2026-10-21:** בטיוטת הקבלה יש «הצג את הקבלה». אותו קישור של 5 דקות, לפי מזהה הקובץ, לפני השמירה. לא ל־`main`.
- **2026-10-21:** על testing הוחלה `20261021190000` והחותמת יושרה. `ai-receipt-url` הועלתה שוב ב-CLI. לא ל־`main`.
- **2026-10-21:** מזהה קובץ הקבלה נשמר ב-state, כדי שלא ייקרא ref בזמן הרינדור. לא ל־`main`.
- **2026-10-21:** #548 מוזג ל־`feat/ai-intake`. שיתוף קובץ קבלה נשמר ב-IndexedDB ורק אז נפתחת המגירה ב-Web למשתמש מחובר. דסקטופ בלי Service Worker. לא ל־`main`.
- **2026-10-21:** קובץ משותף נמסר למגירה בלי setState מתוך useEffect. לא ל־`main`.
- **2026-10-21:** #549 מוזג ל־`feat/ai-intake`. שיתוף טקסט, כותרת או כתובת נפתח במגירה כהודעה. קובץ נשאר קבלה. לא ל־`main`.
- **2026-10-22:** קישור שכבר נמצא בטקסט המשותף לא מתווסף שוב מהשדה url. לא ל־`main`.
- **2026-10-22:** #550 מוזג ל־`feat/ai-intake`. [#555](https://github.com/yossi-weinberger/ten10/pull/555) נפתח מול `feat/ai-intake`. שני קבצי ה־TWA מצהירים על יעד השיתוף של האתר. לא ל־`main`. בניית Bubblewrap והשחרור ב־Play עדיין לפי המדריך.
- **2026-10-22:** [#551](https://github.com/yossi-weinberger/ten10/pull/551) נפתח מול `feat/ai-intake`. קטגוריה מוגדרת מראש נשלחת ל־Jev עם התווית בעברית ובאנגלית. קטגוריה שהמשתמש יצר נשארת כמו שהיא. «other» נשאר קטגוריה, לא אמצעי תשלום. לא ל־`main`.
- **2026-10-22:** הקריטריון של קטגוריית «אחר» כולל את המילה בעברית, ונשאר נפרד מאמצעי התשלום. לא ל־`main`.
- **2026-10-22:** `ai-read-question` הועלתה ב-CLI לפרויקט testing `bbcllewcotypedqsnwmi`. לא לייצור.
- **2026-10-22:** [#552](https://github.com/yossi-weinberger/ten10/pull/552) נפתח מול `feat/ai-intake`. תשובת השאלה מציגה נמען בתוך המשפט, קטגוריה לפי התווית שלה, ואמצעי תשלום כמו קודם. גם בזוגי וגם כשאין תנועות. לא ל־`main`.
- **2026-10-22:** [#553](https://github.com/yossi-weinberger/ten10/pull/553) נפתח מול `feat/ai-intake`. צ'קליסט המיזוג ל־`main` בלי מספר קבצים. לפני המיזוג נדרש אישור לניסוח הפרטיות והתנאים. לפני ההשקה: allowlist במקום הרשימה הקשיחה, ופירוט ספקי ה־AI במדיניות. לא ל־`main`.
- **2026-10-22:** [#554](https://github.com/yossi-weinberger/ten10/pull/554) נפתח מול `feat/ai-intake`. רשימות הנמענים והקטגוריות של סט ה־inbox עברו לתוך הקובץ. הריצה קוראת אותן משם. סט ה־holdout מחכה למשפטים, וההנחיות לא כוונו לפיו. לא ל־`main`.
- **2026-10-22:** #555 מוזג ל־`feat/ai-intake`. בניית Bubblewrap לא הורצה: אין `android.keystore` ואין את ה־CLI במדריך. לא ל־`main`.
- **2026-10-22:** נבחר מספר WhatsApp: `055-289-3733`, קו 019, ו־WhatsApp Business פתוח עליו. להעלאת סטטוסים, ובהמשך לבוט ה־AI. הערוץ לא נבנה. לא ל־`main`.
- **2026-10-22:** [#561](https://github.com/yossi-weinberger/ten10/pull/561) נפתח מול `feat/ai-intake`. פתיחת קבלה פותחת חלון ריק בלחיצה, ואז עוברת לקישור. אם הדפדפן חוסם, מוצג קישור ללחיצה. לא ל־`main`.
- **2026-10-22:** [#562](https://github.com/yossi-weinberger/ten10/pull/562) נפתח מול `feat/ai-intake`. הוחלט: קבלות נשמרות 30 יום ונמחקות. לא ארכיון. `expires_at` וה־purge נשארים. ארכיון ייבחן אחרי ההשקה, עם תמחור, ניסוח משפטי, ומחיקה עם התנועה ועם החשבון. «הצג קבלה» בתפריט השורה רק כש־`receipt_expires_at` בעתיד. על testing הוחלה `20261022210000` והחותמת יושרה. לא ל־`main`.
- **2026-10-22:** [#558](https://github.com/yossi-weinberger/ten10/pull/558) מוזג ל־`feat/ai-intake`. `minSdkVersion` של ה־TWA הוא 24. שיתוף טקסט וקובץ אושר ב־PWA מותקן על טלפון אמיתי. ההגנה ב־Vercel הודלקה מחדש. בניית ה־TWA והשחרור ב־Play נדחים. לא ל־`main`.
- **2026-10-22:** [#560](https://github.com/yossi-weinberger/ten10/pull/560) נפתח מול `feat/ai-intake`. Share Target נכנס למניפסט רק כש־`VITE_AI_SHARE_TARGET` הוא `true`. המשתנה הוגדר ל־Preview בלבד. בלי הדגל, או בלי משתמש מחובר, הרשומות נמחקות בטעינה. לא ל־`main`.
- **2026-10-22:** `minSdkVersion` עלה מ־21 ל־24. בבנייה הבאה ל־Play, Android 5 ו־6 לא ייתמכו. לא ל־`main`.
- **2026-10-22:** נכתבה תוכנית לעיצוב מחדש של העוזר: `docs/superpowers/plans/2026-10-22-ai-ui-redesign.md`. שישה PRs, UI-1 עד UI-6, מול `feat/ai-intake`. רק שכבת התצוגה משתנה: הלוגיקה, ה־Edge וה־DB לא זזים. נשארים על Tailwind 3, ורכיבי AI Elements של v4 מועתקים ומומרים. שדרוג ל־Tailwind 4 יהיה PR נפרד על `main` אחרי המיזוג. נמצא באג: אחרי «אשר ושמור» אפשר לשמור שוב. הצעד הבא: UI-1.
- **2026-10-22:** [#564](https://github.com/yossi-weinberger/ten10/pull/564) נפתח מול `feat/ai-intake`. 14 בדיקות אפיון למגירת העוזר, בלי שינוי בקוד המוצר. `npm test`: 948 עברו. לא ל־`main`. הצעד הבא: UI-2 אחרי המיזוג.
- **2026-10-22:** #564 מוזג ל־`feat/ai-intake`. לא ל־`main`. UI-2 מוסיף את רכיבי ה־AI של shadcn, מותאמים ל־Tailwind 3, בלי לדרוס רכיבים קיימים.
- **2026-10-22:** [#565](https://github.com/yossi-weinberger/ten10/pull/565) נפתח מול `feat/ai-intake`. רכיבי AI Elements ל־Tailwind 3, עדיין לא בשימוש במגירה. לא ל־`main`. הצעד הבא: UI-3 אחרי המיזוג.
- **2026-10-22:** #565 מוזג ל־`feat/ai-intake`. לא ל־`main`. העוזר נבנה מחדש כשיחה על רכיבי ה־AI, עם היסטוריה, נעילה אחרי שמירה, וגלריית `/dev/assistant`. בחירת Dialog מול Sheet נשארת ל־Preview.
- **2026-10-22:** [#566](https://github.com/yossi-weinberger/ten10/pull/566) נפתח מול `feat/ai-intake`. השיחה עצמה. לא ל־`main`. הצעד הבא: לבחור Dialog או Sheet על ה־Preview, ואז UI-4.
- **2026-10-22:** תיקון QA ב־[#566](https://github.com/yossi-weinberger/ten10/pull/566): סבב מהיר לא דורס הודעה קודמת, שאלת נתונים מראה «מחשב…» וחוסמת שליחה עד התשובה, טיוטה בלי שער לא כותבת «שער אין», כפתור הסגירה מתורגם, וכפתור «בטל» לא נמתח. לא ל־`main`. הצעד הבא: מיזוג כשה־CI ירוק, ואז UI-4.
- **2026-10-22:** #566 מוזג ל־`feat/ai-intake`. לא ל־`main`. UI-4 מעצב את תשובת הנתונים, סריקת הכפילויות, כרטיס הכלל וציטוט ההלכה, בלי שינוי ב־handlers.
- **2026-10-22:** [#567](https://github.com/yossi-weinberger/ten10/pull/567) נפתח מול `feat/ai-intake`. כרטיסי התשובות. לא ל־`main`. הצעד הבא: UI-5 אחרי המיזוג.
- **2026-10-22:** תיקון QA על המעטפת, ב־[#567](https://github.com/yossi-weinberger/ten10/pull/567): כפתור סגירה אחד בשורה עם «שיחה חדשה», חיווי המתנה מעל שורת הכתיבה, ו«בטל» ככפתור מתאר. לא ל־`main`.
- **2026-10-22:** תיקון QA ב־[#567](https://github.com/yossi-weinberger/ten10/pull/567): שאלת הלכה שמזוהה מקומית מוצגת גם כשהמסווג אומר «מחוץ לתחום», ה-X יושב בפינת `end` והכותרת מפנה לו מקום לפי כיוון השפה, אישור מחיקה כולל משפט, וסימן המטבע בטיוטה הוא ₪. לא ל־`main`.
- **2026-10-22:** #567 מוזג ל־`feat/ai-intake` אחרי QA עם שמירות אמיתיות. הצהובים נשארים: ציטוט הלכה כללי, אנגלית שלא זיהתה את השאלה, טיוטה שחוזרת אחרי ביטול כמתוכנן, ופוקוס צהוב על «שיחה חדשה». לא ל־`main`. UI-5 מוסיף תנועה שמספרת מה העוזר עושה.
- **2026-10-22:** [#568](https://github.com/yossi-weinberger/ten10/pull/568) נפתח מול `feat/ai-intake`. תנועה. לא ל־`main`. הצעד הבא: UI-6 אחרי המיזוג.
- **2026-10-22:** «תרמתי לצדקה 100» נשמר כתיאור «ל», כי `cleanDescription` ב־`text-draft.ts` מחק את «צדקה» מתוך «לצדקה». עכשיו אות היחס שלפני מילת הסוג נמחקת איתה, ואות יחס לבדה לא נשארת תיאור. במצב בלי תנועה המספר וה־₪ מופרדים ברווח. לא ל־`main`.
- **2026-10-23:** «קניתי, לחם 20» השאיר את «קניתי,» ואת «20» בתיאור. פסיק אחרי מילת סוג לא מונע את המחיקה, ומספר שעומד לבד יוצא מהתיאור. «קניתי לחם 20» נשמר כ«לחם». לא ל־`main`.
- **2026-10-23:** [#569](https://github.com/yossi-weinberger/ten10/pull/569) נפתח מול `feat/ai-intake`. מדידת holdout לחריצי השאלה, ריצה אחת, בלי שינוי בהנחיות. הגרסה של `question-slots.ts` היא `9339a3cd`. לא היו תשובות ריקות, ולא הייתה ריצה שנייה. לא ל־`main`.

| | inbox (#545) | holdout |
|---|---|---|
| משפטים | 120 | 60 |
| נכונים | 95 (79%) | 49 (82%) |
| חסרים (מתחת ל־0.7) | 25 | 11 |
| שגויים בוודאות (0.7 ומעלה) | 6 | 6 |

פירוק לפי שדה:

| שדה | נכונים | חסרים | שגויים בוודאות |
|---|---|---|---|
| family | 55 | 3 | 2 |
| measure | 58 | 2 | 0 |
| recipient | 60 | 0 | 0 |
| category | 56 | 0 | 4 |
| payment_method | 59 | 0 | 1 |

שורות שגויות בוודאות. התשובה הצפויה לא שונתה.

- `slot-hold-he-009` — «כמה פעמים נתתי לגמ״ח תרופות בחצי השנה האחרונה?». category: Jev בחר `תרופות` (0.77), צפוי `none`. טעות של המודל: מילה מתוך שם הנמען נבחרה גם כקטגוריה.
- `slot-hold-he-017` — «מה הכי יקר שהיה לי מאז סוכות?». family: Jev בחר `expense` (0.97), צפוי ריק. שנוי במחלוקת: «יקר» בלי שם של משפחה.
- `slot-hold-he-023` — «כמה שילמתי על חוג השנה?». category: Jev בחר `חוגים` (0.96), צפוי `none`. שנוי במחלוקת: יחיד מול שם הקטגוריה.
- `slot-hold-he-033` — «כמה שילמתי בהוראת קבע על חשבונות השנה?». category: Jev בחר `none` (0.74), צפוי `utilities`. שנוי במחלוקת: «חשבונות» מול התווית «שירותים». payment_method: Jev בחר `bank_transfer` (0.95), צפוי `none`. טעות של המודל: הוראת קבע אינה העברה בנקאית.
- `slot-hold-en-039` — «What was my largest business payment in 2024?». family: Jev בחר `expense` (1), צפוי `income`. שנוי במחלוקת: payment מול קטגוריית הכנסה.
- `slot-hold-en-049` — «How much did I spend on the pool this summer?». category: Jev בחר `מנוי לבריכה` (0.78), צפוי `none`. שנוי במחלוקת: מילה קרובה, לא השם עצמו.

התוצאה חלשה: 6 מתוך 60 שורות (10%) שגויות בוודאות, ויש שגיאה בוודאות בקטגוריה ובאמצעי תשלום. ההנחיות לא שונו. הצעה כללית, בלי ניסוח מהסט: קטגוריה שכבר כלולה בשם הנמען שנבחר לא נבחרת שוב אלא אם המשתמש מפריד ביניהן. אמצעי תשלום נבחר רק כשנאמר האמצעי עצמו, וחיוב קבוע אינו העברה. בלי מילה מפורשת של הכנסה, הוצאה או תרומה, המשפחה נשארת ריקה, ומילה קרובה לשם קטגוריה אינה בחירה. אחרי שינוי בהנחיות הסט הזה כבר נראה. למדידה הבאה צריך סט חדש.

- **2026-10-23:** תיקון התשובות הצפויות ב־holdout לפי כלל, לא לפי התוצאה, וחישוב מחדש על אותן תשובות של Jev. בלי ריצה נוספת. הכלל: צורה קרובה של שם קטגוריה שמורה (יחיד מול רבים, או חלק ברור מהשם) היא התאמה. מילות עלות מצביעות על הוצאה. התווית העברית של utilities היא «שירותים». עודכנו `he-017` ל־family `expense`, `he-023` ל־category `חוגים`, `he-033` ל־category `none`, `en-039` ל־family `expense`, `en-049` ל־category `מנוי לבריכה`. לא ל־`main`.

| | לפני הכלל | אחרי הכלל |
|---|---|---|
| נכונים | 49 (82%) | 53 (88%) |
| לא נכונים במלואם | 11 | 7 |
| שגויים בוודאות | 6 | 2 |

| שדה | נכונים | חסרים | שגויים בוודאות |
|---|---|---|---|
| payment_method | 59 | 0 | 1 |

נשארו שתי שגיאות בוודאות. `he-009`: הקטגוריה «תרופות» נבחרה מתוך שם הנמען. אין השפעה על התשובה, כי שאלה על תרומה מתעלמת מקטגוריה. `he-033`: «הוראת קבע» נבחרה כהעברה בנקאית. זה התיקון היחיד בהנחיות: «הוראת קבע» לבד היא `none`. לא מתקנים «קטגוריה בתוך שם הנמען», ולא «בלי מילה מפורשת המשפחה ריקה», ולא «מילה קרובה אינה בחירה». אין סט סינתטי חדש. המדידה הבאה היא שימוש אמיתי של משתמשי הבדיקה, עם `quality_signals.slot_confidence` לכל שדה.
- **2026-10-23:** [#570](https://github.com/yossi-weinberger/ten10/pull/570) נפתח מול `feat/ai-intake`. #569 מוזג ל־`feat/ai-intake`. «הוראת קבע» לבד בהנחיות היא `none`. ודאות החריצים של שאלת נתונים נשמרת ב־`quality_signals.slot_confidence`, בלי המשפט, רק למשתמשי הניסוי. על testing הוחלה `20261023010000` והחותמת יושרה. לא ל־`main`.
- **2026-10-23:** #570 ו־UI-5 (#568) מוזגו ל־`feat/ai-intake`. מפתח השמירה נוצר כשהטיוטה מוצגת, ונשאר לאותה טיוטה גם בלחיצה כפולה. מפתח חדש כשהתיאור, הסכום, הסוג או התאריך משתנים, וגם אחרי כשל שמירה. לא ל־`main`.
- **2026-10-23:** ודאות החריצים נרשמת עם `service_role` ומחזירה `measurement_id`. המשתמש מסמן רק את מה שעשה אחרי התשובה: משפחה, חיפוש בתיאור, שאלה נוספת תוך 60 שניות, או שנשאר עם המספר. על testing הוחלה `20261023020000` והחותמת יושרה. לא ל־`main`.
- **2026-10-23:** רשימת משתמשי הניסוי ב־SQL יושבת ב־`ai.is_trial_user`. רישום קבלה וודאות חריצים קוראים לה. `trial-users.ts` נשאר ל־Edge, והבדיקה ב־`scripts` משווה אותו לגוף הפונקציה. על testing הוחלה `20261023030000` והחותמת יושרה. לא ל־`main`.
- **2026-10-23:** תוכנית בלבד להוצאת הלוגיקה מהמגירה: `docs/superpowers/plans/2026-10-23-ai-intake-core.md`. בלי קוד. הביצוע לפני WhatsApp, ב־PR נפרד. לא ל־`main`.
- **2026-10-23:** אחרי «אותו אירוע» נוצר מפתח שמירה חדש, כדי ש«שמור בכל זאת» יצליח בלחיצה אחת. סגירת המגירה או שיחה חדשה רושמות `answered` פעם אחת רק כשמוצגת תשובה מספרית. לא ל־`main`.
- **2026-10-23:** טאב AI באדמין: כמויות של 7 ימים ממה שכבר נשמר, ועלות שער לפי מודל. המפתח נשאר ב-Edge. הסכום עדיין מערבב משתמשים וריצות מדידה. על testing הוחלה `20261023100000` והחותמת יושרה. לא ל־`main`. הצעד הבא: תגים על הקריאות.
- **2026-10-23:** `get-ai-admin-spend` פרוסה על testing. כשל בטעינת העלות לא מסתיר את הכמויות, ולהפך. לא ל־`main`.
- **2026-10-23:** טאב ה-AI משתמש בבורר התקופה של המגמות, בלי תקרת 7 ימים. הימים UTC, כמו דוח השער. קריאות המודל מקבלות תג `source:app` או `source:eval`. לא ל־`main`.
- **2026-10-23:** טאב ה-AI חולק לתנועות שנשמרו, להודעות לפי סוג, ולכרטיס עלות לכל מודל. סימן שאלה מסביר כל מספר. אין ספירת שיחות. לא ל־`main`.
- **2026-10-23:** משפך הטיוטות יורד משלב לשלב. שאלה על הנתונים כותבת שורת מדידה גם כשאין ודאות חריצים. הקריאה הקודמת רצה בלי `service_role` ולכן לא נשמרה. לא ל־`main`.
- **2026-10-25:** משפך הטיוטות הוא פסים לרוחב המסך. הענפים (נדחו, בוטלו) יושבים מתחת לשלב שממנו יצאו. המספרים לא השתנו. לא ל־`main`.
- **2026-10-26:** טאב AI מציג ספירות שימוש בלי סכומי כסף: תנועות לפי תאריך התנועה, משתמשים, חלק מהתנועות, והודעות. המשפך מקופל. על testing הוחלה `20261026090000`. לא לייצור.
- **2026-10-28:** [#576](https://github.com/yossi-weinberger/ten10/pull/576) מוזג ל־`feat/ai-intake`. ארבע הבדיקות הידניות ב־Preview מתוכנית הבדיקה שלו עדיין פתוחות, ויוסי מריץ אותן. בדיקות Rust רצות רק כש־`src-tauri` משתנה (`19776f58`, `dc1a62ac` ב־`main`, ומוזגו לענף).
- **2026-10-28:** [#590](https://github.com/yossi-weinberger/ten10/pull/590) נפתח מול `feat/ai-intake`. נמחקו `isImportableType`, `isSpecialType` ושלוש הפניות ש־`src` לא משתמש בהן. בדיקת Vitest נועלת את `CURRENCIES` ו־`MIN_TRANSACTION_DATE` של `normalize-core.ts` מול `src`. `receipt_expires_at` נשלף רק לשורות העמוד (`20261028120000`). על testing הגוף החדש רץ כפונקציה זמנית ב־`pg_temp`: 10 מקרים זהים לפונקציה המותקנת. על testing הוחלה `20261028120000` והחותמת יושרה. אחרי ההחלה: אותם 10 מקרים זהים לגרסה הקודמת, ההרשאות לא השתנו, וכ־`authenticated` הקבלות חוזרות. לא ל־`main`.
- **2026-10-28:** אימות `get_admin_dashboard_stats` מ־`20261026090000` על testing. הגרסה של `main` (`20260902120000`) רצה כ־`pg_temp` לצד המותקנת, בהתחברות כמנהל לטרנזקציה בלבד. כל השדות הקיימים זהים (`users`, `finance` כולל `by_currency` בחמישה מטבעות, `downloads`, `engagement`, `system`), אף שדה לא נעלם, ונוספו רק `engagement.ai_transactions` (13) ו־`engagement.ai_users` (2). שניהם שווים לספירה ישירה של `origin IN ('ai', 'ai_auto')`. `origin IS NOT NULL` שקול לזה בגלל `transactions_origin_check`. גם הגרסה עם פרמטר `integer` מחזירה אותו JSON. אין מה לתקן. נוסף סעיף לצ'קליסט של `main`.
- **2026-10-28:** [#591](https://github.com/yossi-weinberger/ten10/pull/591): שלוש תוכניות לאישור, בלי קוד. `2026-10-28-ai-recurring.md`, `2026-10-28-ai-usage-and-plans.md`, `2026-10-28-ai-multi-item.md`. כל אחת עם החלטות פתוחות בסוף. סדר הביצוע המוצע אחרי אישור: הוראת קבע, שכבות 1–2 של המדידה, כמה תנועות.
- **2026-10-28:** #590 ו־#591 מוזגו ל־`feat/ai-intake`, ו־#592 (המשתמש מה־session השמור בטבלאות) הגיע מ־`main`. שלוש התוכניות עודכנו לפי ההחלטות:
  - **הוראת קבע:** `origin` רק על ההוראה. «גם החודש» דרך ה־cron, עם בדיקת כפילות לפני שמירה. 6 משפטי eval. חג שלא מחושב נשאל ולא מנוחש.
  - **מדידה:** שחרור בכשל. טקסט עם ה־parser המקומי. `model_calls` נשמר 13 חודשים ונמחק עם החשבון. איפוס קלנדרי ל־free. תקרה יומית לכל הקריאות. תשלום רק באתר.
  - **כמה תנועות:** קבלות נפרדות. דף בנק לייבוא הרגיל. ייבוא בלי `origin`. רשת ביטחון של שני סכומים. עיגון לפי מספר הופעות.
  צורת העבודה נרשמה למעלה. לא ל־`main`.
- **2026-10-28:** R2 ([#595](https://github.com/yossi-weinberger/ten10/pull/595)) נפתח מול `feat/ai-intake`. `recurringFromText` ב־`recurring-draft.ts`, והביטויים ב־`recurring-aliases.ts`. סכום, מטבע, סוג ותיאור מ־`draftFromText` בלי שינוי. `buildRecurringDefinition` עבר מהטופס ל־`_shared/transaction-domain`, אחרי בדיקת אפיון שעברה על הקוד הישן. בלי UI, DB או Edge. איך יצאו 6 המשפטים (היום 28/10/2026, לוח לועזי):
  - `he-recurring-01`: חודשי, יום 1, מ־1/11, בלי סוף. בלוח עברי: א׳ בכסלו (11/11). חסר: סוג.
  - `he-recurring-02`: חודשי, יום 10, מ־10/11, בלי סוף, 1,500. חסר: סוג.
  - `he-recurring-03`: שבועי, מהיום (28/10), 12 פעמים, 36. חסר: סוג, כי «תרומה» לא ברשימת הסוגים של `phrase-aliases.ts`.
  - `en-recurring-01`: חודשי, יום 1, מ־1/11, בלי סוף, 100, תרומה. לא חסר כלום.
  - `en-recurring-02`: שנתי, 180. חסר: תאריך (פורים לא מחושב) וסוג.
  - `en-recurring-03`: חודשי, יום 28, מהיום, 3 חיובים עד 31/12. חסר: סכום («fifty» במילים) וסוג.
  - נמען לא מחולץ, כי `draftFromText` לא מחזיר נמען. התיאור יוצא לא נקי («של לכולל», «a of to Ezer Mizion»).
- **2026-10-28:** U1. קריאה בודקת אחת לכל endpoint, עם תג `source:eval`:
  - **Jev (`/typesafe/v1/systemone`) ו־Responses:** `usage.input_tokens` ו־`output_tokens`, ועלות ב־`provider_metadata.gateway`.
  - **תמלול:** בלי טוקנים, רק `durationInSeconds`, ועלות ב־`providerMetadata.gateway`.
  - **בכולם:** `generationId`.
  - **ממצא:** ב־Jev ובקבלה יש `reportingTagWriteCost` של $0.00015 לכל בקשה. ב־Jev זה פי 6 מעלות ההסקה ($0.000025). בתמלול אין תוספת.
  - `ai.model_calls` נכתבת דרך `_shared/ai/model-call.ts` משש הפונקציות, גם בכשל. `cost_usd` הוא `gatewayCost`, כולל התוספת.
  - `usage_id` נדחה ל־U3, כשתהיה טבלת צריכה.
  - על testing הוחלה `20261028190000` והחותמת יושרה. job מחיקה אחרי 13 חודשים ב־04:45 UTC. מחיקת משתמש מוחקת את השורות שלו (נבדק בבלוק שהתבטל).
  - שש הפונקציות נפרסו על testing ונטענות. שורה מקריאה אמיתית מחכה לבדיקה של משתמש ניסוי. לא ל־`main`.
- **2026-10-28:** RCP ([#597](https://github.com/yossi-weinberger/ten10/pull/597)) נפתח מול `feat/ai-intake`. `recipientFromText` ב־`recipient-draft.ts`, והמילים ב־`recipient-aliases.ts`. נמען אחרי «ל» או "to", ורק אחרי מילת תרומה. נמען שמור מתקבל גם בלי מילת תרומה, ונשמר בכתיב השמור. ההשוואה לשמות השמורים עברה מ־`sum-year-type.ts` למודול, בלי שינוי. עוד לא מחובר ל־`draftFromText`. בלי UI, DB או Edge. איך יצאו 6 המשפטים:
  - «לכולל» בהוראת קבע: אין נמען, כי אין מילת תרומה. כש־«כולל» שמור: «כולל».
  - «שכר דירה»: אין נמען.
  - «לחב״ד»: «חב״ד». כש־«חבד» שמור: «חבד».
  - "to Ezer Mizion": «Ezer Mizion».
  - "for matanot la'evyonim": אין נמען. "for" לא נחשב, ואין מילת תרומה.
  - "to the kollel": «kollel», בלי the, כמו בשאלת נתונים.
- **2026-10-28:** U2.
  - **תגים:** קריאות האפליקציה יוצאות בלי `tags` ובלי `user`. רק סקריפטי המדידה מתייגים `source:eval`. נבדק בקריאה אחת: `surchargeCost` הוא 0. החיסכון לבקשה הוא $0.00015 ב־Jev ובקבלה, כלומר קריאת כוונה ירדה מ־$0.000175 ל־$0.0000255 (85%). בתמלול לא הייתה תוספת.
  - **`get_admin_ai_calls`** (`20261028233000`, הוחל על testing והחותמת יושרה): פעולות עם קריאות, כשל, p50 ו־p95, טוקנים ועלות. ימים להשוואה, מודלים לפי תקופה, ומשתמשים. מנהל מקבל תשובה, ומי שאינו מנהל נחסם.
  - **`get-ai-admin-spend`:** 3 שאילתות לשער במקום עד 12, כלומר $0.015 במקום $0.06 לכל פתיחה. התשובה נשמרת ב־cache לפי טווח, עד טעינה מחדש של הדף. עלות האפליקציה היא סך היום פחות `source:eval`.
  - **השוואה ראשונה (28/10, יום חלקי):** השער $0.01337 ו־33 בקשות, מול $0.00736 ו־23 קריאות אצלנו. ההפרש הוא קריאות מלפני פריסת U1 ושתי קריאות בדיקה שלי בלי תג. ההשוואה האמיתית מתחילה ב־29/10.
  - **ממצא:** שלוש הקלטות של ה־QA נכשלו ב־400. הקלטה מהדפדפן (`audio/webm;codecs=opus`) נדחית על ידי `microsoft/mai-transcribe-2`, ו־WAV עובר. זה לא מ־U1, והקול כנראה לא עבד מאז 19/10. התיקון, המרה ל־WAV בדפדפן, הוא PR נפרד.
  - `ai-classify-intent` לא נפרס מכאן, כדי לא לדרוס את הגרסה של M1 על testing. לא ל־`main`.
- **2026-10-29:** NW ([#601](https://github.com/yossi-weinberger/ten10/pull/601)) נפתח מול `feat/ai-intake`. `numberWordsToDigits` ב־`number-words.ts`, והמילים ב־`number-word-aliases.ts`. «מאה שמונים שקל» הופך ל־«180 שקל», ו־"twenty-five dollars" ל־"25 dollars". אות ב/ל/מ/ו/ה לפני המספר נשארת, עם מקף: «ב־300». מספר מתחת ל־20 נשאר במילים, אלא אם בא אחריו מטבע. «יום שני» לא משתנה. ב־`intent-eval-inbox.json` משתנים 11 משפטים מתוך 150, כולם סכומים אמיתיים. «בחמש עשרה» לחודש נשאר במילים. עוד לא מחובר ל־`draftFromText`, זה אחרי #596. בלי UI, DB או Edge. לא ל־`main`.
- **2026-10-29:** U3, צד השרת.
  - **טבלאות:** `ai.usage_counters` (יחידות לחודש קלנדרי UTC), `ai.usage_rate` (דלי דקה ודלי יום), ו־`ai.usage_events` (שורה לכל צריכה, כדי שהשחרור יהיה בטוח גם אם הוא נקרא פעמיים).
  - **משקלות:** קבלה 5, קול 3, טקסט 1. שאלת נתונים, כפילויות ומדידת צל בלי משקל, רק בדלי הדקה והיום.
  - **מספרים זמניים:** 1,000 יחידות לחודש, 30 קריאות לדקה, 300 ליום. נקבעים מחדש אחרי חודש של `ai.model_calls`.
  - **בדיקה ועדכון באותה פקודה:** `ON CONFLICT DO UPDATE ... WHERE`. כשל ספק משחרר את היחידות. אם בדיקת המכסה עצמה נכשלת, הקריאה נחסמת.
  - **על testing הוחלה `20261029090000`, והחותמת יושרה.** נבדק עם משתמש זמני בבלוק שהתבטל:
    - 999 ואחר כך 994 יחידות נותרות. קבלה ב־998 נחסמת, וספירת הקריאות חוזרת.
    - שחרור מחזיר 3 ל־0, ושחרור שני לא עושה כלום.
    - חסימת דקה לא סופרת את היום. חסימות דקה ויום עובדות.
    - סוג לא מוכר נדחה, ומחיקת המשתמש מוחקת את כל השורות.
  - **בדיקה של שתי קריאות במקביל על היחידה האחרונה:** נכשלה בכלי, שהריץ את הקריאות בזו אחר זו, וגם ב־CLI, שלא התחבר. ההגנה נשענת על ההתנהגות המתועדת של Postgres. שורות הבדיקה נמחקו.
  - **פריסה:** חמש פונקציות נפרסו על testing ונטענות. `ai-classify-intent` לא נפרס מכאן, כדי לא לדרוס את M1.
  - **עוד לא בפנים:** ההודעות בממשק («נגמרה המכסה», «יותר מדי בקשות»). הן ב־PR המשך אחרי M1, כי הן נוגעות במגירה. עד אז קול חסום יקבל «לא שמעתי». לא ל־`main`.
  - **QA (29/10) עבר** על `b55ea0b3`: קבלה רשמה 5 יחידות, קול רשם 3 ושוחרר כשהספק נכשל, טקסט פתח טיוטה בלי שורת שימוש כי `ai-classify-intent` לא נפרס מהענף. לפני כל פריסה של הפונקציות: המיגרציה קודם.
- **2026-10-28:** M5 ([#598](https://github.com/yossi-weinberger/ten10/pull/598)) נפתח מול `feat/ai-intake`. `ImportWizard` מקבל `initialRows` של טיוטות AI ונפתח ישר בסקירה, בלי קובץ ובלי מיפוי. כל טיוטה עוברת `draftToNormalizedRow` ואז `previewRowsFromNormalized`, שחולקת עם `buildPreviewRows` את הנרמול, הכפילות וההוראות הקבועות, בפרופיל `AI_DRAFT`. השמירה היא הייבוא הרגיל, בלי `origin`. שורה במטבע זר, גם עם שער, נחסמת, כי שמירת הייבוא לא שומרת המרה. `exempt-income` ו־`non_tithe_donation` עוברים. עוד אין מי שקורא לזה מהעוזר. לא ל־`main`.
- **2026-10-29:** קול. הקלטה מהדפדפן (`audio/webm;codecs=opus`) נדחתה ב־400 על ידי `microsoft/mai-transcribe-2`, כנראה מאז 19/10. עכשיו ההקלטה מומרת בדפדפן ל־WAV ב־16kHz מונו (`src/lib/ai/speech-wav.ts`, דרך `OfflineAudioContext`), ואם הפענוח נכשל נשלח המקור.
  - **זמן ההמרה:** במשפט של 2–3 שניות, 10–30 מ״ש, ועם מעבד מואט פי 6 עד 95 מ״ש. ב־30 שניות, 80 מ״ש, ובמעבד מואט 800 מ״ש. WAV גדול בערך פי 2 מ־webm.
  - **בדיקה עם הקוד האמיתי:** חמישה משפטים מסונתזים, דרך webm, ההמרה ו־`mai-transcribe-2` עם ZDR. כל החמישה יצאו נכון.
  - **השוואת מודלים** על אותם חמישה משפטים:
    - **בלי תמיכה ב־ZDR:** מתוך 11 מודלי תמלול בשער, רק 4 מקבלים ZDR: מיקרוסופט, שני מודלי Mistral ו־`grok-stt`.
    - **Voxtral:** לא שמיש בעברית.
    - **grok:** טעה ב«לחב״ד».
    - **בלי ZDR, שנבדק בנפרד:** את «לחב״ד» תמללו נכון רק Scribe ו־`gpt-transcribe`. ‏gpt-4o, Gemini ו־Whisper טעו. Scribe כותב סכומים במילים. ‏`gpt-transcribe` יקר פי 2.7.
    - **הוחלט:** נשארים עם מיקרוסופט ועם ZDR.
  - **פתוח:** ‏`mai-transcribe-2` כותב לפעמים סכום במילים («מאה שמונים»). ה־parser לא קורא את זה, וזה PR נפרד.
  - **QA (29/10) עבר** על `a49242cb` ועל `5283af37`: נשלח WAV ב־16kHz, התמלול חזר, ונפתחה טיוטה של ₪12. טלפון אמיתי ו־Safari באייפון עוד לא נבדקו.
- **2026-10-28:** [#596](https://github.com/yossi-weinberger/ten10/pull/596) נפתח מול `feat/ai-intake` (M1). קריאת הכוונה שואלת גם כמה תנועות יש (`one`, `several`, `list`), ו־`ai-classify-intent` מחזיר `count` ו־`count_confidence`. רשת ביטחון: שני סכומים או יותר ב־parser הם `several`. כשהכוונה היא תנועה וזה לא `one`, אין טיוטה, והתשובה היא «אני רושם תנועה אחת בכל פעם. שלח אותן אחת אחת.» גם בקול. שעה, שנה בהקשר של תאריך, ויום בחודש («ב־15 לחודש», «כל חודש ב־10») לא נספרים כסכום, וגם לא כמות ליד מחיר («2 חולצות ב־100»). לכן «כל חודש ב־10 תרשום 1,500» נותן עכשיו 1,500. הכיול מחכה ל־`intent-count-eval-cases.json` מיוסי. לא נפרס ל־testing. לא ל־`main`.
- **2026-10-29:** כיול M1 על `intent-count-eval-cases.json` (120 משפטים: 50 `one`, 45 `several`, 25 `list`). שלוש ריצות:
  - **ריצה 1, עם הקריטריונים המקוריים:** ספירה 86.7% עם טעות אחת בוודאות גבוהה (`en-016`). בכוונה, «אתה יכול לבדוק לי כמה תרמתי או רק לרשום תנועות?» הפך ל־`ask_data` בוודאות 0.8.
  - **ריצה 2, אחרי תיקון הקריטריונים:**
    - `one`: תשלומים או חלוקת תשלום הם עדיין אחד.
    - `several`: פריטים עם סכום לכל אחד, גם כשיש סה״כ.
    - `list`: יותר מחמישה פריטים.
    - `help`: שאלה שמציעה בחירה בין יכולות.
    - התוצאה: ספירה 98.3%, אבל `out_of_scope` ירד ב־1 (הזרקת JSON, 0.46).
  - **ריצה 3, `out_of_scope` כולל הודעה שהיא רק שורת SYSTEM או אובייקט JSON:** ספירה 96.7% (`one` 50/50, `several` 41/45, `list` 25/25), ואין טעות בוודאות גבוהה. בכוונה: 67/68 ו־147/150, אף תווית לא ירדה מול 21/10, שלוש עלו, ואין טעות בוודאות גבוהה.
  - **רשת הביטחון כפי שהוחלטה** (גוברת גם על `one` בטוח): 110/120. תשע תנועות בודדות מקבלות «אחת בכל פעם» בגלל מספר שאינו סכום: «3 תשלומים», «10 אחוז», «ל־5 אנשים», «ב־3.5», «4 nights».
  - **רשת רק כש־Jev לא בטוח:** 119/120. יוסי אישר. תשובה בטוחה של Jev גוברת. מתחת לסף, `several` ו־`list` נשארים, ורק `one` לא בטוח או בלי תשובה עובר לבדיקת הסכומים. ריצה 4 עם הכלל: אחרי הרשת 99.2% (`one` 50/50, `several` 44/45, `list` 25/25). בכוונה: 67/68 ו־148/150. אף תווית לא ירדה, ואין טעות בוודאות גבוהה.
- **2026-10-29:** M1, תיקונים אחרי QA על `1a162942`.
  - **הבעיה:** «קניתי מקרר ב־3000 שקל ב־3 תשלומים» יצא ₪3. מילת מחיר («ב», «for») סימנה את 3 כמו מטבע, והאחרון המסומן ניצח.
  - **סכום:** עכשיו סכום ליד מטבע גובר על מילת מחיר, ומילת מחיר על מספר חשוף. מספר שאחריו «תשלומים», «אחוז», «אנשים», «לילות» וכדומה אינו סכום. נוספו «יורו» ו־euros.
  - **שני מקרים מיוחדים:** «10 אחוז מ־500» מחושב כ־50. סכום שהוא סכום האחרים («250, 100 במזומן ו־150 באשראי») הוא תשלום אחד של 250.
  - **השפעה על הסטים:** מתוך 338 משפטים, 12 סכומים השתנו, כולם לטובה.
  - **רשת הביטחון:** שני סכומים, כל אחד ליד מטבע, הם `several` גם מול `one` בטוח של Jev. על 120 המשפטים: 119/120. אף תנועה בודדת לא מוצגת ככמה. ההחמצה היחידה היא סכומים במילים («תשעת אלפים שקל»).
  - **מגירה:** «זו נראית כמו תנועה.» לא מופיע יותר לפני «אחת בכל פעם». כשל בתמלול קול מוצג כהודעה, ולא מחזיר למסך הפתיחה.
  - **QA (29/10) עבר** על `77704eb5`: מקרר ב־3 תשלומים יוצא ₪3000, «10 אחוז מ־500» יוצא ₪50, ו־«50 במכולת ו־120 לישיבה» מקבל «אחת בכל פעם». נשארו שתי הערות, לא חוסמות: שאריות בתיאורים, ו־«ארוחה ל־5 אנשים» שמסווג `out_of_scope`.
- **2026-10-29:** R1. כוונה `create_recurring`. בלי Jev, רק פועל בקשה («תגדיר», «תקבע», "set up", "make it recurring") יחד עם מילת חזרה. «ירדו לי 300 בהוראת קבע» נשאר תנועה. «מעכשיו כל חודש תרשום» בלי פועל בקשה נשאר כלל. שישה משפטי inbox עברו מ־`create_rule`, ושישה משפטים שסופקו נכנסו ל־`intent-eval-cases.json`. במגירה: «אפשר להגדיר הוראת קבע בטופס» וכפתור ל־`/add-transaction?recurring=1`, עם תיבת הוראת הקבע מסומנת. בכיול הראשון «תוסיף כלל להבא» על הוראת קבע יצא `create_rule` ב־0.73. שני הקריטריונים תוקנו: «כלל» על אותו תשלום שנרשם שוב הוא הוראת קבע, וכלל סיווג נשאר כלל. הריצה השנייה: 73/74 ו־150/150. אף תווית לא ירדה מול הריצה שלפני R1, ואין טעות בוודאות 0.7 ומעלה. `en-hal-02` נשאר `out_of_scope` ב־0.54, כמו קודם. מ־12 משפטי `create_recurring` רק `gen-he-rule-06` מתחת ל־0.7 (0.62), והוא נופל לשאלת הכפתורים. QA (29/10) עבר על `a7ab912d`. הקישור יצא `?recurring=%221%22` כי מחרוזת `"1"` עוברת JSON. הכפתור מעביר עכשיו את המספר 1, והכתובת `?recurring=1`. לא ל־`main`.
- **2026-10-29:** R3. כרטיס הוראת קבע: שורת סיכום, עד שלושה חיובים הבאים, עריכה, ושאלת «גם החודש» רק כשהמשפט אומר שהחיוב כבר ירד. שמירה רק בלחיצה, אחרי בדיקת כפילות אם בחרו לרשום את החודש. בלי כרטיס (החילוץ לא קרא הוראת קבע) נשאר הכפתור לטופס. כפתור הביטול הוא R4. אחרי QA: «של» ו־ל לפני המוטב יורדים («כולל», «ישיבה», «בית כנסת»), ומוטב תורה או צדקה מקבל סוג תרומה מרשימה חדשה, בלי לשנות את קריטריון הכוונה. חץ ה־select לא מכסה את הערך. QA (29/10) עבר על `29dda3a5`. «הוראת קבע של 100 ש״ח לבית כנסת» נשאר בשאלת בחירה (0.45), בלי שינוי לקריטריון. מוזג ל־`feat/ai-intake`. לא ל־`main`.
- **2026-10-29:** R4. אחרי שמירה מופיע «בטל» לשבעה ימים, ורק כש־`execution_count` הוא 0. אחרי חיוב ראשון הכפתור נעלם, והביטול נשאר בטבלה. הביטול קורא ל־`update_recurring_transaction` עם `cancelled`, בלי מחיקה. `recurring_transactions.origin` הוא `ai` רק להוראה שנשמרה מהעוזר. חיוב של ה־cron נשאר בלי origin, והטאב סופר את ההוראה פעם אחת. QA (29/10) עבר על `135bff87`: שמירה מהעוזר עם `origin` ai, ביטול ל־cancelled בלי מחיקה, טופס בלי origin, והטאב סופר. כפתור אחרי חיוב ראשון נשאר על הבדיקה האוטומטית. מוזג ל־`feat/ai-intake`. לא ל־`main`.
- **2026-10-29:** R3b. כרטיס מלא הוא משפט סיכום אחד, שלושת החיובים הבאים, ו«שמור» / «שנה פרט». שדה חסר נשאל אחד בכל פעם. «שנה פרט» פותח שדה אחד. שבועי, שנתי ויומי לא נשמרים ולא הופכים בשקט לחודשי. השמירה וה־`origin` לא השתנו. QA (29/10) עבר על `c06f2b0d`. נשארו שתי הערות, לא מהדיף הזה: «ביטוח» יוצא «ל וח», ו«תעשה לי הוראת קבע חודשית של 150 שקל לחשמל» שומר מילות מילוי. בלי יום בחודש ההתחלה נשארת היום, כמו שהוחלט. מוזג ל־`feat/ai-intake`. לא ל־`main`.
- **2026-10-29:** #607 מוזג ל־`feat/ai-intake`. `create_ai_text_intake_items` יוצר עד 5 פריטים בהודעה אחת. אותו מפתח מחזיר את אותם פריטים. 6 נכשל. שמירה שנכשלת באמצע לא שומרת כלום. על testing הוחלה `20261029160000`. TypeScript נכשל על `node:fs` בקובץ בדיקה תחת `src`, והבדיקה עברה ל־`scripts`. לא ל־`main`.
- **2026-10-29:** #608 מוזג ל־`feat/ai-intake`. קבלה עם `kind`. חסר או לא מוכר נקרא קבלה אחת. כמה קבלות בתמונה מבקשות לשלוח כל אחת בנפרד, בלי חילוץ. דף בנק מציע ייבוא של CSV או Excel. `ai-read-receipt` על testing. לא ל־`main`.
- **2026-10-29:** #609 מוזג ל־`feat/ai-intake`. עיגון של פריטי פיצול: הסכום חייב להופיע בטקסט ולהיקרא בדיוק, ו«50 לכולל» לא נותן שני פריטים. תאריך ריק הוא היום, ותאריך שלא הובן נשאר ריק. ה־Edge וסט החילוץ עדיין פתוחים. לא ל־`main`.
- **2026-10-29:** M2b. תשובת פיצול נקראת בלי מודל. יותר מחמישה פריטים הוא רשימה, בלי שמירה. תשובה בלי פריט שנשאר אינה נקראת. פריט שנזרק נספר. לא ל־`main`.
