# הוראת קבע מהעוזר

תוכנית. אושרה ב־28/10/2026, עם ההחלטות בסעיף «החלטות».

היום «תגדיר הוראת קבע של 75 לישיבה כל חודש» מגיע ל־Jev כ־`create_rule`. `parseUserRule` מבין רק כללי סיווג (פטור, הוצאה מוכרת, תרומה ממעשר), מחזיר `null`, ו־`shownIntent` הופך את זה ל־`out_of_scope` (`src/components/ai-intake/assistant-shown-intent.ts:33`). המשתמש מקבל «אני יודע רק לטפל בתנועות ובנתונים שלך.» (`aiIntake.intents.out_of_scope`).

מנוע הוראות הקבע כבר קיים ועובד. חסרים רק הכוונה, החילוץ והכרטיס.

## מה קיים

| רכיב | איפה | מה חשוב לתוכנית |
|---|---|---|
| `RecurringTransaction` | `src/types/transaction.ts:86` | `status`: `active`, `paused`, `completed`, `cancelled`. `frequency`: `daily`, `weekly`, `monthly`, `yearly`. `calendar_type`, `anchor_month_code`, `day_of_month`, `total_occurrences`, `execution_count`. אין `origin` |
| `createRecurringTransaction` | `src/lib/data-layer/recurringTransactions.service.ts:27` | ב־Web insert ישיר ל־`recurring_transactions`, ב־Desktop `add_recurring_transaction_handler`. לא RPC |
| בניית ההגדרה מהטופס | `handleTransactionSubmit` ב־`src/lib/data-layer/transactionForm.service.ts:94-127` | `next_due_date` מ־`firstDueDate`, ו־`anchor_month_code` רק לשנתי, מ־`getCalendarAdapter(calendarType).fromIsoDate(date).monthCode` |
| ברירת המחדל של לוח השנה | `TransactionForm.tsx:85`, `settings.calendarType` | אותה ברירת מחדל לכרטיס |
| `createRecurringEditSchema` | `src/lib/schemas.ts:312` | סכום, מטבע, תיאור, קטגוריה, אמצעי תשלום, סטטוס, מספר חזרות, יום בחודש, `calendar_type`, `anchor_month_code`, שדות המרה. אין בה סוג, תדירות, תאריך התחלה ונמען |
| תאריכים | `supabase/functions/_shared/calendar/index.ts`: `firstRecurringDueDate` (442), `advanceRecurringDate` (489), `generateRecurringCatchUpDates` (529) | אין פונקציה ל«שלושת החיובים הבאים». נבנית מאלה |
| ה־cron | `supabase/functions/process-recurring-transactions/index.ts`, דרך `daily-recurring-executor` פעם ביום ב־00:00 UTC | לוקח רק `active` עם `next_due_date <= today`. כותב `source_recurring_id` ו־`occurrence_number`, מעלה את `execution_count`, ועובר ל־`completed` אחרי `total_occurrences`. לא כותב `origin` |
| ביטול | RPC `update_recurring_transaction` (`20260923161451_add_recurring_calendar_fields.sql`), דרך `recurringTable.service.ts:277` | מקבל `status = 'cancelled'` |
| חילוץ סכום, סוג, נמען ומטבע | `draftFromText` ב־`supabase/functions/_shared/ai/text-draft.ts:234` | משמש כמו שהוא |

## 1. הכוונה `create_recurring`

