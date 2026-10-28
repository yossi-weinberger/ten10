# כמה תנועות מהודעה אחת

תוכנית. לא לבצע לפני אישור.

היום כל הודעה היא טיוטה אחת. «50 במכולת אתמול ו־120 לישיבה היום» הופך לטיוטה אחת עם הסכום הראשון. השני נעלם בלי הודעה.

## מה כבר מוכן ומה חסר

| שכבה | היום | חסר |
|---|---|---|
| טבלאות | `ai.intake_items.item_index` ו־`UNIQUE (message_id, item_index)` קיימים מ־`20261019020000_ai_schema_foundation.sql`. מפתח idempotency אחד להודעה: `UNIQUE (user_id, idempotency_key)` ב־`ai.intake_messages` | כלום |
| יצירה | `ai.create_text_intake` (גרסה אחרונה ב־`20261019210000_ai_fix_save_and_access.sql`) יוצר פריט אחד, תמיד `item_index = 0` | RPC שיוצר N פריטים |
| שמירה | `ai.commit_intake_items(p_items jsonb)` כבר מקבל מערך, ונכשל כולו אם פריט אחד נכשל ("a multi-item receipt is never saved in part"). פריט שכבר נשמר מדולג ומוחזר ב־`already_committed` | כלום |
| דחייה וביטול | `public.reject_uncommitted_ai_item(p_item_id)` דוחה פריט שלא נשמר. `ai.undo_intake_commit(p_item_id)` מבטל תנועה אחת | כלום |
| כוונה | `buildIntentBody` (`supabase/functions/_shared/ai/jev-intent.ts:29`) שולח שאלת Choice אחת, `questions.intent`. `readIntentChoice` קורא `answers.intent` | שאלה שנייה באותה קריאה |
| קבלה | `ReceiptDraft` (`supabase/functions/_shared/ai/receipt-draft.ts:10`): תיאור, תאריך, סכום, מטבע. ה־prompt ב־`supabase/functions/ai-read-receipt/index.ts:83-91` | `kind` |
| תאריך | `resolveDate` ב־`text-draft.ts:86` פרטית, ומחזירה את היום כשאין התאמה | גרסה מיוצאת שמחזירה `null` כשלא הבינה |
| ייבוא | `draftToNormalizedRow` ב־`src/lib/intake/draft-to-import.ts` קיימת, ורק הבדיקה שלה משתמשת בה. `ImportWizard` בלי props, מתחיל ב־`prepare`, ובונה שורות סקירה רק מקובץ ומיפוי (`buildPreviewRows`) | נקודת כניסה עם שורות מוכנות |

## 1. זיהוי

**טקסט וקול (אחרי תמלול):** שאלה שנייה, `questions.count`, באותה קריאת Jev ב־`buildIntentBody`. אין קריאה נוספת. הקריטריונים:
- `one`: תנועה אחת.
- `several`: כמה תנועות נפרדות, כל אחת עם סכום משלה.
- `list`: רשימה ארוכה, או טבלה, או הדבקה מדף בנק.

`ai-classify-intent` מחזיר `count` ו־`count_confidence` ליד `intent`. `count` משפיע רק כש־`intent = add_transaction`. בכל כוונה אחרת מתעלמים ממנו. ודאות מתחת ל־0.7 מתנהגת כמו `one`, כי זה המסלול שעובד היום, והמשתמש רואה מה הובן לפני שמירה.

**קבלה:** `kind` בתשובת הקבלה: `receipt`, `several_receipts` או `statement`. נוסף ל־prompt, ל־`ReceiptDraft` ול־`readReceiptDraft`. ערך לא מוכר נקרא `receipt`.

## 2. `one`

המסלול הקיים, בלי שינוי.

## 3. `several`

עד `MAX_ITEMS_PER_MESSAGE`. קבוע אחד ב־`supabase/functions/_shared/ai/multi-item.ts`, מתחיל ב־5. ה־RPC בודק את אותו מספר, ובדיקת Vitest משווה ביניהם, כמו `CURRENCIES` ב־#590.

**חילוץ:** Edge חדש, `ai-split-items`, דרך ה־Gateway עם תג `feature:split`. תשובה במבנה קבוע (JSON schema): מערך של
- `description`
- `amount`: מספר.
- `amount_text`: הסכום בדיוק כפי שנכתב. זה מה שמאפשר את העיגון.
- `currency`
- `date_phrase`: ביטוי התאריך כפי שנאמר, או ריק.
- `type_hint`: `income`, `expense`, `donation` או ריק.

המודל ייבחר במדידה על סט החילוץ (סעיף 7), לא מראש.

**עיגון.** פריט נזרק אם אחד מאלה לא מתקיים:
- `amount_text` מופיע בטקסט המקורי, אחרי אותו נרמול של `prepareText`.
- ה־parser קורא מ־`amount_text` בדיוק את `amount`.

