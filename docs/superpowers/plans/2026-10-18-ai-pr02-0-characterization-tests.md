# PR 2.0 — בדיקות אפיון לפני ה־refactor של ה־domain

> **לסוכן:** משימה אחת לסשן. בסוף: לעדכן `ai-progress.md`. הכללים ב־`.cursor/rules/ai-multichannel/RULE.md`.

**מטרה:** לקבע בבדיקות את ההתנהגות **הנוכחית** של הייבוא, של זיהוי סוג התנועה ושל המרת המטבע, לפני ש־PR 2 מזיז את הקוד. בדיקה כאן מתארת את מה שקורה היום, גם אם זה נראה מוזר; לא מתקנים התנהגות.

**למה:** היום ל־`normalize` יש כ־5 בדיקות, כולן על תאריכים. ל־`type-resolver`, לשירות השערים ולחישוב ההמרה בטופס אין בדיקות, ואין fixtures לייבוא. בלי זה, "בלי שינוי התנהגות" ב־PR 2 הוא הצהרה ולא הוכחה.

**סעיפים במסמך:** §3.1, §10.1, §21.1, §24.1 (שורת 2.0), ונספח ו׳.

**סוג:** בדיקות ו־CI בלבד. אין שינוי בקוד מוצר, ואין השפעה על הייצור.

**ענף:** `test/ai-pr02-0-characterization`

## משימות

### משימה 1: fixtures לייבוא
- [ ] תיקייה `src/lib/import/__fixtures__/` עם שורות קלט ממופות ופלט צפוי, בפורמט שאפשר להעביר אחר כך ל־`_shared` (TS טהור, בלי `@/`).
- [ ] מקרים: כל אחד מארבעת הסוגים המיובאים; `recognized-expense` מפורש לעומת הסקה; סוגים "מיוחדים" (`exempt-income`, `non_tithe_donation`, `initial_balance`); סכום שלילי וחיובי בלי עמודת סוג; מטבע ברירת המחדל; מטבע זר נתמך (`foreign_currency_not_supported`); מטבע לא נתמך; קטגוריה ואמצעי תשלום בעברית ובאנגלית לפי ה־aliases; `is_chomesh`.

### משימה 2: בדיקות `normalizeRow` ו־`resolveTypeWithIssues`
- [ ] `src/lib/import/normalize.characterization.test.ts`: כל fixture נותן בדיוק את הפלט וה־issues של היום.
- [ ] בדיקות ל־`resolveTypeWithIssues` (ה־aliases וההסקה לפי סימן). לא לבדוק את `isImportableType` ו־`isSpecialType`, שאינם נקראים.
- [ ] לאתחל את `i18n` בבדיקות כמו בבדיקות הקיימות של `src`, כי `category-registry` ו־`payment-methods` תלויים בו.

### משימה 3: שירות השערים
- [ ] `src/lib/services/exchange-rate.service.test.ts` עם `fetch` מדומה: שרשרת הספקים לפי הסדר; parsing של כל ספק מתגובה שמורה; מעבר לספק הבא כשאחד נכשל; עיגול ל־4 ספרות; `from === to` מחזיר 1; cache של שעה ושער הפוך.
- [ ] parsing ועיגול זהים ב־`process-recurring-transactions`: בדיקה תחת `supabase/functions/process-recurring-transactions/` עם אותן תגובות שמורות. רק בדיקה, בלי לשנות את הפונקציה.

### משימה 4: חישוב ההמרה בטופס
- [ ] בדיקה לחישוב ב־`TransactionForm` (`Number((originalAmount * conversionRate).toFixed(2))`), על ערכי קצה של עיגול (למשל x.xx5). אם קשה לבדוק דרך הקומפוננטה, לבדוק את הביטוי דרך הפונקציה הקטנה ביותר שאפשר לייבא בלי לשנות קוד מוצר.

### משימה 5: CI
- [ ] ב־`ci.yml`, שלב ה־Deno מריץ היום רק שני קבצים. להפוך אותו לתבנית (`supabase/functions/**/*_deno_test.ts`) או להוסיף רשימה, כך שבדיקות parity של PR 2 ירוצו אוטומטית. לוודא שהשלב עדיין ירוק.

## מתי זה "גמור"

- הבדיקות החדשות ירוקות על הקוד הנוכחי, בלי שינוי בקוד מוצר.
- שלב ה־Deno ב־CI מריץ כל `*_deno_test.ts`.
- `npm run typecheck`, `npm run lint:ratchet` ו־`npm test` עוברים, ב־CI בשני אזורי הזמן (UTC ו־Asia/Jerusalem).

## מחוץ ל־PR הזה

כל העברה של קוד ל־`_shared` (PR 2), ותיקון של התנהגות שנראית שגויה. התנהגות כזו נרשמת ב־`ai-progress.md` כהחלטה פתוחה.
