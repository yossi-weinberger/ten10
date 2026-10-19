# איך עובד קליטת AI ב-Ten10 (מה שקיים עכשיו)

מסמך זה מתאר את מה שכבר בנוי על הענף `feat/ai-intake`. הוא לא מתאר צ'אט, מייל או WhatsApp, כי הם עדיין לא קיימים. התכנית המלאה לעתיד נמצאת ב-`docs/superpowers/specs/2026-10-18-ai-multichannel-design.md`. יומן העבודה נמצא ב-`docs/superpowers/plans/ai-progress.md`.

הייצור עדיין לא מכיל את הסכמה ואת פונקציית הרישום. הן רצות על מסד ה-testing בלבד.

## העיקרון

ה-AI לא כותב תנועות. הוא מציע טיוטה. קוד רגיל בודק אותה. המשתמש מאשר. רק `ai.commit_intake_items` רושם שורה ב-`public.transactions`, עם `origin = 'ai'`.

שמירה אוטומטית לא ממומשת.

## מה רץ איפה

| חלק | איפה | מצב |
|---|---|---|
| ליבת נרמול משותפת לדפדפן ול-Deno | `supabase/functions/_shared/transaction-domain/` | על `feat/ai-intake`. ייבוא CSV נשאר `FILE_IMPORT` |
| המרת מטבע | `currency-rules.ts` (`applyConversion`), `exchange-rates.ts` | הטופס, יתרת פתיחה, עריכת הוראת קבע והשירות בלקוח קוראים ל-`applyConversion`. ה-cron של הוראות הקבע לא עבר למודול הזה |
| חוזה טיוטה | `supabase/functions/_shared/intake/contracts.ts` | `TransactionDraftV1`. הלקוח מייצא מחדש מ-`src/lib/intake/contracts.ts` |
| סיווג כוונות | `supabase/functions/_shared/ai/intent.ts` | `classifyIntent` מחזיר תווית בלבד, בלי רשת ובלי כתיבה |
| החלטת סוג מרשימה סגורה | `supabase/functions/_shared/ai/decision.ts` | `decide()`. מתאם כללים טהור. מתאמי Jev ו-LLM זורקים שגיאה בלי מפתח |
| סכמה | `ai` ב-testing | טבלאות intake. משתמש מחובר יכול רק לקרוא את השורות שלו |
| רישום | `ai.commit_intake_items` ב-testing | כותב תנועה אחת או יותר. כשל אחד מבטל את כל הקריאה |
| עמודה בטבלת התנועות | `public.transactions.origin` | `NULL`, `ai`, או `ai_auto`. קיימת ב-testing. ב-Web מוצג אייקון כשהערך `ai` או `ai_auto`, ומסנן "מקור" שולח `p_origin` רק כשהוא לא "הכל". ב-Desktop אין אייקון ואין מסנן |

Desktop לא מקבל את העמודה ב-SQLite.

מעטפת צ'אט קיימת ב-`src/components/ai-intake/AssistantDrawer.tsx`. היא נפתחת מהתפריט רק כשדגל PostHog `ai_intake_web` דולק, ורק ב-Web. בלי הדגל אין כפתור. השליחה מריצה את `classifyIntent`. אם הכוונה היא תנועה, `draftFromText` מחלץ סכום, מטבע, סוג, תאריך יחסי ושער שנכתב במשפט. התיאור נשאר בלי פועל הפקודה, בלי הסכום ובלי המטבע ("קניתי מאפים באליס ב-15 שח" נשמר כ"מאפים באליס"). קטגוריה ואמצעי תשלום מתמלאים רק ממילים ברורות, כמו מאפה או אשראי. כפתור "אשר ושמור" ממיר למטבע ברירת המחדל (שער מהמשפט, או שער עדכני אם לא נכתב) וקורא ל-`public.create_ai_text_intake` ואז ל-`public.commit_ai_intake_items`. אחרי שמירה מוצלחת מתעדכן `lastDbFetchTimestamp` והטבלה נטענת מחדש, כדי שהשורה תופיע עם אייקון המקור. כפתור "בטל" קורא ל-`public.undo_ai_intake_commit`. הביטול מוחק את התנועה רק אם היא של המשתמש, נוצרה מ-AI, לא נערכה מאז השמירה, ועברו פחות מ-7 ימים. לחיצה שנייה מחזירה שהביטול כבר נעשה. אלה מעטפות לפונקציות ב-schema `ai`, כי ה-schema עדיין לא חשוף ב-Data API. בלי שער השמירה נעצרת.

## סיווג כוונות

`classifyIntent` מחזיר אחת משש תוויות: `add_transaction`, `create_rule`, `ask_data`, `find_duplicates`, `help`, `out_of_scope`.

טקסט שלא מזוהה יוצא `out_of_scope`. משפט שמכיל גם הוראה עוינת וגם "קניתי 10 שקל" נשאר `add_transaction`, כי הטקסט הוא נתון ולא פקודה. הסיווג לא מוחק ולא רושם כלום.

## רישום תנועה

`ai.commit_intake_items` רצה רק עבור המשתמש המחובר (`auth.uid()`). היא לא סומכת על `user_id` שמגיע בגוף הבקשה.

לכל פריט היא בודקת:

- הבעלות והגרסה (`expected_version`)
- סטטוס `approved` או `ready`
- שהמטבע הוא מטבע ברירת המחדל ב-`profiles`, אחרי המרה אם צריך
- שסכום מומר קרוב עד אגורה ל-`round(original * rate, 2)`, כדי לא לדחות את עיגול ה-`toFixed(2)` של הטופס

פריט שכבר נרשם מחזיר את אותה תנועה. `anon` לא יכול להריץ את הפונקציה.

ה-schema `ai` עדיין לא חשוף ב-Data API. הלקוח קורא לעטיפות `public.create_ai_text_intake` ו-`public.commit_ai_intake_items`.

## מה לא לגעת בו

- לא למזג את `feat/ai-intake` ל-`main` לפני שיש יכולת שלמה שנבדקה על testing.
- שינוי תחת `supabase/functions/_shared/` , כשיגיע ל-`main`, פורס מחדש את כל פונקציות ה-Edge.
- `get_user_transactions` ב-testing כבר כולל `p_origin` אופציונלי. קריאה בלי הפרמטר נשארת תקינה. בייצור החתימה הישנה עדיין רצה.