- נוספת ל־`INTAKE_INTENTS` (`supabase/functions/_shared/ai/intent.ts:18`), ומשם לכל מי שקורא את הרשימה: `readIntentChoice`, `intent-fallback.ts`, ובדיקת הכיסוי ב־`intent-eval_deno_test.ts`.
- **הקריטריון ל־Jev** (`INTENT_CRITERIA` ב־`jev-intent.ts:19`, באנגלית כמו השאר): «The user asks to set up a transaction that repeats from now on, such as a standing order or a fixed monthly payment to record automatically. Reporting one charge that already happened, even from a standing order, is not this.»
- **הקריטריון של `create_rule` מתעדכן** כדי שלא יתפוס את זה: «…A standing rule changes how future transactions are classified. Setting up a transaction that repeats is not this.»
- **נשאר `add_transaction`:** «ירדו לי 300 ש״ח לישיבה בהוראת קבע» (`gen-he-add-29`), «My standing order to the yeshiva went out today» (`gen-en-add-24`), «כל חודש אני נותן 50 לישיבה, החודש כבר ירד» (`gen-he-add-08`). המשפט מדווח על חיוב, ואין בו בקשה להגדיר.
- **לא משתנים:** «איך מבטלים הוראת קבע בבנק?» (`gen-he-oos-17`) נשאר `out_of_scope`, ו«יש מצב שהוראת הקבע וההזנה הידנית יצרו לי כפל?» (`gen-he-dup-09`) נשאר `find_duplicates`.
- **בלי Jev:** ה־fallback ב־`intent.ts` מזהה רק צירוף של פועל בקשה («תגדיר», «תקבע», «set up», «make it recurring») עם מילת חזרה («הוראת קבע», «כל חודש», «every month»). הרשימה ב־`phrase-aliases.ts`. בלי פועל בקשה זה נשאר `add_transaction`.
- **ודאות מתחת ל־0.7:** כמו היום, שאלה עם כפתורים. נוסף כפתור רביעי «הוראת קבע» ב־`ReplyBlockView.tsx:64-74`.
- **i18n:** `aiIntake.intents.create_recurring` ו־`aiIntake.intentChoices.create_recurring`, בעברית ובאנגלית (`public/locales/*/navigation.json`).

## 2. סטי ה־eval

**תיוג מחדש ב־`intent-eval-inbox.json` (150 המשפטים):**

| id | משפט | היום | אחרי |
|---|---|---|---|
| `gen-he-rule-02` | כל חודש אני נותן 50 לישיבה, תעשה שזה יירשם קבוע | `create_rule` | `create_recurring` |
| `gen-he-rule-06` | הוראת הקבע לישיבה יורדת כל חודש ב־10, תוסיף כלל להבא | `create_rule` | `create_recurring` |
| `gen-he-rule-09` | תעשה שכל חודש בחמש עשרה ירשם חמש מאות שקל שכר לימוד | `create_rule` | `create_recurring` |
| `gen-en-rule-11` | I give 75 NIS to the yeshiva every month; set that up for future months | `create_rule` | `create_recurring` |
| `gen-en-rule-14` | My 120 NIS standing order is monthly; don't log just this one, make it recurring | `create_rule` | `create_recurring` |
| `gen-he-rule-15` | כל ראש חודש 100 לגמ״ח | `create_rule` (מקובל: `add_transaction`) | `create_recurring` (מקובל: `add_transaction`) |

ה־ids נשארים, כדי שההיסטוריה ב־`intent-eval-inbox-results.json` תהיה ניתנת להשוואה. אחרי התיוג: `create_rule` יורד מ־15 ל־9, ו־`create_recurring` מקבל 6.

**`intent-eval-cases.json` (68 המשפטים) אין בו אף משפט על חזרה.** בדיקת הכיסוי תיכשל בלי משפטים של `create_recurring`. נכנסים 6 המשפטים שסופקו, כמו שהם:

| id | note | משפט |
|---|---|---|
| `he-recurring-01` | standard | תגדיר לי הוראת קבע של 200 ש״ח לכולל בכל ראש חודש |
| `he-recurring-02` | standard | מעכשיו כל חודש ב־10 תרשום 1,500 שכר דירה |
| `he-recurring-03` | hard-boundary | תפתח תרומה קבועה של 36 שקל לחב״ד כל שבוע, ל־12 שבועות |
| `en-recurring-01` | standard | Set up a monthly donation of 100 NIS to Ezer Mizion starting next month |
| `en-recurring-02` | hard-boundary | From now on log 180 shekels every year on Purim for matanot la'evyonim |
| `en-recurring-03` | transcript | make my fifty dollar pledge to the kollel recurring every month until the end of the year |

