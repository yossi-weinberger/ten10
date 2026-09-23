# מחקר: תמיכה גורפת בלוח עברי ב-TEN10

**תאריך:** 18.9.2026 (ז' בתשרי תשפ"ז) · **גרסת אפליקציה:** 0.7.5 · **סטטוס:** מחקר + החלטות מוצר ראשוניות — לא נכתב קוד.

מקורות: כל `src/`, `supabase/` (מיגרציות + edge functions), `src-tauri/`, `llm-instructions/`, `docs/`, `public/locales/`, `TODO.md`, היסטוריית git (1,370 קומיטים), סכמת ה-Postgres החיה בפרודקשן (638 פרופילים, ~17K תנועות, 880 הוראות קבע), הצלבה מול מסמך המלצות חיצוני (`hebrew-calendar-recommendations-2026-09-18.md`), ובדיקות חיות של `@hebcal/hdate` ו-`temporal-polyfill/full` ב-Node 24.

---

## 0. החלטות מוצר שהתקבלו (18.9.2026)

| # | נושא | החלטה | השלכה בדוח |
|---|---|---|---|
| 1 | אחסון | לועזי ב-DB, לוח עברי = שכבת המרה/תצוגה בלבד | סעיף 3.1 — מאושר |
| 2 | תצוגה | **לוח ראשי אחד לפי הגדרה** + אפשרות opt-in להציג גם את הלוח השני (משני, לא עמודה נפרדת) | סעיף 4.2: `calendarType` + `showSecondaryDate` |
| 3 | שקיעה | **לא** — היום העברי מתחלף בחצות האזרחית | סעיף 5.1 §5 — נסגר |
| 4 | ראש חודש | לא טיפוס מיוחד; א' בחודש = `day=1`; ר"ח בן יומיים = ל' של הקודם + א' של החדש | סעיף 4.9 |
| 5 | אדר בשנה מעוברת | **כל אדר הוא חודש** — הו"ק חודשית מתבצעת גם באדר א' וגם באדר ב' | סעיף 4.9, 5.1 §3 |
| 6 | תחילת שנה עברית | **תשרי** בלבד. אין אופציות ניסן/ינואר — `maaserYearStart` נמחק, השנה נגזרת מהלוח | סעיף 4.2, 4.11 |
| 7 | ברירת מחדל | **תמיד גרגוריאני**, גם למשתמשי עברית. אין שינוי אוטומטי למשתמשים קיימים | סעיף 4.2 |
| 8 | הו"ק עברית | גל נפרד ומאוחר, אחרי שהתצוגה והתקופות יציבות | סעיף 6 |
| 9 | ל' בחודש בן 29 ימים | **clamp לכ"ט** (`overflow: "constrain"`) — חוזה ה-adapter מהיום הראשון, גם לפני גל C. נסגר 22.9 בהמלצת שתי הביקורות; ניתן לערער עד תחילת גל C בלבד | סעיף 4.9, 7 §2 |
| — | רישוי ספרייה | **פתוח** — המלצה בסעיף 3.4 | |

---

## 1. תקציר מנהלים

- **האפליקציה גרגוריאנית לחלוטין.** "עברית" ב-TEN10 היום = שפת UI + RTL + `date-fns/locale/he` (שמות חודשים גרגוריאניים בעברית). אין שום המרה ללוח עברי באף שכבה: לא ב-TS, לא ב-SQL, לא ב-Rust, לא ב-Deno.
- **הייתה כבר התחלה — והיא הוסרה.** בקומיט `60af5c2` (7.7.2026, "remove abandoned Hebrew calendar toggle") נמחקו `@hebcal/core`, `src/lib/utils/hebrew-date.ts`, `CalendarSettingsCard.tsx` ו-`settings.calendarType`. נותרו שרידים: מפתחות i18n ב-`settings.json`, `calendarSection = null` ב-`SettingsPage.tsx`, השדה המת `maaserYearStart: "01-01"` ב-store, ו-279 פרופילים בפרודקשן שעדיין מחזיקים `client_preferences.calendarType = "gregorian"`.
- **ההכרעה הארכיטקטונית המרכזית: האחסון נשאר גרגוריאני (`date` ISO), הלוח העברי הוא שכבת פרשנות.** כל טווח עברי (חודש/שנה) מתורגם לטווח גרגוריאני *בקליינט* לפני שהוא נשלח לשרת. זה מונע כתיבה של ארבע אימפלמנטציות של לוח עברי (TS, PL/pgSQL, Rust, Deno) ומשאיר 90% מה-RPCs כמו שהם.
- **הפיצ'ר מתפרק לשלוש רמות עומק, וצריך להחליט עד איזו רמה הולכים:**
  - **רמה A — תצוגה:** תאריך עברי לצד/במקום גרגוריאני, בוחר תאריכים עברי. מאמץ נמוך-בינוני.
  - **רמה B — תקופות:** "החודש"/"השנה" = חודש/שנה עבריים; גרף חודשי, מפרידי חודשים בטבלה ו-PDF, השוואת תקופות — לפי חודשים עבריים. מאמץ בינוני-גבוה (שובר את חוזה `month_label = 'YYYY-MM'`).
  - **רמה C — לוגיקה עסקית:** הוראות קבע ביום עברי בחודש, תזכורות ביום עברי + דילוג יום טוב, "שנת מעשר" מתשרי, דוח שנתי הלכתי. מאמץ גבוה, נוגע ב-DB, edge functions ו-Rust.
- **הנקודה הכואבת ביותר:** קיבוץ חודשי בצד השרת (`get_monthly_financial_summary` ב-Postgres ו-`get_desktop_monthly_financial_summary` ב-Rust) שניהם עושים `date_trunc('month')` גרגוריאני. זו השכבה היחידה שלא ניתן לפתור רק ב"תרגום טווח בקליינט".
- **הזדמנות:** `react-day-picker` v10 (מותקן) חושף `dateLib` שניתן להחליף — כך בנויה תמיכת הלוח הפרסי. אפשר לבנות `HebrewDateLib` מעל `@hebcal/hdate` ולקבל **גריד חודשים עברי אמיתי** (תשרי עם 30 ימים, אדר א'/ב') בלי לכתוב date picker מאפס.

---

## 2. מה כבר קיים (ומה כבר נוסה)

### 2.1 היסטוריית git — הניסיון הקודם

| קומיט | תאריך | מה |
|---|---|---|
| `520e4a2` | — | הוספת `CalendarSettingsCard` + מפתחות i18n (`calendar.*`) |
| `be1d7d5` | — | תיקון jitter ב-`CalendarSettingsCard` (Select item-aligned) |
| `60af5c2` | 7.7.2026 | **הסרה**: `@hebcal/core`, `hebrew-date.ts` (+ tests), `CalendarSettingsCard.tsx`, בלוקי `calendarType === "hebrew"` ב-`date-picker.tsx`, `date-range-picker.tsx`, `StatsCards.tsx`, `AnalyticsPage.tsx`; `CalendarType` הוסר מ-`store.ts` |
| `3e8e117` | 7.7.2026 | סנכרון `llm-instructions` — "Calendar: Gregorian calendar." |

מה שהקוד הישן עשה (ראוי ללמוד ממנו, לא לשחזר כמו שהוא):
- `formatHebrewDate(date)` → `"1 Tishrei"` — **באנגלית בלבד** (`hDate.getMonthName()` ללא locale), ללא גימטריה, ללא i18n.
- `formatCaption` בבוחר התאריכים החליף רק את **הכיתוב** מעל גריד גרגוריאני — הגריד עצמו נשאר ינואר–דצמבר. זו הסיבה שזה הרגיש "לא נכון" ונזנח.
- **באג עקבי:** `date-picker.tsx` השתמש ב-`hDate.getMonth()` ו-`date-range-picker.tsx` ב-`hDate.getMonth() + 1` — חוסר עקביות במיספור חודשי hebcal (ניסן=1, תשרי=7).
- `convertToGregorianDate` הסתמך על `HDate.monthFromName` בלי טיפול באדר א'/ב'.

### 2.2 שרידים חיים בקוד ובנתונים

| מיקום | שריד | הערה |
|---|---|---|
| `public/locales/{he,en}/settings.json` L83–96 | `calendar.cardTitle`, `hebrewCalendarLabel`, `weekStartLabel` ("תחילת שנת מעשר"), `options.{gregorian,hebrew,tishrei,nisan,january}` | ניתן לשימוש חוזר; שם המפתח `weekStartLabel` מטעה |
| `src/pages/SettingsPage.tsx` L227–228, 296, 313, 326 | `const calendarSection = null;` — "intentionally hidden for now" | הסלוט ב-layout כבר קיים בשלוש פריסות |
| `src/lib/store.ts` L22, L80 | `maaserYearStart?: string` = `"01-01"` | **לא נקרא באף מקום** — stub מת |
| Postgres `profiles.client_preferences` | `calendarType: "gregorian"` ב-279 פרופילים; `maaserYearStart: "01-01"` ב-335 | `PreferencesSyncService` ממזג DB→local, כך שהשדה "יחזור" ל-store של משתמשים ותיקים — לא מזיק, אך צריך ניקוי/מיגרציה |
| `TODO.md` L5 | "לתקן תצוגת לוח עברי ולוח לאעז באתר" | פריט backlog פתוח |
| `src/lib/halacha/hebrew-numeral.ts` | המרת מספר → אותיות (א, יב, …) לחוברת ההלכה | **ניתן להרחבה** לגימטריית שנים (תשפ"ז) |
| `supabase/functions/send-reminder-emails/index.ts` L288–365 | דילוג שישי/שבת לפי `Asia/Jerusalem`, makeup ראשון/חמישי | "זמן יהודי" חלקי — לפי יום בשבוע, לא לפי לוח עברי; אין דילוג יום טוב |
| `public/locales/he/halacha-principles.json` L55 | ציטוט ה'נודע ביהודה': "הסכומים שעד ראש השנה … לכתחילה אין להעביר לשנה החדשה" | **הבסיס ההלכתי** ל"שנת מעשר" מתשרי — המוצר לא מיישם אותו |

### 2.3 מה שכבר "מוכן" לטובת הפיצ'ר

- כל בוחרי התאריכים כבר עוברים `locale` ו-`dir` לפי i18n — יש נקודת חיבור אחת ברכיב.
- כל שירותי הנתונים (`stats`, `analytics`, `insights`, `chart`, `tableTransactionService`) מקבלים `startDate`/`endDate` כמחרוזת `YYYY-MM-DD` — ה-RPCs אגנוסטיים למקור הטווח.
- ארכיטקטורת ההגדרות (Zustand → `client_preferences` JSONB בווב / `app_settings` ב-SQLite בדסקטופ) תומכת בשדה חדש בלי מיגרציה.
- `Intl.DateTimeFormat("he-u-ca-hebrew")` עובד ב-Node 24 וב-Chromium (WebView2 של Tauri) — נבדק: `ז׳ בתשרי תשפ״ז` / `7 Tishri 5787`. פורמט בלבד, בלי ספרייה.

---

## 3. ההכרעות הארכיטקטוניות

### 3.1 אחסון גרגוריאני, פרשנות עברית (מומלץ)

```
UI (Hebrew or Gregorian) ──▶ src/lib/calendar (adapter) ──▶ Gregorian YYYY-MM-DD ──▶ RPC / Tauri / SQLite
```

- `transactions.date`, `recurring_transactions.next_due_date`, `start_date` — נשארים `date` גרגוריאני. **אין** עמודת תאריך עברי.
- כל "חודש עברי" / "שנה עברית" מתורגמים בקליינט ל-`{startDate, endDate}` גרגוריאני ונשלחים כרגיל.
- יתרון: 90% מה-RPCs, ה-indexes (`idx_transactions_user_date`) וה-RLS לא נוגעים. פאריטי ווב/דסקטופ נשמר אוטומטית כי שתי הפלטפורמות מקבלות טווחים.
- החריג היחיד: **קיבוץ חודשי בשרת** (סעיף 5.6).

### 3.2 חלופה שנדחית: עמודות עבריות ב-DB

הוספת `hebrew_year`, `hebrew_month`, `hebrew_day` ל-`transactions` (trigger ב-INSERT/UPDATE) הייתה מאפשרת `GROUP BY hebrew_year, hebrew_month` ב-SQL. נדחה כי: אין לוח עברי ב-Postgres (צריך port של האלגוריתם ל-PL/pgSQL או טבלת lookup), צריך את אותו הדבר ב-SQLite/Rust, ו-backfill ל-17K שורות + כל ייבוא עתידי. מורכבות גבוהה תמורת תועלת שמושגת גם ב-3.3.

### 3.3 טבלת lookup `hebrew_calendar_days` (אופציה ביניים לקיבוץ בשרת)

טבלה סטטית `(gregorian_date PK, hebrew_year, hebrew_month, hebrew_day, is_leap_year)` לטווח 1900–2100 (~73K שורות, ~3MB), מיוצרת פעם אחת בסקריפט Node עם hebcal ונטענת כמיגרציה (Postgres) וכ-seed ל-SQLite. מאפשרת:

```sql
SELECT h.hebrew_year, h.hebrew_month, SUM(...) FROM transactions t
JOIN hebrew_calendar_days h ON h.gregorian_date = t.date
GROUP BY 1,2
```

יתרונות: אפס לוגיקת לוח בשרת, זהה ב-Postgres וב-SQLite, ניתן לבדיקה. חסרונות: עוד טבלה לתחזק, join על כל שאילתת גרף. **מומלץ רק אם רמה B נבחרת ורוצים להשאיר את קיבוץ הגרף בשרת.** החלופה: להחזיר נתונים יומיים/שבועיים ולקבץ בקליינט.

### 3.4 ספריית לוח — השוואה

| אופציה | רישוי | גודל | יכולות | הערות (מאומת ב-Node 24, 18.9.2026) |
|---|---|---|---|---|
| `Intl.DateTimeFormat(..., "u-ca-hebrew")` | — | 0 | **פורמט בלבד** (יום/חודש/שנה, גימטריה עם `nu-hebr`) | `ז׳ בתשרי תשפ״ז` / `7 Tishri 5787`. אין אריתמטיקה. מצוין ל"תאריך משני" |
| `@hebcal/hdate` 0.22 | **GPL-2.0** (`package.json`; כותרות המקור "GPLv2") | ~230KB unpacked | `HDate`, המרות, `daysInMonth`, שנה מעוברת, שמות חודשים | **מיספור ניסן=1, תשרי=7** (מלכודת מיון). **overflow = roll:** `new HDate(30, TEVET, 5787)` → **א' שבט**, לא כ"ט טבת. `ADAR_II` בשנה פשוטה מנורמל בשקט ל"אדר" ללא שגיאה. בלי חגים |
| `@hebcal/core` 6.9 | GPL-2.0 | ~3.7MB unpacked, תלוי ב-`temporal-polyfill` | כל הנ"ל + חגים, פרשות, זמנים | נדרש רק לדילוג יום טוב בתזכורות (edge — הגודל לא משנה) |
| `temporal-polyfill/full` 1.0.5 | **MIT** | ~185–215KB לא ממוזער (הערכה ~45KB min+gz) | `Temporal.PlainDate` עם `calendar: "hebrew"` — אריתמטיקה מלאה | **month 1 = תשרי** (מיון נכון מובנה). `overflow: "constrain"` → ל' טבת = **כ"ט טבת**; `"reject"` → `RangeError` (ולידציה). אדר א' = `M05L`, אדר ב' = `M06`; `monthsInYear` 13; `.add({months:1})` מקצץ נכון. **שים לב:** ה-import הבסיסי `temporal-polyfill` זורק `Unknown calendar hebrew` — חובה `/full`. יוחלף ב-native כשיינחת בדפדפנים |
| Rust `icu_calendar` (ICU4X) | Unicode | crate | לוח עברי מלא ב-Rust | רק אם מקבצים בדסקטופ ב-Rust ולא בקליינט — לא נדרש בתכנון הנוכחי |

**רישוי:** TEN10 הוא AGPL-3.0. חבילות hebcal מוצהרות `GPL-2.0` (לא `-or-later`); GPLv2-only מול (A)GPLv3 היא אי-תאימות מוכרת של FSF, גם אם בפועל hebcal נפוץ בפרויקטי GPLv3 וסביר שהכוונה היא or-later. שתי דרכים: (א) לשאול את המתחזק (Michael Radwin) ולתעד את התשובה; (ב) לבחור מסלול נקי.

**המלצה (מעודכן):** **`temporal-polyfill/full` כליבת ה-adapter** בקליינט וב-edge (`npm:temporal-polyfill/full` ב-Deno) — MIT, מיספור תשרי=1, clamp מובנה, ולידציה עם `reject`, ועתיד native. **`Intl`** לשמות חודשים וגימטריה (אין צורך בקבצי תרגום לחודשים). **`@hebcal/core` רק ב-`send-reminder-emails`** לזיהוי יום טוב (ניתן להחליף בטבלת חגים סטטית קטנה אם הרישוי מפריע). הכל עטוף ב-`src/lib/calendar/` — הספרייה לא נחשפת מחוץ למודול.

---

## 4. איפה זה צריך להיות — מפת השכבות

### 4.1 שכבת ליבה חדשה: `src/lib/calendar/`

מודול יחיד שכל האפליקציה עוברת דרכו. אין קריאה ישירה ל-hebcal מחוץ לתיקייה הזו.

```
src/lib/calendar/
  types.ts            CalendarType = "gregorian" | "hebrew"; CalendarMonth { year, month, label }
  calendar-adapter.ts interface CalendarAdapter { startOfMonth, endOfMonth, startOfYear, addMonths,
                       monthKey(date): string, monthLabel(key, lang), formatDate(date, style, lang),
                       daysInMonth, clampDay }
  gregorian.adapter.ts (date-fns)
  hebrew.adapter.ts    (temporal-polyfill/full, calendar: "hebrew", overflow: "constrain")
  use-calendar.ts      hook: קורא settings.calendarType → מחזיר adapter
  hebrew-day-picker-lib.ts  HebrewDateLib ל-react-day-picker (dateLib)
  *.test.ts            ראש השנה, אדר א'/ב', ל' חשוון/כסלו, מעבר שנה, round-trip
```

**חוזה מפתח חודש:** `monthKey` מחזיר `"YYYY-MM"` בגרגוריאני ו-`"5787-01"` (שנה עברית + מספר חודש, **תשרי=01 … אלול=12/13**) בעברי — ניתן למיון לקסיקוגרפי. עם Temporal זה המיספור המובנה (`PlainDate.month`); אם משתמשים ב-hebcal (ניסן=1, תשרי=7) חובה שכבת המרה בתוך ה-adapter. באדר: `"5787-06"` = אדר א', `"5787-07"` = אדר ב' בשנה מעוברת; בשנה פשוטה `"5788-06"` = אדר.

### 4.2 הגדרות

| שכבה | קובץ | שינוי |
|---|---|---|
| Store | `src/lib/store.ts` | `calendarType: "gregorian" \| "hebrew"` (default **`"gregorian"`** — החלטה 7), `showSecondaryDate: boolean` (default `false` — החלטה 2). **למחוק** `maaserYearStart` (החלטה 6). מיגרציה ב-`onRehydrateStorage`: ערך `calendarType` לא חוקי → `"gregorian"`; `maaserYearStart` → נמחק |
| Sync ווב | `src/lib/services/preferences-sync.service.ts` | `extractClientPreferences` יכלול אוטומטית. **חובה** whitelist של מפתחות בעת merge מה-DB → אחרת 279 פרופילים ימשיכו להזרים `calendarType`/`maaserYearStart` ישנים ללא type |
| Sync דסקטופ | `src/lib/services/desktop-settings.service.ts` | ללא שינוי (JSON מלא ב-`client_preferences`) |
| UI | `src/components/settings/CalendarSettingsCard.tsx` (לשחזר מ-`60af5c2` ולפשט) + `SettingsPage.tsx` L228 | Select לוח ראשי + Switch "הצג גם תאריך לועזי/עברי". להפעיל את הסלוט הקיים |
| i18n | `settings.json` `calendar.*` | **למחוק** `weekStartLabel`, `weekStartPlaceholder`, `options.nisan`, `options.january`; להוסיף `showSecondaryDateLabel` + תיאור |
| DB | `profiles.client_preferences` | אין מיגרציית סכמה. מומלץ ניקוי חד-פעמי: `UPDATE profiles SET client_preferences = client_preferences - 'maaserYearStart' WHERE client_preferences ? 'maaserYearStart'` (335 שורות) |
| Onboarding | — | **לא** להציע לוח עברי אוטומטית (החלטה 7). אפשר טיפ חד-פעמי "ידעת שאפשר לעבור ללוח עברי?" למשתמשי `he` |

**סמנטיקת `showSecondaryDate`:** הלוח הראשי קובע פורמט **ותקופות** (presets, קיבוץ חודשי, שנה). המשני הוא תצוגה בלבד — שורה קטנה/tooltip בטבלה, סוגריים בטופס ובכותרות תקופה ("תשרי תשפ"ז (12.9–11.10.2026)"). כך אין ambiguity "איזה לוח מקבץ" ואין עמודה נוספת בטבלה. בייצוא (PDF/CSV/Excel) — עמודת תאריך לועזי **תמיד**, עברי בעמודה נוספת כשהלוח הראשי עברי.

### 4.3 רכיבי UI — בוחרי תאריכים

| קובץ | היום | לרמה A/B |
|---|---|---|
| `src/components/ui/calendar.tsx` | wrapper דק על `DayPicker`; `formatMonthDropdown` עם `toLocaleString("default")` | לקבל `dateLib` + `formatters` מה-adapter; caption/dropdown בשמות חודשים עבריים; שנים 5780–5800 ב-dropdown |
| `src/components/ui/date-picker.tsx` | `format(date, "dd/MM/yyyy")`, parse ידני של קלט | `formatDate` דרך adapter; **קלט ידני** — להחליט: להשאיר גרגוריאני (dd/MM/yyyy) גם במצב עברי (מומלץ לשלב 1) או parser עברי ("ז תשרי תשפז") |
| `src/components/ui/date-range-picker.tsx` | 2 חודשים גרגוריאניים | אותו דבר; presets ("החודש") מה-adapter |
| `AmountCurrencyDateFields.tsx` | `format(date, "yyyy-MM-dd")` לשמירה | ללא שינוי — הערך הנשמר גרגוריאני |

**מסלול "גריד עברי אמיתי":** `DayPicker` v10 מקבל `dateLib?: Partial<DateLib>` עם `newDate`, `addMonths`, `startOfMonth`, `endOfMonth`, `getMonth`, `getYear`, `isSameMonth`, `differenceInCalendarMonths`, `eachMonthOfInterval`, `format`. אימפלמנטציה מעל `HDate` (~150 שורות) נותנת חודש עברי של 29/30 ימים עם ימי שבוע נכונים. סיכון: `dateLib` הוא API "מתקדם" — לבדוק כל שדרוג `react-day-picker`. חלופה זולה לשלב 1: גריד גרגוריאני + תאריך עברי קטן בכל תא (`formatDay`) + כיתוב כפול.

### 4.4 נקודות פורמט תאריך לתצוגה (רמה A)

כל אלה עוברים ל-`useCalendar().formatDate(...)` או ל-helper `formatDisplayDate(dateStr, calendarType, lang)`:

| קובץ | שורות | היום |
|---|---|---|
| `components/TransactionsTable/TransactionRow.tsx` | ~52–56, 515–517 | `toLocaleDateString(i18n.language)` |
| `TransactionsTableDisplay.tsx` | ~489–492, 748 | מפרידי חודשים + אישור מחיקה |
| `components/dashboard/StatsCards.tsx` | `formatDate` | `format(date, "dd/MM/yyyy", {locale})` |
| `pages/AnalyticsPage.tsx` | `formatDate` (useCallback) | כנ"ל |
| `components/analytics/InsightsSummaryRow.tsx` | 18–22 | ISO→`DD/MM/YY` ידני |
| `components/analytics/TransactionHeatmap.tsx` | tooltips | `dd/MM/yyyy` |
| `components/features/currency/CurrencyConversionInfo.tsx` | 139–143 | **`en-GB` קשיח** |
| `lib/utils/export-pdf.ts` | 484–532, 643 | `dd/MM/yy`, כותרות חודש |
| `lib/analytics/export-pdf.ts` | ~136–138, 396 | טווח + footer |
| `lib/utils/export-csv.ts` | 83–87, 116–120 | `he-IL`/`en-US` — **עמודת תאריך לועזי (ISO) תמיד**, עברי בעמודה נוספת כשהלוח הראשי עברי (אותו כלל כמו Excel/PDF) |
| `lib/utils/export-excel.ts` | 39, 126 | `numFmt: "dd/mm/yyyy"` על `Date` — **Excel לא תומך בפורמט עברי** → עמודה טקסטואלית נוספת "תאריך עברי" |
| `lib/halacha/print-halacha.ts` | 146 | תאריך הדפסה |
| `lib/admin/trend-chart.utils.ts` | `formatTrendBucketLabel` | אדמין — כנראה נשאר גרגוריאני |
| Edge: `send-reminder-emails`, `send-new-user-email` | תבניות מייל | תאריכים במיילים (`en-GB`) — אופציונלי לרמה A |

**החלטת UX (נסגרה, החלטה 2):** לוח ראשי אחד לפי `calendarType`; `showSecondaryDate` מוסיף את הלוח השני כתצוגה משנית (tooltip/שורה קטנה), לא כעמודה. הפורמטר המרכזי מקבל את שתי ההגדרות ומחזיר `{ primary, secondary? }`.

### 4.5 תקופות ו-presets (רמה B)

| קובץ | היום | שינוי |
|---|---|---|
| `src/hooks/useDateControls.ts` L50–63 | `new Date(y, m, 1)` / `new Date(y, 0, 1)` | `adapter.startOfMonth(today)`, `adapter.startOfYear(today)` — נגזר מ-`calendarType` בלבד: עברי = א' תשרי, לועזי = 1.1 (החלטה 6, אין הגדרה נפרדת) |
| `src/lib/utils/date-range.ts` `getPreviousPeriodRange` | הפרש במילישניות | תקופה קודמת "באותו אורך קלנדרי": חודש עברי קודם / שנה עברית קודמת (353–385 ימים!) |
| `src/hooks/usePeriodComparison.ts` | משתמש בנ"ל | ללא שינוי אם `date-range.ts` מקבל adapter |
| i18n `dashboard.json` `dateRange.month/year` | "מתחילת החודש"/"מתחילת השנה" | לשקול תווית דינמית: "מר"ח תשרי", "מא' תשרי תשפ"ז" |
| `onboarding.json` L16–18 | מסביר את הכרטיסים | לעדכן ניסוח אם ברירת המחדל משתנה |

### 4.6 גרף חודשי — הנקודה הקשה

| שכבה | קובץ | היום | אופציות |
|---|---|---|---|
| Postgres | `get_monthly_financial_summary(p_user_id, p_end_date, p_num_months)` | `date_trunc('month')`, `generate_series '1 month'`, `TO_CHAR 'YYYY-MM'` | (א) RPC חדש `get_period_financial_summary(p_user_id, p_boundaries date[])` שמקבל **מערך גבולות חודשים** מהקליינט ומקבץ עם `width_bucket`/`generate_subscripts` — אפס לוגיקת לוח בשרת. (ב) join ל-`hebrew_calendar_days`. (ג) להחזיר סיכום יומי (`get_daily_transaction_heatmap` כבר קיים!) ולקבץ בקליינט |
| Rust | `src-tauri/src/commands/chart_commands.rs` L21–144 | `chrono` `checked_add_months`, `%Y-%m` | אותו רעיון: לקבל `boundaries: Vec<String>` מה-TS ולהריץ שאילתה לכל טווח (הקוד כבר עושה לולאה לפי טווחים — שינוי קטן) |
| TS service | `src/lib/data-layer/chart.service.ts` | `MonthlyDataPoint { month_label: "YYYY-MM" }` | `month_label` הופך ל-`monthKey` של ה-adapter; `fetchServerMonthlyChartData(endDate, numMonths)` מחשב גבולות דרך adapter |
| Store | `src/lib/store.ts` L146–212 | dedupe לפי `month_label`, `currentChartEndDate` | ללא שינוי לוגי; **לנקות cache בעת החלפת `calendarType`** (אחרת ערבוב מפתחות) |
| UI | `components/dashboard/MonthlyChart.tsx` L99–104, 195–226 | `parse(month_label, "yyyy-MM")`, `subMonths`, `format "MMM yyyy"` | הכל דרך adapter: `monthLabel(key)` → "תשרי תשפ"ז"; "load more" = `adapter.addMonths(-1)` |
| Admin | `get_admin_monthly_trends`, `AdminTrendsChart` | גרגוריאני | **להשאיר גרגוריאני** — אדמין/מוניטורינג |

**המלצה:** אופציה (א) — RPC/פקודת Tauri שמקבלים גבולות. שומר על "השרת אגנוסטי ללוח", זהה לשתי הפלטפורמות, ולא דורש טבלת lookup. `get_monthly_financial_summary` הישן נשאר לתאימות.

### 4.7 מפרידי חודשים בטבלה ובייצוא

`TransactionsTableDisplay.tsx` L478–535 ו-`export-pdf.ts` L484–532 מקבצים לפי `date.substring(0, 7)`. להחליף ב-`adapter.monthKey(date)` + `adapter.monthLabel(key, lang)`. ב-PDF: שמות חודשים עבריים ב-RTL — התשתית (`drawRtlText`, `pdf-helpers.ts`) כבר קיימת מחוברת ההלכה.

### 4.8 Heatmap

`TransactionHeatmap.tsx`: גריד שבועות (ראשון–שבת) — **נכון גם ללוח עברי** (השבוע זהה). רק תוויות החודשים על ציר X (`format(..., "MMM")`, `getDate() <= 7`) ובחירת השנה (`tx_date.substring(0, 4)`) צריכות adapter. `get_daily_transaction_heatmap` ב-SQL ללא שינוי.

### 4.9 הוראות קבע (רמה C)

היום: **100% `frequency = 'monthly'`** בפרודקשן (880 שורות), `day_of_month` 1–31 גרגוריאני. הפיזור: 10 (186), 20 (152), 1 (130), 15 (79). ארבע אימפלמנטציות של "החודש הבא":

| מקום | קוד | הערה |
|---|---|---|
| TS (דסקטופ, catch-up) | `src/lib/recurring/recurring-date.utils.ts` `advanceMonthly` + `src/lib/services/recurring-transactions.service.ts` | clamp ל-`daysInMonth` |
| Edge (ווב, pg_cron 00:00 UTC) | `supabase/functions/process-recurring-transactions/index.ts` L23–34 | **העתק** של `advanceMonthly`; `today` = תאריך UTC |
| SQL legacy | `execute_due_recurring_transactions()`, `calculate_new_next_due_date()` | `+ INTERVAL '1 month'` נאיבי; **לא נקראות מהפרונט** (grep). `calculate_new_next_due_date` גם **מקולקלת** — אומת בפרודקשן: `select calculate_new_next_due_date(current_date, 31)` → `22008 date field value out of range: 2026-09-31`; ה-handler תופס `invalid_datetime_format` (22007) ולא `datetime_field_overflow` (22008). **למחוק את שתיהן** בשלב 0 |
| Rust | `recurring_transaction_commands.rs` | רק שאילתות `next_due_date <= today`; החישוב ב-TS |

לתמיכה ב"יום עברי בחודש" נדרש:
- עמודה חדשה `recurring_transactions.calendar_type text DEFAULT 'gregorian'` (Postgres + SQLite migration ב-`db_commands.rs`).
- `day_of_month` 1–30 (עברי) — CHECK קיים 1–31 מכסה.
- `advanceMonthly` עברי: עם Temporal — `date.add({ months: 1 })` ואז `.with({ day: dayOfMonth }, { overflow: "constrain" })`. **אדר: כל אדר הוא חודש (החלטה 5)** — בשנה מעוברת ההו"ק מתבצעת גם באדר א' (`M05L`) וגם באדר ב' (`M06`); Temporal עושה זאת אוטומטית כי `monthsInYear = 13`. **ל' בחודש בן 29 (חשוון/כסלו משתנים, טבת/אדר/אייר/תמוז/אלול קבועים) — נסגר: clamp לכ"ט** (`constrain`, כמו 31→28 היום). ראה סעיף 7 §2.
- **אדר בהגדרת הו"ק — לשמור `month_code` ולא רק `day_of_month`.** Temporal ו-hebcal מנרמלים בשקט "אדר א'" בשנה פשוטה ל"אדר"; בלי לשמור מה המשתמש *התכוון* (`M05L` = אדר א', `M06` = אדר/אדר ב') אי אפשר להבדיל בשנים הבאות. ההצעה לגל C: `recurring_transactions.calendar_type text` + `anchor_month_code text NULL` (רלוונטי רק ל-`frequency = 'yearly'` ולתצוגה; להו"ק חודשית לא נדרש כי "כל אדר הוא חודש").
- **חובה wrapper עם מדיניות מפורשת** — אסור להסתמך על ברירת המחדל של הספרייה: hebcal גולש (ל' טבת → א' שבט), Temporal מקצץ. אומת ב-18.9.2026.
- Edge function ב-Deno: `import { Temporal } from "npm:temporal-polyfill/full"` — לאחד את הלוגיקה עם ה-TS בקליינט דרך `supabase/functions/_shared/` (היום `advanceMonthly` הוא copy-paste בין `src/lib/recurring/` ל-edge).
- **Bulk APIs:** `bulk_update_user_recurring_transactions(p_updates jsonb)` ו-`fieldMapping.ts` חייבים להכיר את `calendar_type` החדש.
- UI: `RecurringFields.tsx` — בורר "לפי לוח" + רשימת ימים עבריים; `RecurringTransactionsTableDisplay.tsx` תצוגת `next_due_date`.
- ייבוא: `recurring-warning-detector.ts` משווה `getDate()` — להתאים.

### 4.10 תזכורות (רמה C)

| רכיב | היום | שינוי ללוח עברי |
|---|---|---|
| `profiles.reminder_day_of_month` + CHECK `{1,5,10,15,20,25}` | יום גרגוריאני | להוסיף `reminder_calendar_type` או להרחיב את הסמנטיקה; CHECK חדש לימים עבריים (א', ה', י', ט"ו, כ', כ"ה) |
| `get_reminder_users_with_emails(reminder_day)` | `reminder_day_of_month = reminder_day` | לקבל גם `calendar_type`; הקריאה מה-edge מחשבת את היום העברי של היום |
| `send-reminder-emails/index.ts` L288–365 | Israel TZ, דילוג שישי/שבת | + **דילוג יום טוב** (`@hebcal/core` `HebrewCalendar.getHolidaysOnDate(hd, il=true)` עם `CHAG` flag) + makeup; שים לב ל-33 משתמשי EN — ייתכן בחו"ל, יום טוב שני של גלויות |
| `reminder_run_logs` | `was_shabbat` | להוסיף `was_yom_tov`, `hebrew_date` |
| דסקטופ `reminder.service.ts` L57–66 | `today.getDate() === dayOfMonth` | `adapter.dayOfMonth(today) === dayOfMonth`; `lastReminderDate` נשאר ISO |
| `NotificationSettingsCard.tsx` | `day1…day25` | תוויות עבריות כשהלוח עברי |
| מייל | `email-he.json` | תאריך עברי בכותרת ("תזכורת לחודש תשרי") |

**ערך מוסף מיידי גם בלי לוח עברי מלא:** דילוג יום טוב בתזכורות — שינוי מבודד ב-edge function אחת.

### 4.11 "שנת מעשר" ויתרת מעשר (רמה C, מוצרי)

- `calculate_user_tithe_balance` (Postgres) ו-`donation_commands.rs` (Rust) — **all-time, ללא תאריך**. ה-onboarding מבטיח "יתרת המעשרות נשארת קבועה".
- `maaserYearStart` נועד לזה אך לא חובר, ו**נמחק** (החלטה 6): השנה העברית מתחילה בתשרי, נקודה. כשהלוח הראשי עברי — "השנה" = מא' תשרי; כשהוא גרגוריאני — מ-1 בינואר. הבסיס ההלכתי (נודע ביהודה) מדבר על **אי-העברה לכתחילה** של חוב עבר ראש השנה — לא על איפוס.
- לכן **לא** לשנות את סמנטיקת היתרה. במקום זה: **דוח "סיכום שנת מעשר"** (הכנסות, חובת מעשר, תרומות, יתרה לתחילת השנה ולסופה) לפי שנה עברית מתשרי — קריאה ל-`get_analytics_range_stats` עם טווח א' תשרי–כ"ט אלול + `calculate_user_tithe_balance` בגבול (דורש RPC חדש עם `p_as_of_date`). מתחבר ל-roadmap "advanced reports / annual reports" ב-`project-overview.md`.
- תזכורת "ערב ראש השנה — סגור את שנת המעשר" = event חד-שנתי בלוח העברי (edge function, כמו התזכורת החודשית).

### 4.12 Tauri / Rust

- אין לוח עברי ב-Rust ולא צריך אם התכנון הוא "גבולות מהקליינט" (4.6). קבצים שיושפעו: `chart_commands.rs` (חתימת הפקודה), `db_commands.rs` (מיגרציית עמודה ב-`recurring_transactions` לרמה C), `models.rs`.
- `recurring_transaction_commands.rs` L5 `chrono::Local` — "היום" מקומי — נכון ועקבי עם הקליינט.

### 4.13 Edge Functions (Deno)

- `process-recurring-transactions` — לרמה C בלבד.
- `send-reminder-emails` — יום טוב (מבודד), יום עברי (רמה C).
- `send-new-user-email` — אופציונלי: תאריך עברי בסיכום.
- כולן רצות ב-Deno — `npm:@hebcal/hdate` / `npm:@hebcal/core` נתמכים.

### 4.14 i18n

- `he/settings.json`, `en/settings.json` — `calendar.*` קיים; למחוק `weekStart*`, `nisan`, `january`; להוסיף `showSecondaryDateLabel` + תיאור + הערת "היום העברי מתחלף בחצות". שמות חודשים דרך `Intl` (he/en) — אין צורך במפתחות `hebrewMonths.*`.
- `dashboard.json` — תוויות presets דינמיות, `monthlyChart` tooltips.
- `transactions.json` / `data-tables.json` — "יום בחודש (עברי)".
- אנגלית: "Tishrei 5787" — hebcal נותן תעתיק סטנדרטי; `Intl` נותן "Tishri". לבחור אחד.

### 4.15 תיעוד ו-rules

- `llm-instructions/project/project-overview-and-requirements.md` L48 — "Calendar: Gregorian calendar." לעדכן.
- `llm-instructions/project/project-tech-stack-and-guidelines.md` — להוסיף את הספרייה.
- `llm-instructions/ui/multi-language-and-responsive-design-guide.md` — סעיף Localized Date Picker.
- `llm-instructions/project-structure.md` — `src/lib/calendar/`.
- להוסיף מסמך `llm-instructions/features/calendar/hebrew-calendar-guide.md` (חוזה adapter, monthKey, מדיניות אדר/ל' בחודש).
- `TODO.md` L5.

### 4.16 בדיקות

קיימות: `date-range.test.ts`, `recurring-date.utils.test.ts`, `hebrew-numeral.test.ts`. נדרש:
- `src/lib/calendar/*.test.ts` — טבלת אמת מול תאריכים ידועים (א' תשרי תשפ"ז = 12.9.2026; כ"ט אלול תשפ"ו = 11.9.2026; א' אדר ב' תשפ"ז = 10.3.2027 — **תשפ"ז מעוברת**, כמו תשפ"ד; ל' כסלו תשפ"ז = 10.12.2026 קיים), ל' חשוון קיים/לא קיים, round-trip. אומת מול `Intl.DateTimeFormat("en-u-ca-hebrew")`.
- `useDateControls` — presets עבריים (mock של "היום").
- `recurring` — `advanceMonthly` עברי: ל' → כ"ט, אדר בשנה מעוברת, מעבר אלול→תשרי.
- Edge: `send-reminder-emails` — יום טוב, makeup.
- E2E ידני: החלפת לוח מנקה cache של הגרף.

---

## 5. האתגרים

### 5.1 קלנדריים (מובנים בלוח העברי)
1. **12 או 13 חודשים.** שנה מעוברת מוסיפה אדר א'. כל `Array(12)`, `month % 12`, "12 חודשים אחרונים" — שבורים. `NUM_MONTHS_TO_FETCH = 6` תקין, אבל "שנה" ≠ 12 חודשים.
2. **חודשים של 29/30 ימים, וחשוון/כסלו משתנים בין שנים.** `day_of_month = 30` לא קיים בכל חודש — צריך clamp (יש תקדים: 31→פברואר).
3. **אדר א'/אדר ב' — נסגר (החלטה 5): כל אדר הוא חודש.** Temporal: אדר א' = `M05L`, אדר ב' = `M06`, ובשנה פשוטה אדר = `M06`. **מלכודת:** גם hebcal וגם Temporal (`constrain`) מנרמלים בשקט "אדר א'" בשנה פשוטה ל"אדר" — הו"ק שהוגדרה ב-כ' אדר א' תשפ"ז תתבצע בתשפ"ח ב-כ' אדר. זה כנראה רצוי, אבל צריך להיות מתועד ומכוסה בבדיקה.
4. **מיספור חודשים.** hebcal: ניסן=1, תשרי=7 → מיון שגוי בתוך שנה (הבאג `+1` בקוד הישן נבע מזה). **Temporal: תשרי=1** — פותר מובנה. אם בכל זאת hebcal — שכבת מיספור אזרחי בתוך ה-adapter.
5. **היום העברי מתחיל בשקיעה — נסגר (החלטה 3):** חצות אזרחית. להוסיף שורת הסבר בכרטיס ההגדרות.
6. **גימטריה.** תשפ"ז / 5787; ט"ו/ט"ז (לא י"ה/י"ו). `Intl` עם `nu-hebr` מטפל. `hebrew-numeral.ts` הקיים — לבדוק 15/16 לפני שימוש חוזר.
6a. **overflow של ספריות — אומת:** `@hebcal/hdate` **גולש** (ל' טבת → א' שבט); Temporal עם `constrain` **מקצץ** (→ כ"ט טבת), עם `reject` זורק. אסור להסתמך על ברירת מחדל — המדיניות (סעיף 7 §2) חייבת להיות ב-wrapper.

### 5.2 ארכיטקטוניים
7. **ארבע פלטפורמות חישוב:** TS (ווב+דסקטופ), PL/pgSQL, Rust, Deno. כל לוגיקת לוח שתשוכפל תסתנכרן רע (כמו ש-`advanceMonthly` כבר משוכפל TS↔Deno). המענה: לוח **רק ב-TS** (קליינט + edge, אותה חבילה), שרתים מקבלים גבולות.
8. **חוזה `month_label = "YYYY-MM"`** משותף ל-RPC, Rust, store ו-UI. שינויו הוא breaking change פנימי — עדיף `monthKey` opaque + `monthLabel` נפרד.
9. **Cache בחלפת לוח.** `serverMonthlyChartData`, `currentChartEndDate`, `lastDbFetchTimestamp` — לנקות ב-`updateSettings({calendarType})`.
10. **סנכרון העדפות ישנות.** 279 פרופילים עם `calendarType: "gregorian"` ו-335 עם `maaserYearStart: "01-01"` — השדה `maaserYearStart` נמחק (החלטה 6) ולכן חייב להיות מסונן ב-whitelist של `PreferencesSyncService` בעת merge מה-DB, ולהימחק ב-`onRehydrateStorage`; `UPDATE` חד-פעמי ב-DB אופציונלי.
11. **`react-day-picker` `dateLib`** — API פנימי-למחצה. שדרוג עתידי (v11) עלול לשבור. לעטוף ולכסות בבדיקות.
12. **גודל bundle.** `@hebcal/hdate` ~60KB minified מוערך — קביל ל-PWA. `@hebcal/core` (עם `temporal-polyfill`) — **לא** לקליינט, רק ל-edge.
13. **UTC drift — באג קיים, לא רק סיכון עתידי.** 25 מופעים של `toISOString().split("T")[0]` ב-`src/` וב-edge. הבעייתיים: `TransactionsFilters.tsx` L135–138 ו-`tableTransactionService.ts` L80–83, L171–174 ממירים חצות מקומית מבוחר הטווח דרך UTC → בישראל (UTC+2/3) התאריך הוא **אתמול** → סינון טווח מוזז ביום; `TransactionForm.tsx` L110/426 ו-`OpeningBalanceModal.tsx` L285 — תאריך ברירת המחדל לתנועה חדשה בין 00:00–03:00 בישראל הוא אתמול; `date-range.ts` L15–16 (השוואת תקופות); `chart.service.ts` L33; `reminder.service.ts` L69. ב-edge: `process-recurring-transactions` L223 מחשב `today` ב-UTC (ה-cron רץ 00:00 UTC = 02:00/03:00 ישראל). `send-reminder-emails` כבר משתמש ב-`Asia/Jerusalem` — לאחד. **תנאי מקדים ללוח שני** (שלב 0): כל תאריך-יום דרך `formatLocalDate`/`parseLocalDate` מ-`recurring-date.utils.ts`; לא `toISOString`.
13a. **רישוי.** hebcal = `GPL-2.0` (לא or-later) מול AGPL-3.0 — ראה סעיף 3.4. Temporal polyfill = MIT.

### 5.3 נתונים
14. **תאריכים זבל.** `MIN(transactions.date) = 0002-01-19` בפרודקשן. hebcal יחזיר שנה 3762 — לא יקרוס, אבל תצוגות "שנה" ו-"all time" יהיו מוזרות. לשקול ולידציה בייבוא.
15. **Excel.** אין פורמט תאריך עברי ב-Excel; רק כעמודת טקסט.
16. **ייבוא (`normalize.ts`)** — מקבל DD/MM/YYYY וכו'. תמיכה בקלט "ז' תשרי תשפ"ז" = פיצ'ר נפרד (parser עברי, אופציונלי).

### 5.4 מוצר / UX
17. **"במקום" או "לצד" — נסגר (החלטות 2, 7).** לוח ראשי אחד קובע פורמט ותקופות; `showSecondaryDate` מוסיף את השני כתצוגה משנית בלבד. ברירת מחדל גרגוריאני, כך שמשתמש שלא נגע בהגדרות לא מרגיש שינוי. הבעיה "תלוש ב-1 לחודש הגרגוריאני נופל באמצע חודש עברי" נשארת למי שבוחר עברי — להסביר בתיאור ההגדרה.
18. **תוויות presets.** "מתחילת השנה" — איזו שנה? להוסיף את התאריך בפועל בתווית/tooltip ("מא' תשרי תשפ"ז"), במיוחד כש-`showSecondaryDate` פעיל.
19. **משתמשי חו"ל (33 EN).** יום טוב שני של גלויות; hebcal `il` flag לפי מיקום — אין שדה מיקום בפרופיל; `terms_accepted_metadata.time_zone` הוא רמז חלש.
20. **הבטחת onboarding** "יתרת המעשרות נשארת קבועה" — לא לשבור. שנת מעשר = דוח, לא איפוס.
21. **אדמין** — נשאר גרגוריאני (מוניטורינג, טרנדים) כדי לא לסבך.

---

## 6. איך זה יקרה — מפת דרכים מוצעת

| שלב | תכולה | קבצים עיקריים | מאמץ משוער | תלות |
|---|---|---|---|---|
| **P1. CI לטסטים** | `ci.yml` על כל PR: `tsc --noEmit`, `eslint`, `vitest run` (matrix `TZ=UTC`/`Asia/Jerusalem`), `deno test supabase/functions`, `cargo test` ב-`src-tauri`. **שער:** כל 35+13 קבצי הטסט הקיימים ירוקים | `.github/workflows/ci.yml` | ½ יום | — |
| **P2. סביבת בדיקות** | ענף `testing` מחדש כ-`--persistent --with-data` (סעיף 9.3 ב'), נטרול מיילים בענף, vault, functions deploy; `.env.testing` + Vercel preview env. **שער:** סקריפט השוואת `information_schema` ענף↔פרוד ירוק | Supabase Dashboard/CLI, `MIGRATION_VAULT_SETUP.md` | ½–1 יום | — |
| **P3. פלואו פריסה** | `deploy-supabase-migrations.yml`: PR → ענף בלבד, main → פרוד; guard ל-`main` ב-`deploy-functions.js` ו-`release.cjs`; עדכון `supabase-database-migrations-workflow.md` | 2 workflows, 2 סקריפטים, doc | ½ יום | P2 |
| **P4. רשת ביטחון** | Characterization tests שמקפיאים התנהגות גרגוריאנית נוכחית (סעיף 9.5 שורה ראשונה). **שער:** snapshot לכל preset/מפריד/`advanceMonthly`/`extractClientPreferences` | `src/**/*.test.ts` חדשים | 1–2 ימים | P1 |
| **P5. baseline (מקביל, לא חוסם)** | Dump סכמה → מיגרציה אחת; `migration repair` בפרוד; מחיקת 174 stubs; `seed.sql` סינתטי עם מקרי קצה עבריים | `supabase/migrations/`, `supabase/seed.sql`, `scripts/generate-seed.ts` | 1–2 ימים | P3 |
| **0a. ביקורת UTC** | להחליף את 25 מופעי `toISOString().split("T")[0]` בתאריכי-יום ב-`formatLocalDate`; edge `process-recurring-transactions` ל-`Asia/Jerusalem`. **מתקן באג קיים** בסינון טווחים ובתאריך ברירת מחדל | ~12 קבצים + edge אחת | 1 יום | — |
| **0b. ניקוי** | למחוק `maaserYearStart` מה-store; whitelist ב-`PreferencesSyncService`; `UPDATE` ניקוי ב-DB; למחוק `weekStart*`/`nisan`/`january` מ-i18n; **למחוק** `execute_due_recurring_transactions` ו-`calculate_new_next_due_date` (לא בשימוש, השנייה מקולקלת) | `store.ts`, `preferences-sync.service.ts`, `settings.json`, מיגרציה | ½ יום | — |
| **1. ליבה** | `src/lib/calendar/` + adapters (Temporal) + בדיקות טבלת אמת; `calendarType` + `showSecondaryDate` ב-store + `CalendarSettingsCard` (משוחזר ומפושט); החלטת רישוי. **כולל spike של ½ יום:** המודול יושב ב-`supabase/functions/_shared/calendar/`, Vite alias + `deno.json` import map, וטסט פאריטי אחד (אותו fixture ב-vitest וב-`deno test`) — מוכיח את מסלול השיתוף לפני שנשענים עליו בגל C | חדש + `SettingsPage.tsx` + `vite.config.ts` + `supabase/functions/deno.json` | 2–3 ימים | 0a, 0b |
| **2. רמה A — תצוגה** | כל נקודות הפורמט בסעיף 4.4 עוברות לפורמטר המרכזי (`{primary, secondary?}`); PDF/CSV/Excel עם עמודה לועזית קבועה; date-picker עם כיתוב עברי (עדיין גריד גרגוריאני) | ~15 קבצים | 2–3 ימים | 1 |
| **3. גריד עברי** | `HebrewDateLib` ל-`react-day-picker`; caption/dropdown; RTL | `calendar.tsx`, `date-picker.tsx`, `date-range-picker.tsx` | 2–3 ימים | 1 |
| **4. רמה B — תקופות** | `useDateControls`, `date-range.ts`, מפרידי חודשים (טבלה + PDF), heatmap labels; RPC/Tauri "גבולות" + `MonthlyChart` על `monthKey`; ניקוי cache | `useDateControls.ts`, `chart.service.ts`, מיגרציה RPC, `chart_commands.rs`, `MonthlyChart.tsx`, `store.ts` | 4–5 ימים | 1 |
| **5. יום טוב בתזכורות** | דילוג חג + makeup ב-`send-reminder-emails`; `was_yom_tov` בלוג | edge function אחת + מיגרציה | 1 יום | — (עצמאי!) |
| **6. רמה C — הוראות קבע עבריות** | `calendar_type` ב-`recurring_transactions` (PG + SQLite); `advanceMonthly` עברי משותף TS/Deno; UI | ~10 קבצים בשלוש שפות | 4–5 ימים | 1, 4 |
| **7. רמה C — תזכורות ביום עברי** | `reminder_calendar_type`, CHECK, RPC, edge, desktop | ~8 קבצים | 2 ימים | 1, 5 |
| **8. דוח שנת מעשר** | RPC `p_as_of_date` ליתרה; עמוד/כרטיס סיכום שנתי מתשרי; תזכורת ערב ר"ה | חדש | 3–4 ימים | 4 |
| **9. תיעוד** | `llm-instructions`, `TODO.md`, changelog, whats-new | — | ½ יום | כל שלב |

**שער יציאה לכל שלב** (חובה לפני שממשיכים): הטסטים שמפורטים לשלב בסעיף 9.5 ירוקים ב-CI; מצב `gregorian` זהה ל-snapshot של P4; המיגרציות של השלב (אם יש) הוחלו על ענף `testing` ו-Vercel preview מולו נבדק. רק אז merge ל-main → פרוד.

**מה חוסם מה (כדי שהתשתית לא תאכל את החלון):**

| שלב בפיצ'ר | תנאי מקדים הכרחי | יכול לרוץ במקביל |
|---|---|---|
| 0a, 1, 2, 3 (רמה A — קוד קליינט בלבד, אין מיגרציות) | **P1 + P4** | P2, P3, P5 |
| 0b (כולל `DROP FUNCTION` + `UPDATE` — מיגרציה ראשונה) | P1, P2, **P3** | P5 |
| 4 (רמה B — RPC גבולות = מיגרציה) ו-5 (יום טוב = edge + מיגרציית לוג) | P1–P4 | P5 |
| 6–8 (גל C) | **P1–P5** כולם, כולל baseline + seed | — |

כלומר: אפשר לראות תאריך עברי במסך (preview) אחרי P1+P4+0a+1+2 — כ-**שבוע** — בלי לחכות לענף `testing`. הכלל שמאפשר זאת: **אין `supabase/migrations/**` באותו PR עם קוד UI**, ורק SQL אדיטיבי (סעיף 8.2).

סה"כ: תשתית (P1–P5) **~4–6 ימים** (חלקה במקביל); רמה A+B **~2–3 שבועות**; רמה C מוסיפה ~2 שבועות. שלב 5 (יום טוב) הוא "פרי נמוך" שניתן לשחרר מיד אחרי P1–P3.

**סטטוס P1 (22.9.2026): הושלם, שער מקומי ירוק; הרצת GitHub-hosted ראשונה ממתינה ל-PR.** נוסף `ci.yml` לקריאה בלבד עם Node 24, בדיקות אפליקציה ב-`UTC` וב-`Asia/Jerusalem`, בדיקות Edge ב-Vitest ו-`cargo test --locked`. היקף Node של TypeScript נקי ונאכף רגיל; 103 אבחנות TypeScript ב-app ו-198 אבחנות ESLint קיימות (172 שגיאות, 26 אזהרות) מתועדות ב-baseline דטרמיניסטי ונאכפות ב-ratchet: כל תוספת או הסרה מחייבת עדכון baseline מפורש לאחר review. כל 373 בדיקות Vitest ו-43 בדיקות Rust עברו מקומית.

---

## 7. החלטות — סטטוס

| # | שאלה | סטטוס | תשובה |
|---|---|---|---|
| 1 | היקף | **נסגר** | A+B (תצוגה, בוחר, תקופות דשבורד) ראשון; הו"ק/תזכורות עבריות = גל נפרד |
| 2 | ל' בחודש בן 29 ימים | **נסגר: clamp** | כ"ט בחודש הקצר; חוזה ה-adapter (`endOfMonth`, `advanceMonthly`, טסטים) מהיום הראשון. הסבר למטה |
| 3 | הגדרה אחת או שתיים | **נסגר** | לוח ראשי אחד קובע פורמט + תקופות; `showSecondaryDate` לתצוגה משנית |
| 4 | ברירת מחדל | **נסגר** | תמיד גרגוריאני; קיימים לא משתנים |
| 5 | אדר בשנה מעוברת | **נסגר** | כל אדר הוא חודש — הו"ק בשניהם |
| 6 | תחילת שנה עברית | **נסגר** | תשרי; `maaserYearStart` נמחק |
| 7 | קיבוץ חודשי בשרת | **המלצה** | RPC/פקודת Tauri שמקבלים גבולות מהקליינט |
| 8 | "שנת מעשר" | **המלצה** | דוח בלבד מתשרי; לא מודל יתרה חדש |
| 9 | קלט ידני עברי בבוחר | **המלצה** | לא בשלב 1 |
| 10 | משתמשי חו"ל / יום טוב שני | **פתוח (רלוונטי רק לגל C)** | להניח ישראל בהתחלה |
| 11 | רישוי | **המלצה** | Temporal (MIT) כליבה; hebcal רק לחגים ב-edge, או לשאול את המתחזק |

**§2 — ל' בחודש בן 29 ימים, מוסבר.** בלוח העברי יש חודשים של 30 ימים (תשרי, שבט, ניסן, סיוון, אב, ואדר א') ושל 29 ימים (טבת, אדר/אדר ב', אייר, תמוז, אלול); חשוון וכסלו משתנים משנה לשנה. משתמש שמגדיר הו"ק ל-**ל' בחודש** יגיע לחודש שאין בו ל'. שתי אפשרויות:

| | **clamp** — כ"ט בחודש הקצר | **roll** — א' בחודש הבא |
|---|---|---|
| דוגמה | הו"ק ל-ל' → ל' חשוון, ל' כסלו, **כ"ט טבת**, ל' שבט, **כ"ט אדר**… | ל' חשוון, ל' כסלו, **א' שבט**, ל' שבט, **א' ניסן**… |
| היגיון | "היום האחרון בחודש" — כמו 31→28 בפברואר בקוד הקיים | "ראש חודש" — ל' וא' הם שני ימי ר"ח; א' הוא ר"ח גם בחודש קצר. מתיישב עם החלטה 4 |
| חיובים בשנה | 12/13 — אחד בכל חודש | 12/13 — אבל **שניים** בחודש שאחרי חודש קצר (א' + ל') ואפס בחודש הקצר |
| מימוש | Temporal `constrain` (מובנה) | hebcal default; ב-Temporal `add({months:1})` ואז אם `daysInMonth < 30` → `.add({days:1})` |
| המלצה | **כן** — עקבי, צפוי, אחד בחודש | לא — כפילות בחודש עוקב מבלבלת בדוחות חודשיים |

ההשפעה בפועל קטנה: בפרודקשן **אין** הו"ק עם `day_of_month = 30` היום, וההו"ק העבריות הן גל נפרד. אבל המדיניות צריכה להיות כתובה ב-adapter מהיום הראשון כי היא משפיעה גם על `endOfMonth` בתקופות.

---

## 8. תאימות דסקטופ-אופליין וסיכוני פרודקשן בזמן הביצוע (22.9.2026)

### 8.1 דסקטופ (Tauri, Windows בלבד — `release.yml` matrix: `windows-latest`)

| נושא | מצב | הערה |
|---|---|---|
| אחסון | תואם מלא | SQLite שומר `date` ISO לועזי — זהה לווב. גרסה ישנה של הדסקטופ קוראת את אותו DB בלי בעיה |
| הגדרות | תואם מלא | `client_preferences` JSON ב-`app_settings` — שדות חדשים עוברים אוטומטית (`desktop-settings.service.ts`) |
| ספריות | תואם, אופליין | `temporal-polyfill/full` נארז ב-bundle; `Intl` עם `u-ca-hebrew` נתמך ב-WebView2 (Chromium, ICU מלא). אין קריאות רשת |
| ייבוא/ייצוא JSON | תואם | `importSchemas.ts` הוא `.passthrough()`; הייצוא (v2) לא כולל הגדרות |
| KPI / טווחים | תואם | פקודות Rust מקבלות `start/end` כמחרוזות — טווח עברי מתורגם בקליינט |
| **גרף חודשי** | **דורש Rust** | `chart_commands.rs` — פקודה חדשה שמקבלת `boundaries: Vec<String>`; TS + Rust נשלחים באותו release, אין skew |
| **הו"ק עברית (גל C)** | **דורש Rust + SQLite migration** | `db_commands.rs` — `ALTER TABLE recurring_transactions ADD COLUMN calendar_type TEXT DEFAULT 'gregorian'`; `models.rs`. `from_row` בשמות עמודות → downgrade לא נשבר |
| **פאריטי הו"ק** | **פער קיים** | דסקטופ מריץ `processDueTransactions` ב-TS; ווב ב-Deno edge — `advanceMonthly` משוכפל. פתרון: המודול `src/lib/calendar/` יושב פיזית ב-`supabase/functions/_shared/calendar/` (Deno מחייב), Vite מייבא אותו דרך alias; `deno.json` import map ממפה `temporal-polyfill/full` → `npm:temporal-polyfill/full` |
| תזכורות דסקטופ | תואם | `reminder.service.ts` TS; אין היום דילוג שבת בדסקטופ — יום טוב יצטרך טבלת חגים מקומית (אופליין) |
| Timezone | תואם | `chrono::Local` + JS local — עקבי. ביקורת UTC (שלב 0a) מתקנת גם דסקטופ |
| CI | מכוסה | `tauri-build-check.yml` מקמפל Rust בכל PR |

**מסקנה:** התכנית תואמת לדסקטופ אופליין במלואה בזכות ההכרעה "אחסון לועזי". שני שינויי Rust (גרף; גל C) הם הנקודות היחידות שדורשות release דסקטופ מסונכרן.

### 8.2 מה יכול לשבור פרודקשן לפני merge ל-main

| מסלול | מה קורה בפועל (אומת) | סיכון בתכנית | מיטיגציה |
|---|---|---|---|
| **מיגרציות** — `deploy-supabase-migrations.yml` | `on: pull_request` עם paths `supabase/migrations/**` → `supabase db push` ל-**פרודקשן** ברגע פתיחת/עדכון PR (גם Draft). מתועד כמכוון ב-`supabase-database-migrations-workflow.md` L8 | **גבוה.** כל SQL בענף = פרוד. PR שננטש משאיר סכמה יתומה (אסור לערוך מיגרציה שהוחלה) | PR מיגרציה נפרד ואחרון, רק SQL אדיטיבי/idempotent (`IF NOT EXISTS`, `OR REPLACE` באותה חתימה, DEFAULT). לכל מיגרציה — סקריפט rollback מוכן. לשקול: `on: push: main` + `workflow_dispatch` בלבד, או label `deploy-migration` |
| **שינוי חתימת RPC** שה-edge הפרוסה קוראת | Edge נפרסות רק ב-`push: main` (`deploy-supabase-functions.yml`). מיגרציה ב-PR שמחליפה חתימה (למשל `get_reminder_users_with_emails`) → ה-edge הישנה בפרוד נכשלת **מיידית** ב-18:00 UTC | **גבוה בגל C** | overload חדש, לא החלפה. מחיקת הישן רק ב-PR אחרי merge + deploy |
| **מחיקת RPCs מתים** (שלב 0b) | `calculate_new_next_due_date`, `execute_due_recurring_transactions` — אין קריאות ב-`src/`, ב-edge או ב-`cron.job` (אומת) | נמוך | `DROP FUNCTION IF EXISTS` |
| **RPC גבולות חדש** | אדיטיבי | נמוך | — |
| **`UPDATE profiles ... - 'maaserYearStart'`** | שינוי נתונים ב-335 שורות; קליינט ישן ב-main ידחוף חזרה `"01-01"` (default ב-`Settings`) עד שה-merge | נמוך (רעש בלבד) | להריץ **אחרי** merge, או לוותר (whitelist בקליינט מספיק) |
| **Vercel preview / `npm run dev`** | אין staging — `ngtsnskyupageagcmqdp` מת (timeout; מתועד כמחוק). Preview ו-local `.env` מדברים עם **DB הפרוד** | **בינוני.** קוד חדש כותב `client_preferences` לפרופילים אמיתיים של הבודקים; באג ב-whitelist של `PreferencesSyncService` יכול לדרוס העדפות (למשל `onboarding`, `language`) של הבודק | בדיקות יחידה ל-`extractClientPreferences` לפני preview; לבדוק עם משתמש test ייעודי; לשקול staging זמני לגל C |
| **`npm run deploy-supabase`** ידני | קורא `VITE_SUPABASE_PROJECT_REF` מ-`.env` → פרוד. הרצה מענף = פריסת edge לא ממורג'ת לכל המשתמשים (הו"ק ב-00:00 UTC) | **גבוה בגל C**, פרוצדורלי | לא להריץ מענפים; להוסיף guard בסקריפט (`git branch --show-current === 'main'`) |
| **`npm run release`** | `release.cjs` → `git push` + tag → `release.yml` בונה ומעדכן `latest.json` → **כל משתמשי הדסקטופ** מקבלים עדכון, מכל ענף | **גבוה**, פרוצדורלי | guard בסקריפט לענף main; release רק אחרי merge |
| Edge ↔ DB skew | `calendar_type` נוסף ב-PR, edge ישנה לא מכירה | אפס | `DEFAULT 'gregorian'` |

**כללי אצבע לביצוע:** (1) PRs של קוד קליינט/Rust/edge בלי `supabase/migrations/**` — לא נוגעים בפרוד עד merge. (2) מיגרציה = PR נפרד, אדיטיבי, פותחים אחרון, עם rollback כתוב. (3) שינוי חתימה = overload. (4) `deploy-supabase` ו-`release` רק מ-main. (5) גל C (הו"ק/תזכורות) — להקים staging זמני.

## 9. סביבת בדיקות (ענף `testing`) ואסטרטגיית טסטים (22.9.2026)

### 9.1 מצב הענף `testing` (`ghzcsmscsympfxknubcp`) — לא שמיש כרגע

| ממצא | ערך |
|---|---|
| סטטוס Branching | **`MIGRATIONS_FAILED`**, `with_data: false` |
| מיגרציות שהוחלו | 38 מתוך 174, האחרונה `20250611072533` (יוני 2025) |
| טבלאות | 3 בלבד (`profiles`, `recurring_transactions`, `transactions`) — 0 שורות. חסרות: `reminder_run_logs`, `app_kv_store`, `contact_messages`, `admin_emails`, `download_*` |
| עמודות | סכמה ישנה: `transactions.is_recurring`, `recurring_day_of_month` (נמחקו בפרוד); **חסרות** `payment_method`, `original_amount`, `conversion_*`, `occurrence_number`; `profiles` בלי `default_currency`, `client_preferences`, `reminder_*`, `terms_*` |
| פונקציות | 15 מתוך ~55 (כולל `hello_world`; בלי analytics/admin/bulk RPCs) |
| pg_cron / vault secrets | אין |

**שורש הבעיה — לא הענף, אלא ההיסטוריה:** 123 מ-174 קבצי המיגרציה ב-`supabase/migrations/` הם stubs של `SELECT 1` ("Legacy migration, applied before repo sync"). ה-`CREATE TABLE` של הטבלאות המרכזיות מעולם לא היה ב-repo. Branching שיחזר את 38 הראשונות מה-`statements` השמורים ב-`schema_migrations` של פרוד ונפל על ה-39. **כל סביבה חדשה (ענף, staging, local) תיכשל באותה נקודה** עד שההיסטוריה תהיה ניתנת לשחזור.

### 9.2 האם צריך דאטה?

**לא דאטה של פרוד.** שלוש סיבות: PII (מיילים, שמות, תנועות כספיות של 638 משתמשים) בסביבת בדיקות; `with_data: true` הוא פיצ'ר בתשלום/beta ולא פותר את בעיית הסכמה; ובעיקר — לבדיקות לוח עברי **seed סינתטי טוב יותר** כי אפשר לבנות בכוונה מקרי קצה: תנועות סביב א' תשרי, ל' חשוון בשנה שיש/אין, אדר א'/ב' תשפ"ז, הו"ק ל-ל' בחודש, משתמש `he` ומשתמש `en`, משתמש עם `client_preferences` ישן (`calendarType: "gregorian"`, `maaserYearStart: "01-01"`).

מימוש: `supabase/seed.sql` (Branching מריץ אותו אוטומטית ביצירת ענף; אין כזה היום) עם 3–4 משתמשי `auth.users` + פרופילים + ~200 תנועות + ~10 הו"ק שנוצרות מסקריפט Node דטרמיניסטי (`scripts/generate-seed.ts`) — כך אפשר לחדש את ה-seed כשהסכמה משתנה.

### 9.3 שתי דרכים לסביבת בדיקות תקינה

#### אופציה ב' (מהירה) — שכפול פרוד כולל דאטה, כמו ה-staging הישן

שוחזר מהיסטוריית השיחות (מאי 2026): ה-staging הישן (`tjnghtfoafuizwuexoyp`, ואחריו `ngtsnskyupageagcmqdp`) **לא** נבנה ממיגרציות אלא נוצר כ-**Supabase Branch שהוא עותק של production כולל דאטה** — `supabase branches create staging --persistent --with-data` (או Dashboard → Branches → Create → "Include data"). זה עקף את בעיית ה-stubs כי הסכמה הגיעה משכפול, לא מה-repo. הצעדים אז:

1. `supabase branches create <name> --persistent --with-data --project-ref flpzqbvbymoluoeeeofg` (Persistent = לא נמחק/נעצר אוטומטית; ~10$/חודש).
2. **`schema_migrations`:** בפעם הקודמת הענף נכשל (`MIGRATIONS_FAILED`) כי ל-פרוד עצמו חסרו רשומות 2026 ב-`supabase_migrations.schema_migrations`, אז Supabase ניסה להריץ אותן מחדש על סכמה קיימת. תוקן אז ב-פרוד (`INSERT ... schema_migrations` / `supabase migration repair --status applied <version>` לכל גרסה). **היום פרוד מסונכרן** (CI רושם כל push) → עותק חדש אמור להגיע עם היסטוריה מלאה ולא להיכשל. אם בכל זאת — `migration repair` על הענף בלבד.
3. Vault: `select vault.create_secret('https://<branch-ref>.supabase.co', 'functions_base_url', ...)` + `service_role_key` של הענף (`MIGRATION_VAULT_SETUP.md`).
4. לוודא `cron.job` (4 jobs) קיימים ומצביעים ל-URL של הענף — **או להשבית** אותם בענף כדי שלא יישלחו מיילים אמיתיים למשתמשים המשוכפלים.
5. `npx supabase functions deploy --project-ref <branch-ref>` לכל הפונקציות.
6. `.env` מקומי / Vercel preview → URL + anon key של הענף.

**שים לב לפני שמשכפלים דאטה:** (א) בענף יהיו מיילים אמיתיים של 638 משתמשים — **חובה** להשבית/לנטרל את `send-reminder-emails` ו-`send-new-user-email` בענף (או להחליף `auth.users.email` ל-`user_<id>@example.test` מיד אחרי השכפול); (ב) `--with-data` דורש Pro ותלוי בזמינות הפיצ'ר "branch with data" בחשבון; (ג) הענף הוא snapshot — הדאטה מתיישן, ו-`reset_branch` ימחק אותו.

#### אופציה א' (נכונה לטווח ארוך) — baseline

1. **Dump של הסכמה הנוכחית מפרוד** (סכמה בלבד, בלי דאטה): `supabase db dump --linked -f supabase/migrations/<ts>_baseline.sql` (סכמת `public`: טבלאות, RLS, פונקציות, טריגרים, indexes, grants). להוסיף ידנית: הטריגר `on_auth_user_created` על `auth.users` (מחוץ ל-`public`), 4 ה-`cron.schedule(...)` (מ-`20260716100000_cron_jobs_use_vault_secrets.sql`), והוראות vault (`MIGRATION_VAULT_SETUP.md` — סודות נקבעים ידנית לכל סביבה).
2. **למחוק** את 174 הקבצים הקיימים (stubs + אמיתיים — כולם כבר בתוך ה-baseline).
3. **לסמן ב-פרוד כ"הוחל" בלי להריץ:** `supabase migration repair --status applied <ts>` (וגם `--status reverted` לגרסאות הישנות) — אחרת ה-CI ינסה להריץ את ה-baseline על פרוד ויתפוצץ על `already exists`. **זה הצעד הרגיש** — לעשות עם `workflow_dispatch` כבוי/מושבת זמנית.
4. ליצור את הענף `testing` מחדש (או `reset_branch`) — עכשיו הוא ייבנה מ-baseline + seed.
5. לוודא: `list_tables` בענף == פרוד (השוואת `information_schema.columns` בין השניים בסקריפט).

**המלצה משולבת:** להתחיל עם **ב'** (שעה עבודה, מוכר, נותן סביבה שלמה מיד) כדי לא לחסום את הפיצ'ר; לעשות **א'** במקביל כחוב תשתיתי — בלי baseline אין local dev, אין seed סינתטי למקרי הקצה של הלוח העברי, ואין ענפי preview אוטומטיים per-PR.

### 9.4 הפלואו החדש

| אירוע | היום | מוצע |
|---|---|---|
| PR נפתח / מתעדכן | `db push` → **פרוד** | Supabase GitHub integration יוצר/מעדכן ענף preview מה-PR (מיגרציות + edge functions + seed); או CI `db push` ל-`ghzcsmscsympfxknubcp` בלבד |
| Vercel preview | env של פרוד | Supabase↔Vercel integration מזריק `VITE_SUPABASE_URL/ANON_KEY` של הענף ל-preview; production env נשאר פרוד |
| merge ל-main | `db push` → פרוד (idempotent) | **רק כאן** `db push` + `functions deploy` לפרוד — אחרי שהבדיקות בענף ירוקות |
| `npm run deploy-supabase`, `npm run release` | ידני, מכל ענף | guard ל-`main` בסקריפט |
| ענף `testing` | — | persistent (`persistent: true`), ~10$/חודש; `reset_branch` לפני כל מחזור בדיקות |

### 9.5 אסטרטגיית טסטים — שערים לכל שלב

**מצב היום:** 35 קבצי vitest ב-`src/`, 13 ב-edge, ~43 `#[test]` ב-Rust (SQLite in-memory). **אין** workflow CI שמריץ `npm test` / `cargo test` / Deno tests — רק security-audit, tauri-build (קומפילציה בלבד) ו-deploys. **אין** RTL/jsdom, **אין** Playwright, **אין** pgTAP.

**עיקרון:** מצב `gregorian` חייב להישאר **זהה ביט-לביט** אחרי הרפקטור. זה מה שמאפשר לוותר על בדיקה ידנית — לא "לבדוק שהעברי עובד" אלא "להוכיח שהלועזי לא השתנה, ושהעברי עומד בטבלת אמת".

| שלב | טסטים חובה לפני שממשיכים | סוג |
|---|---|---|
| **טרום-0: רשת ביטחון** (תקדים: קומיט `4754675` "phase-0 safety net") | Characterization tests שמקפיאים פלט נוכחי: `useDateControls` לכל preset עם `today` מזויף (כולל 31.12, 1.1, 29.2); `getPreviousPeriodRange`; מפתחות מפרידי חודשים ב-`TransactionsTableDisplay`/`export-pdf` על fixture של 50 תנועות; `MonthlyChart` labels; `advanceMonthly` לכל `day_of_month` 1–31 × 12 חודשים × שנה מעוברת; `extractClientPreferences` | vitest, snapshot |
| **0a UTC** | טסט לכל helper חדש עם `vi.setSystemTime` ב-`Asia/Jerusalem` 00:30 ו-23:30, ו-`TZ=UTC` vs `TZ=Asia/Jerusalem` בריצת CI (matrix) — מוכיח שהבאג נעלם | vitest |
| **0b ניקוי** | `PreferencesSyncService.syncPreferences` עם DB fixture שמכיל `calendarType`/`maaserYearStart` ישנים → store נקי; מיגרציית DROP מוחלת על הענף ו-`\df` מאשר | vitest + SQL בענף |
| **1 ליבה** | **טבלת אמת** 5780–5800: א' תשרי, ט"ו ניסן, א' אדר א'/ב', ל' חשוון/כסלו קיים/לא, מול תאריכים ממקור חיצוני מוכר (Intl כמקור שני עצמאי). **Property test:** round-trip greg→heb→greg לכל יום 1900–2100 (73K, <1s). `monthKey` ממוין לקסיקוגרפית = ממוין כרונולוגית. clamp: ל' → כ"ט בכל חודש קצר. `reject` על אדר א' בשנה פשוטה. `HebrewDateLib` מול ה-`DateLib` המקורי: `startOfMonth/endOfMonth/addMonths` עקביים | vitest |
| **2 תצוגה** | לכל 15 נקודות הפורמט: snapshot עם `gregorian` **זהה לפני/אחרי**; snapshot עם `hebrew` ו-`hebrew+secondary`. PDF: `pdf-parse` על הפלט ובדיקת מחרוזות (תשתית קיימת ב-`export-halacha-pdf.test.ts`). CSV/Excel: עמודה לועזית תמיד קיימת | vitest |
| **3 גריד עברי** | `react-day-picker` ב-jsdom (להוסיף `@testing-library/react` + `jsdom`): תשרי תשפ"ז מציג 30 תאים, כ"ט אלול → א' תשרי בניווט, אדר א'/ב' שניהם מופיעים ב-dropdown בתשפ"ז ולא בתשפ"ח | vitest + RTL |
| **4 תקופות** | RPC גבולות: **טסט השוואה** בענף — לכל משתמש seed, סכום לפי גבולות עבריים == סכום מחושב בקליינט מ-`get_daily_transaction_heatmap` (שני מסלולים עצמאיים). Rust: `#[test]` לפקודה החדשה על אותו fixture. cache: החלפת `calendarType` מאפסת `serverMonthlyChartData`. `getPreviousPeriodRange` עברי: שנה קודמת = 353–385 ימים | vitest + SQL בענף + cargo test |
| **5 יום טוב** | `send-reminder-emails`: fixture של 8 תאריכים (ראש השנה, יו"כ, סוכות א', שמחת תורה, פסח א'/ז', שבועות, יום חול) → נשלח/נדחה/makeup; `reminder_run_logs.was_yom_tov` | Deno test (קיים ב-`_tests/`) |
| **6 הו"ק עברית** | **פאריטי:** אותו fixture JSON (50 הו"ק × 24 חודשים) רץ ב-vitest (TS) וב-Deno (edge) → פלט `next_due_date` **זהה**. SQLite migration ב-Rust: `#[test]` שמריץ `init_db` על DB ישן ומאשר עמודה. Bulk RPC עם `calendar_type` בענף | vitest + Deno + cargo |
| **7–8** | כנ"ל בהתאמה; דוח שנת מעשר: סכומי א' תשרי–כ"ט אלול == סכום ידני על seed | |
| **E2E על Vercel preview + ענף** | Playwright smoke (חדש): login משתמש seed → הגדרות → החלפת לוח → דשבורד, טבלה, בוחר, ייצוא PDF → צילומי מסך he/en. רץ ב-CI על כל PR | Playwright |

**CI חסר — להוסיף `ci.yml`** על כל PR: `tsc --noEmit`, `eslint`, `vitest run` (matrix `TZ`), `deno test supabase/functions`, `cargo test` ב-`src-tauri`, ובהמשך Playwright מול preview. בלי זה "לכסות הכל בטסטים" לא אוכף כלום.

## נספח א' — עובדות מה-DB החי (פרודקשן, 18.9.2026)

- `transactions.date` = `date`; `created_at/updated_at` = `timestamptz`; `conversion_date` = `date`. ב-`recurring_transactions`: `start_date`, `next_due_date` = `date`; `conversion_date` = **`text`** (חוסר עקביות קיים).
- `recurring_transactions.frequency`: **רק `monthly`** (880). `day_of_month` בשימוש: 1–31, מרוכז ב-10/20/1/15.
- `profiles`: אין `timezone`, אין `calendar_type`. `client_preferences` keys: `theme, language, autoCalcChomesh, trackChomeshSeparately, recurringDonations, minMaaserPercentage, notifications, autoLockTimeoutMinutes, onboarding, calendarType (279), maaserYearStart (335)`.
- `language`: he 302, en 33, null 303.
- pg_cron: `daily-recurring-executor` 00:00 UTC, `send-reminder-emails` 18:00 UTC, `send-new-user-email-daily` 19:00 UTC, `monitor-cron-failures` 07:00 UTC.
- RPCs עם לוגיקת חודש/שנה: `get_monthly_financial_summary`, `get_admin_monthly_trends`, `calculate_new_next_due_date`, `execute_due_recurring_transactions` (legacy), `get_earliest_system_date`. כל השאר מקבלים `p_start_date/p_end_date` ואגנוסטיים ללוח.
- אין RLS/policy תלוי תאריך. Indexes: `idx_transactions_user_date (user_id, date DESC)` + partial לפי type; `recurring_transactions_next_due_date_idx`.
- טווח תאריכי תנועות: `0002-01-19 .. 2026-12-03` (יש נתונים פגומים).

## נספח א'2 — בדיקות ספריות (Node 24.14, 18.9.2026)

```
@hebcal/hdate 0.22.8 (GPL-2.0)
  new HDate(30, TEVET, 5787)      => 1 Sh'vat 5787      (roll, לא clamp)
  new HDate(9, ADAR_II, 5788)     => 9 Adar 5788        (נרמול שקט בשנה פשוטה)
  HDate.isLeapYear(5787)          => true

temporal-polyfill/full 1.0.5 (MIT)   -- הבסיסי 'temporal-polyfill' זורק "Unknown calendar hebrew"
  from({year:5787, month:1, day:1, calendar:'hebrew'})           => 1 בתשרי 5787  (month 1 = תשרי)
  from({... month:4, day:30}, {overflow:'constrain'})            => 29 בטבת 5787  (clamp)
  from({... month:4, day:30}, {overflow:'reject'})               => RangeError
  monthsInYear(5787) = 13, inLeapYear = true, daysInYear = 385
  month 6 => 9 באדר א׳ (M05L), month 7 => 9 באדר ב׳ (M06)
  from({year:5788, monthCode:'M05L', ...}, constrain)            => 9 באדר 5788  (נרמול שקט)
  PlainDate.from('2026-09-18').withCalendar('hebrew').with({day:1}) => 1 בתשרי 5787 = 2026-09-12
  30 כסלו + 1 month => 29 בטבת (clamp)

Intl.DateTimeFormat('he-u-ca-hebrew', {dateStyle:'long'})       => ז׳ בתשרי תשפ״ז
Intl.DateTimeFormat('en-u-ca-hebrew', ...)                       => 7 Tishri 5787

Postgres (prod): select calculate_new_next_due_date(current_date, 31)
  => ERROR 22008 date field value out of range: 2026-09-31   (ה-handler תופס 22007 בלבד)
```

## נספח ב' — קבצים שנוגעים בתאריכים ב-`src/` (מלאי)

**ליבה/hooks:** `hooks/useDateControls.ts`, `hooks/usePeriodComparison.ts`, `lib/utils/date-range.ts`, `lib/recurring/recurring-date.utils.ts`, `lib/services/recurring-transactions.service.ts`, `lib/data-layer/reminders/reminder.service.ts`.
**UI תאריכים:** `components/ui/calendar.tsx`, `components/ui/date-picker.tsx`, `components/ui/date-range-picker.tsx`, `components/forms/transaction-form-parts/AmountCurrencyDateFields.tsx`, `components/forms/transaction-form-parts/RecurringFields.tsx`, `components/settings/NotificationSettingsCard.tsx`.
**תצוגה/גרפים:** `components/dashboard/StatsCards.tsx`, `components/dashboard/MonthlyChart.tsx`, `components/charts/area-chart-interactive.tsx`, `components/analytics/TransactionHeatmap.tsx`, `components/analytics/InsightsSummaryRow.tsx`, `components/analytics/RecurringForecastInsight.tsx`, `components/features/currency/CurrencyConversionInfo.tsx`, `components/TransactionsTable/TransactionRow.tsx`, `components/TransactionsTable/TransactionsTableDisplay.tsx`, `components/TransactionsTable/TransactionsFilters.tsx`, `components/TransactionsTable/RecurringTransactionsTableDisplay.tsx`, `components/admin/AdminTrendsChart.tsx`, `pages/AnalyticsPage.tsx`.
**נתונים:** `lib/data-layer/{stats,analytics,insights,chart,admin,transactionForm}.service.ts`, `lib/tableTransactions/{tableTransactionService,recurringTable.service}.ts`, `lib/import/{normalize,parsers,persist-approved-import,recurring-warning-detector}.ts`.
**ייצוא:** `lib/utils/export-{pdf,csv,excel}.ts`, `lib/analytics/export-pdf.ts`, `lib/halacha/print-halacha.ts`, `lib/admin/trend-chart.utils.ts`.
**הגדרות:** `lib/store.ts`, `lib/services/preferences-sync.service.ts`, `lib/services/desktop-settings.service.ts`, `pages/SettingsPage.tsx`.

## נספח ג' — Backend/דסקטופ

**Postgres (מיגרציות):** `20260326120000_analytics_combined_rpcs.sql`, `20260324171800_add_analytics_rpcs.sql`, `20260325115226_add_heatmap_rpc.sql`, `20260706103000_update_recurring_transaction_next_due.sql`, `20260715190000_harden_calculate_user_tithe_balance.sql`, `20260717010000_reminder_users_include_default_currency.sql`, `20260519120000_add_reminder_run_logs.sql`, `20260716100000_cron_jobs_use_vault_secrets.sql`. (הערה: `CREATE TABLE` של הטבלאות המרכזיות אינו במיגרציות — רק בפרודקשן.)
**Edge:** `process-recurring-transactions/index.ts`, `send-reminder-emails/index.ts` (+ `locales/email-{he,en}.json`), `send-new-user-email/index.ts`.
**Rust:** `src-tauri/src/commands/chart_commands.rs`, `recurring_transaction_commands.rs`, `transaction_commands.rs`, `db_commands.rs`, `models.rs`.
**סקריפטים:** `scripts/check-cron-jobs.js`.