סכום במילים שה־parser לא קורא נזרק. אין מספר שהמודל המציא ונשמר. כשנזרק פריט, התשובה אומרת כמה: «מצאתי 3, אחד לא זיהיתי בוודאות».

**תאריך:** `resolveDatePhrase(phrase, today)` חדשה ומיוצאת מ־`text-draft.ts`, על אותן רשימות (`LAST_WEEKDAYS`, `DATE_MINUS_ONE`, `DATE_MINUS_TWO`). ביטוי ריק נותן את היום. ביטוי שלא הובן מחזיר `null`, והכרטיס מסמן «בדוק תאריך» במקום לשים את היום בשקט.

**לכל פריט, אותו מסלול של טיוטה בודדת:**
- הכלל קדימה (`applyForwardRule`, בלקוח, כמו ב־`AssistantDrawer.tsx:320-334`).
- פרופיל `AI_DRAFT`.
- המרה (`buildCommitPayload`).
- כפילות (`listDuplicateCandidates`, ודירוג Jev רק לפריט שיש לו מועמדים).

**יותר מהקבוע:** עובר למסלול `list`.

## 4. `list`, יותר מהקבוע, או `statement`

- התשובה: «נראה כמו רשימה. לפתוח בייבוא?» עם כפתור.
- **רשימת טקסט:** אותו `ai-split-items`, עם תקרה נפרדת לייבוא (`MAX_ITEMS_FOR_IMPORT`, מספר שנקבע בסט החילוץ) ואותו עיגון. כל פריט עובר `draftToNormalizedRow`.
- **נקודת כניסה ל־`ImportWizard`:** prop אופציונלי `initialRows`. כשהוא קיים:
  - מדלגים על `prepare`, `upload` ו־`mapping`.
  - `SET_PREVIEW_ROWS` עם `processing: false`, וה־reducer כבר עובר ל־`review`.
  - פונקציה חדשה `previewRowsFromNormalized(rows, existingTransactions, recurringTransactions)` ב־`src/lib/import/`, שחולקת עם `buildPreviewRows` את בדיקת הכפילות והתקינות.
  - פרופיל ה־validation הוא `AI_DRAFT` ולא `FILE_IMPORT`, כי אלה לא שורות של קובץ בנק (§10.1 בעיצוב).
- **מה נשמר:** שורות מהמסלול הזה נשמרות דרך שמירת הייבוא הרגילה. אין להן `ai.intake_items`, ולכן אין להן `origin = 'ai'` ואין «בטל» של העוזר. ראו את ההחלטה הפתוחה.

## 5. שרת

- **RPC חדש:** `ai.create_text_intake_items(p_payload jsonb)`, ועטיפה `public.create_ai_text_intake_items`.
  - הודעה אחת, ו־N פריטים עם `item_index` מ־0.
  - מפתח idempotency אחד להודעה. ב־`ON CONFLICT` מחזיר את הפריטים שכבר נוצרו, באותו סדר.
  - בחירת כפילות לכל פריט, כמו ב־`create_text_intake`.
  - יותר מ־`MAX_ITEMS_PER_MESSAGE` נכשל.
  - מחזיר `[{ item_id, version, item_index }]`.
  - migration עם timestamp אחרי האחרון בענף, ו־rollback.
- **שמירה:** `commit_ai_intake_items` הקיים, רק עם המסומנים. הכול או כלום. אחרי הצלחה, `reject_uncommitted_ai_item` לכל פריט שלא סומן. אם השמירה נכשלת, לא נשמר כלום ולא נדחה כלום.
- **ביטול:** `undo_ai_intake_commit` לכל תנועה בנפרד, כמו היום. אותו חלון של 7 ימים.

## 6. ממשק

- רשימה של כרטיסים קומפקטיים (`src/components/ai-intake/blocks/MultiDraftList.tsx`), ו־`ReplyBlock` מסוג `drafts`.
- **כל כרטיס:**
  - שורה אחת: תיאור, סכום, תאריך.
  - שאלת סוג אם חסר (`TypeChoice`).
  - «ערוך» פותח את שדות `DraftCard`.
  - V לסימון. מסומן כברירת מחדל, חוץ מפריט שמחכה לשאלת סוג או עם «בדוק תאריך».
- **«שמור את המסומנים (3)»**, ומושבת כשאין מסומן.
- **אזהרת כפילות** בתוך הכרטיס של הפריט, עם אותן בחירות של היום.
- **אחרי השמירה:** כל תנועה עם «בטל» משלה.
- **גלריה:** דוגמאות ב־`assistant-gallery-fixtures.ts`, עם 2 ו־5 פריטים, פריט שנזרק, ופריט עם כפילות.

## 7. סטי eval

אתה מספק את המשפטים, כמו בפעם הקודמת.