כולם `expected: "create_recurring"`.

**כיול:** להריץ את `intent-eval-run.ts` על שני הסטים (`deno run --allow-env --allow-read --allow-write --allow-net --config supabase/functions/deno.json supabase/functions/_shared/ai/intent-eval-run.ts`). קריטריון קבלה:
- אף תווית אחרת לא יורדת בדיוק.
- כל תשובה בוודאות 0.7 ומעלה נכונה, כמו ב־21/10 (138 מתוך 138).
- משפטי `create_recurring` שנופלים מתחת ל־0.7 מקבלים את שאלת הכפתורים. זה מקובל, אבל המספר נרשם ביומן.
- אם ודאות גבוהה טועה, לא משנים את הסף. מתקנים את הניסוח של שני הקריטריונים ומריצים שוב.

## 3. חילוץ

מודול טהור חדש: `supabase/functions/_shared/ai/recurring-draft.ts`, עם `recurringFromText(text, today, calendarType)`. בלי רשת ובלי React, כדי ש־WhatsApp ישתמש באותה פונקציה.

- **סכום, סוג, נמען, מטבע ותיאור:** מ־`draftFromText`, בלי שינוי.
- **תדירות:** «כל יום», «יומי», «daily». «כל שבוע», «שבועי», «כל יום שני», «every Monday». «כל חודש», «חודשי», «כל ראש חודש», «monthly». «כל שנה», «שנתי», «yearly».
- **יום:**
  - «ב־15», «בחמש עשרה», «on the 15th».
  - «בראש חודש»: יום 1.
  - «בי׳ לחודש»: אותיות א׳ עד ל׳.
  - בשבועי, יום בשבוע. בלי יום, היום של התחלה, כמו שהטופס גוזר אותו מהתאריך (`transactionForm.service.ts:90`).
- **התחלה:** «מעכשיו» או כלום: החיוב הראשון שאינו לפני היום. «מהחודש הבא». «מ־1 בנובמבר».
- **מספר חזרות:**
  - «ל־12 חודשים», «12 פעמים», «for 12 months»: `total_occurrences = 12`.
  - «עד סוף השנה»: מספר התאריכים מ־`generateRecurringCatchUpDates` עד סוף השנה בלוח של המשתמש (31/12, או כ״ט באלול).
  - בלי ביטוי: בלי סוף (`null`).
- **יום עברי:** `calendarType` מ־`settings.calendarType`, כמו ברירת המחדל בטופס. «בראש חודש» בלוח עברי הוא א׳ בחודש העברי. «בי׳ לחודש» הוא העשירי בלוח של המשתמש. `anchor_month_code` רק לשנתי, מהתאריך של ההתחלה, כמו בטופס. מגבלות היום הן של `createDayOfMonthSchema`.
- **תאריך שה־parser לא מחשב:** שנתי לפי חג («every year on Purim»), או כל ביטוי שלא נפתר לתאריך. הפונקציה מסמנת את התאריך כחסר, והכרטיס שואל עליו. לא מנחשים, וגם לא נופלים לתאריך של היום.
- **רמז שכבר ירד:** «כבר ירד», «ירד היום», «החודש כבר», «went out today». רק מסמן `alreadyCharged`, ולא משנה את ההגדרה.
- **מה חסר:** הפונקציה מחזירה גם רשימת שדות חסרים. סוג חסר הוא שאלה בכרטיס, כמו `TypeChoice` היום. סכום חסר הוא `null`, והעוזר עונה כמו היום כשאין סכום.

**הוצאה משותפת מהטופס:** החלק של `handleTransactionSubmit` שבונה `NewRecurringTransaction` (שורות 94–125) עובר לפונקציה טהורה `buildRecurringDefinition`. הטופס והכרטיס קוראים לה. קודם בדיקת אפיון ל־`handleTransactionSubmit` עם `is_recurring`, ורק אחר כך ההוצאה. התנהגות הטופס לא משתנה.

