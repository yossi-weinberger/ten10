# PR 2 — ליבת domain משותפת לדפדפן ולשרת

> **לסוכן:** משימה אחת לסשן. קודם תוכנית ובדיקות, אחר כך קוד. בסוף: לעדכן `ai-progress.md`. הכללים ב־`.cursor/rules/ai-multichannel/RULE.md`.

**מטרה:** להוציא את כללי התנועות לקוד טהור ב־`supabase/functions/_shared/`, שרץ גם בדפדפן וגם ב־Deno, **בלי שום שינוי התנהגות**. ייבוא CSV, Desktop, הטופס הידני והוראות קבע עובדים בדיוק כמו היום. זה הבסיס שטיוטות ה־AI יבנו עליו.

**סעיפים במסמך:** §10.1, §10.2, §18, ושורת שלב 1 בטבלה של §23, ונספח ו׳.

**סוג:** קוד בלבד, בלי migrations. רץ במקביל למסלול ה־DB (PR 1c ו־1b).

**תלות:** PR 2.0 (`2026-10-18-ai-pr02-0-characterization-tests.md`) ממוזג. בלי בדיקות האפיון אין דרך להוכיח "בלי שינוי התנהגות".

**ענפים:** שני PRs:
- `feat/ai-pr02a-domain-keys`: משימות 1–3.
- `feat/ai-pr02b-domain-profile`: משימות 4–6.

## אילוצים

- **תקדים:** `src/lib/calendar/index.ts` מייבא מ־`supabase/functions/_shared/calendar/`, ויש בדיקות Deno (`index_deno_test.ts`) ו־fixtures משותפים (`parity-fixtures.ts`). עובדים באותו דפוס. שימו לב: ה־calendar טהור מלכתחילה, ואילו `normalize` תלוי היום ב־`i18n` דרך `category-registry` ו־`payment-methods`. הפיצול כאן קשה יותר.
- **מה אסור בקוד `_shared`:** `i18n`, React, browser APIs, Tauri, קבצים מ־`public/`, ו־aliases מסוג `@/`. ב־Deno מייבאים עם סיומת `.ts`.
- **re-exports:** הנתיבים הישנים נשארים, כך שלא נשבר אף צרכן.
- **בדיקות:** fixtures זהים רצים ב־Vitest וב־Deno ומוכיחים תוצאה זהה. כל קובץ `*_deno_test.ts` חדש נוסף לשלב ה־Deno ב־`ci.yml`, אחרת הוא לא רץ.
- **לפני ואחרי:** `scripts/tauri-web-boundary.test.ts`, `lint:ratchet` ו־typecheck ratchet עוברים.
- **פריסה:** כל קובץ חדש תחת `supabase/functions/_shared/` גורם במיזוג לפריסה מחדש של כל 10 פונקציות ה־Edge בייצור (`SHARED_DEPENDENT` ב־`deploy-changed-functions.sh`), גם אם אף פונקציה לא מייבאת אותו. ממזגים בשעה רחוקה מה־crons (00:00, 07:00, 18:00 ו־19:00 UTC), ובודקים אחרי הפריסה שהפונקציות בריאות ושהריצה הבאה של `daily-recurring-executor` הצליחה.
- **`process-recurring-transactions` לא משתנה ב־PR הזה.** הוא cron שכותב תנועות בייצור. המעבר שלו לספקי השערים המשותפים הוא PR נפרד, כשנדרשת המרה בשרת (PR 5).

## מבנה יעד

```text
supabase/functions/_shared/transaction-domain/
  transaction-types.ts     # TransactionType, type resolution (aliases + sign inference)
  category-keys.ts         # מפתחות קטגוריות, בלי תוויות מתורגמות
  payment-method-keys.ts
  parsing-aliases.ts       # הנתונים שהיום ב־import-locale-aliases.ts ו־public/locales/*/import.json
  normalize-core.ts        # נרמול טהור + ValidationProfile
  currency-rules.ts        # applyConversion, עיגול
  exchange-rates.ts        # רשימת ספקים + parsing; fetch מוזרק
supabase/functions/_shared/intake/
  contracts.ts             # TransactionDraftV1 (Zod) — משימה 6
```

## משימות

### משימה 1: מפתחות וסוגים (2a)
- [ ] `transaction-types.ts`: שבעת הסוגים, ולוגיקת זיהוי הסוג **שבאמת רצה** בייבוא: `TYPE_LOCALE_ALIASES` וההסקה לפי סימן ב־`resolveTypeWithIssues`. `isImportableType` ו־`isSpecialType` אינם נקראים היום (ו־`isSpecialType` כולל גם `initial_balance`); לא בונים עליהם, ולא מוחקים אותם ב־PR הזה.
- [ ] `category-keys.ts` ו־`payment-method-keys.ts`: רק המפתחות והכינויים. `src/lib/category-registry.ts` ו־`src/lib/payment-methods.ts` צורכים אותם ומשאירים אצלם את התוויות ואת `i18n`. ב־`payment-methods.ts` הכינויים בעברית ובאנגלית נבנים בזמן import; לשמור על הסדר והתוכן שלהם בדיוק.