- **זיהוי:** `supabase/functions/_shared/ai/fixtures/intent-count-eval-cases.json`, באותו מבנה של `intent-eval-cases.json`: `id`, `language`, `note`, `text`, `expected` עם `one`, `several` או `list`. `intent-eval-run.ts` קורא גם את התשובה השנייה, כי היא באותה קריאה.
  - קריטריון: אין `several` שנקרא `one` בוודאות 0.7 ומעלה.
  - בדיקה נוספת: הדיוק של `intent` על `intent-eval-cases.json` לא יורד מהוספת השאלה השנייה.
- **חילוץ:** `split-eval-cases.json`: `id`, `text`, `today`, ו־`expected` עם מערך פריטים.
  - כל משפט כולל לפחות מקרה אחד: סכום במילים, שני סכומים באותו מטבע, ומטבע זר.
  - תאריך שונה לכל פריט, ותאריך שלא נאמר.
  - **מדדים:**
    - פריטים שנמצאו מדויק.
    - פריטים שנזרקו בעיגון.
    - פריט עם סכום שלא בטקסט: חייב להיות 0. כל מקרה הוא כישלון של הסט.
  - הסט קובע את המודל ואת `MAX_ITEMS_FOR_IMPORT`.

## החלטות פתוחות

1. **`several_receipts`.**
   - **(מומלץ לגרסה הראשונה)** «ראיתי כמה קבלות בתמונה. אפשר לשלוח כל אחת בנפרד?». אין עיגון לתמונה, כי אין טקסט להשוות אליו, ולכן אין הגנה על סכום שהמודל המציא.
   - חילוץ מערך מהתמונה, עם אישור לכל פריט.
2. **`statement`.**
   - **(מומלץ לגרסה הראשונה)** הצעה לייבא את הקובץ שהבנק מוציא (CSV או Excel), בייבוא הרגיל.
   - קריאת דף בנק מתמונה או PDF היא תוכנית נפרדת, כי היא מודל אחר, עלות אחרת, ובלי עיגון.
3. **שורות שנשמרו דרך הייבוא:**
   - **(מומלץ)** בלי `origin`, כמו כל ייבוא. הסיבה: «בטל» של העוזר צריך פריט ב־`ai.intake_items`.
   - `origin = 'ai'`. דורש שהייבוא ייצור הודעה ופריטים ויעבור דרך `commit_intake_items`.

## פיצול ל־PRs

| PR | מה | בדיקה |
|---|---|---|
| M1 | שאלת `count` ב־Jev, הסט והכיול. בלי חילוץ עדיין: `several` ו־`list` עונים «אני רושם תנועה אחת בכל פעם. שלח אותן אחת אחת», במקום לבחור את הראשונה בשקט | `deno test`, ומספרי הכיול ביומן |
| M2 | `ai-split-items`, העיגון, `resolveDatePhrase`, וסט החילוץ. בלי UI | `deno test` לעיגון ולתאריכים. ריצת הסט ביומן. Edge על testing |
| M3 | `ai.create_text_intake_items`, rollback, ובדיקת השוויון של הקבוע | DB על testing: יצירה כפולה עם אותו מפתח מחזירה אותם פריטים. 6 פריטים נכשלים. שמירה עם פריט שנכשל לא שומרת כלום |
| M4 | הכרטיסים, «שמור את המסומנים», ו«בטל» לכל תנועה | Vitest, גלריה, ובדיקת אפיון במגירה. ידני ב־Preview |
| M5 | נקודת הכניסה ל־`ImportWizard`, `previewRowsFromNormalized`, וחיבור `draftToNormalizedRow` | Vitest: אותן שורות דרך קובץ ודרך `initialRows` נותנות אותה סקירה |
| M6 | `kind` בקבלה, והניתוב לפי ההחלטות 1–2 | `deno test` ל־`readReceiptDraft` עם `kind` חסר ולא מוכר |

M1 קודם, כי הוא מתקן את הבליעה השקטה של היום. M2 ו־M3 במקביל. M4 אחרי שניהם. M5 ו־M6 בלתי תלויים.

## בהמשך: WhatsApp

- **הודעת סיכום אחת**, עם שורה ממוספרת לכל פריט: «1) 50 ₪ מכולת, אתמול. 2) 120 ₪ ישיבה, היום.» הכפתורים: «שמור הכול», «ערוך באפליקציה» ו«בטל».
- **אין סימון חלקי בכפתורים.** בחירה חלקית רק באפליקציה, דרך קישור שפותח את אותה רשימה.
- **פריט עם שאלת סוג או «בדוק תאריך»:** אין «שמור הכול». רק «ערוך באפליקציה».
- **אחרי השמירה:** הודעת אישור אחת עם המספרים, ו«בטל» לכל תנועה דרך האפליקציה. זה בתוך מגבלת שתי ההודעות ל־intake (§8.3).
- **אין שמירה אוטומטית** לכמה פריטים. §10.6 מתיר אותה רק לתנועה אחת.
- **`list` ו־`statement`:** קישור לייבוא באפליקציה.