## 4. כרטיס

`src/components/ai-intake/blocks/RecurringDraftCard.tsx`, ו־`ReplyBlock` חדש מסוג `recurring` ב־`assistant-reply-view.ts`.

- **שורת סיכום:** «75 ₪ לישיבה, תרומה, כל חודש ב־1, בלי סוף».
- **שלושת החיובים הבאים:** מ־`firstRecurringDueDate` ואז `advanceRecurringDate`. מוצגים בלוח של המשתמש דרך `getCalendarAdapter`. כשיש `total_occurrences` קטן משלוש, מוצגים רק התאריכים שקיימים.
- **עריכה של כל שדה:** סכום, מטבע, סוג (`TypeChoice`), נמען, תיאור, קטגוריה, תדירות, יום, התחלה, ומספר חזרות. כל שינוי מחשב מחדש את שלושת התאריכים.
- **«לרשום גם את החיוב של החודש?»** מופיע רק כש־`alreadyCharged`.
  - **כן:** ההתחלה היא תאריך החיוב של התקופה הנוכחית, וה־cron יוצר אותו. הכרטיס אומר «החיוב של החודש יופיע עד מחר».
  - **לפני השמירה:** `listDuplicateCandidates` על החיוב של התקופה הנוכחית: אותו סוג, סכום ומטבע, בתאריך הזה. ה־RPC כבר בודק ±3 ימים ו־2%.
  - **אם יש מועמד:** «נראה שכבר רשמת את החיוב של החודש», עם בחירה לרשום מהחודש הבא בלבד.
- **כפתורים:** «שמור הוראת קבע» ו«לא עכשיו». אין שמירה בלי לחיצה.
- **מטבע זר:** כמו בטופס. ההוראה נשמרת במטבע שלה, וההמרה קורית בכל ביצוע.

## 5. שמירה

- «שמור הוראת קבע» קורא ל־`buildRecurringDefinition`. השדות שקיימים ב־`createRecurringEditSchema` עוברים אותה. סוג, תדירות ותאריך התחלה הם בחירות סגורות בכרטיס. אחר כך `createRecurringTransaction`.
- **אף פעם לא אוטומטית.** גם לא מדידת צל של «הייתי שומר». הוראת קבע כותבת תנועות לבד בכל חודש, ולכן היא דורשת לחיצה תמיד.
- לא עוברת דרך `ai.intake_items`. אלה טבלאות של תנועות, ו־`commit_intake_items` כותב לתוך `transactions`.
- אחרי השמירה: «נשמרה הוראת קבע», קישור לטבלת הוראות הקבע, וכפתור «בטל». אותו רענון כמו אחרי שמירה מהטופס.
- `trackProductEvent("recurring_obligation_created")` נשלח כמו מהטופס, עם `source: "ai"`.

## 6. ביטול

- **מתי:** עד 7 ימים מ־`created_at`, וכל עוד `execution_count = 0`.
- **מה:** `update_recurring_transaction` עם `status = 'cancelled'`. לא מחיקה, כדי שההיסטוריה תישאר.
- **איפה:** כפתור בצ'אט, אחרי השמירה. אין RPC חדש ואין אכיפה בשרת, כי המשתמש כבר יכול לבטל או למחוק כל הוראה מהטבלה, בכל זמן. החלון הוא רק לכפתור של העוזר.
- אחרי 7 ימים, או אחרי חיוב ראשון, הכפתור נעלם. הביטול אז מהטבלה, כמו כל הוראה.

## החלטות (28/10/2026)