### משימה 2: כינויי parsing (2a)
- [ ] `import-locale-aliases.ts` מייבא היום JSON מ־`public/locales`. להעביר את הנתונים למודול typed אחד ב־`_shared` (או ליצור אותו מה־JSON בתהליך build אחד), כך שאין שתי רשימות ידניות.

### משימה 3: `normalize-core` ופרופיל (2a)
- [ ] `ValidationProfile = { allowedTypes, foreignCurrency: "reject" | "convert" }`.
- [ ] `FILE_IMPORT` = ההתנהגות של היום: ארבעת הסוגים, `recognized-expense` רק כשהוא כתוב במפורש, `foreign_currency_not_supported` כשגיאה fatal.
- [ ] `AI_DRAFT` = שישה סוגים, בלי `initial_balance`. מטבע זר יוצא עם `original_amount` ו־`original_currency` וממתין להמרה.
- [ ] `src/lib/import/normalize.ts` הופך לעטיפה עם `FILE_IMPORT`. בדיקות האפיון של PR 2.0 עוברות בלי שינוי.

### משימה 4: המרת מטבע (2b)
- [ ] `exchange-rates.ts`: רשימת הספקים (exchangerate-api, frankfurter, floatrates) וה־parsing שלהם, עם `fetch` מוזרק.
- [ ] `src/lib/services/exchange-rate.service.ts` צורך אותה, ומשאיר אצלו את ה־cache, מצב ה־offline, ה־last-known וההחזרה המיידית כשהמטבעות זהים.
- [ ] `currency-rules.ts`: `applyConversion` = `amount = round2(original × rate)`, עם שער מעוגל ל־4 ספרות. היום העיגול ל־4 נעשה בשירות והעיגול ל־2 בטופס; התוצאה חייבת להיות זהה.
- [ ] בדיקות עם תגובות שמורות, כולל ספק שנכשל ומעבר לבא בתור.
- [ ] `TransactionForm` (ושאר המקומות שמחשבים `Number((originalAmount * conversionRate).toFixed(2))`: `OpeningBalanceModal`, `RecurringTransactionEditForm`, `recurring-transactions.service`) מייבאים את `applyConversion` במקום הביטוי ה־inline, עם אותה סמנטיקה בדיוק (כולל ההתנהגות של `toFixed`). אחר כך מחליפים את `TransactionForm.conversion.characterization.test.ts`, שהיום מעתיק את הנוסחה, בבדיקה שמייבאת את `applyConversion`. כך הבדיקה מגינה על קוד המוצר. `process-recurring-transactions` לא כלול.

### משימה 5: טיפוס משותף ועורך (2b)
- [ ] `NormalizedTransactionRow`: שדות ההמרה הם ערך או `null`. `ImportNormalizedRow` הופך לטיפוס צר מעליו, ששדות ההמרה בו נשארים `null`.
- [ ] `ImportRowEditModal`: מתאם שתלוי בפרופיל. `FILE_IMPORT` מאפס כמו היום; `AI_DRAFT` מעביר את השדות בשני הכיוונים.
- [ ] בדיקת round-trip: טיוטת `AI_DRAFT` במטבע זר נפתחת ונשמרת עם כל חמשת השדות.

### משימה 6: חוזה הטיוטה (2b)
- [ ] `_shared/intake/contracts.ts`: `TransactionDraftV1` ב־Zod. `src/lib/intake/contracts.ts` רק מייצא אותו מחדש.
- [ ] adapter טהור `draft-to-import.ts` מ־`TransactionDraftV1` ל־`NormalizedTransactionRow`, עם בדיקות. בלי UI.

## מתי זה "גמור"

- אותם fixtures עוברים ב־Vitest וב־Deno, ושלב ה־Deno ב־CI מריץ אותם.
- בדיקות האפיון של PR 2.0 עוברות בלי שינוי.
- ייבוא CSV/XLSX, Desktop, הטופס הידני והוראות קבע בלי regression. כל הבדיקות הקיימות ירוקות.
- אחרי המיזוג: כל 10 פונקציות ה־Edge נפרסו ובריאות, וריצת ה־cron הבאה הצליחה.
- `npm run typecheck`, `npm run lint:ratchet`, `npm test` ו־`npm run check-supabase-imports` עוברים.

## מחוץ ל־PR הזה

טבלאות `ai`, Edge Functions של intake, UI של צ'אט, שינוי התנהגות כלשהו בייבוא, ושינוי ב־`process-recurring-transactions`.