1. **`origin`:** רק על `recurring_transactions`: nullable, `CHECK (origin IS NULL OR origin = 'ai')`. התנועות שה־cron יוצר נשארות `NULL`.
   - `TransactionRow.tsx:97,231` מציג אייקון AI ותפריט «בטל» לכל תנועה עם `origin = 'ai'`. «בטל» קורא ל־`undo_ai_transaction`, שמחפש פריט ב־`ai.intake_items`. לתנועה מה־cron אין פריט, ולכן הכפתור היה נכשל.
   - גם ספירת ה־AI באדמין הייתה מתנפחת מחודש לחודש בלי פעולה חדשה של המשתמש.
   - ב־Desktop אין עוזר. השדה ב־`NewRecurringTransaction` אופציונלי, ומסלול Tauri מתעלם ממנו.
2. **«לרשום גם את החיוב של החודש?» ענה כן:** דרך ה־cron, כמו בסעיף 4.
   - ההתחלה היא תאריך החיוב של התקופה הנוכחית. `daily-recurring-executor` יוצר אותו בהרצה של 00:00 UTC, עם `source_recurring_id` ו־`occurrence_number = 1`.
   - חלון הביטול נסגר אחרי ההרצה הזו, כי `execution_count` כבר 1.
3. **6 המשפטים ל־`intent-eval-cases.json`:** סופקו, ומופיעים בסעיף 2.
4. **ב־R2 נרשם ביומן** איך כל אחד מ־6 המשפטים עבר בחילוץ: תדירות, יום, התחלה, מספר חזרות, ומה סומן כחסר. לא רק הכוונה.
## פיצול ל־PRs

| PR | מה | בדיקה |
|---|---|---|
| R1 | הכוונה, שני הקריטריונים, ה־fallback, תיוג מחדש, 6 משפטים, כיול. עד שיש כרטיס, `create_recurring` עונה «אפשר להגדיר הוראת קבע בטופס», עם כפתור שפותח את טופס התנועה עם «הוראת קבע» מסומן. זה כבר יותר טוב מ«מחוץ לתחום» | `deno test` על `intent_deno_test.ts` ו־`intent-eval_deno_test.ts`. מספרי הכיול ביומן |
| R2 | `recurring-draft.ts`, ובדיקת אפיון ואחריה הוצאת `buildRecurringDefinition` מהטופס. בלי UI | `deno test` לכל ביטוי בסעיף 3, כולל עברי, שנתי, וחג שלא מחושב. Vitest לטופס לפני ואחרי. החילוץ של 6 המשפטים מסעיף 2 ביומן |
| R3 | הכרטיס, שלושת התאריכים, העריכה, שאלת החודש עם בדיקת הכפילות שלה, והשמירה | Vitest ללוגיקת הכרטיס, דוגמה בגלריה (`assistant-gallery-fixtures.ts`), בדיקת אפיון במגירה. בדיקה ידנית ב־Preview: שמירה, ושהשורה מופיעה בטבלת הוראות הקבע |
| R4 | כפתור הביטול, ו־`recurring_transactions.origin`: migration, rollback, וספירה בטאב ה־AI | DB על testing. בדיקה ש־`execution_count = 1` מסתיר את הכפתור |

R2 יכול לרוץ במקביל ל־R1. R3 תלוי בשניהם.

## בהמשך: WhatsApp

- אותן `recurringFromText` ו־`buildRecurringDefinition` בשרת, אחרי הוצאת הלוגיקה מהמגירה (`2026-10-23-ai-intake-core.md`).
- הודעה אחת: שורת הסיכום ושלושת התאריכים, עם הכפתורים «שמור», «ערוך באפליקציה» ו«בטל». זה בתוך מגבלת שתי ההודעות ל־intake (§8.3).
- כש־`alreadyCharged`, השמירה מתפצלת לשני כפתורים: «שמור, כולל החודש» ו«שמור מהחודש הבא». שלושה כפתורים, המקסימום של WhatsApp.
- גם שם אף פעם לא אוטומטית. §10.6 מתיר שמירה אוטומטית רק לתנועה בודדת.
- השמירה צריכה RPC בשרת, כי `createRecurringTransaction` הוא insert מהלקוח עם JWT של המשתמש. זה נכנס לתוכנית של WhatsApp, לא לכאן.
