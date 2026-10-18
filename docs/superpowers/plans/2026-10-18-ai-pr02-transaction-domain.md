# PR 2 — ליבת domain משותפת לדפדפן ולשרת

> **לסוכן:** משימה אחת לסשן. קודם תוכנית ובדיקות, אחר כך קוד. בסוף: לעדכן `ai-progress.md`. הכללים ב־`.cursor/rules/ai-multichannel/RULE.md`.

**מטרה:** להוציא את כללי התנועות לקוד טהור ב־`supabase/functions/_shared/`, שרץ גם בדפדפן וגם ב־Deno, **בלי שום שינוי התנהגות**. ייבוא CSV, Desktop, הטופס הידני והוראות קבע עובדים בדיוק כמו היום. זה הבסיס שטיוטות ה־AI יבנו עליו.

**סעיפים במסמך:** §10.1, §10.2, §18, ושורת שלב 1 בטבלה של §23.

**סוג:** קוד בלבד, בלי migrations. רץ במקביל למסלול ה־DB (PR 1c ו־1b).

**ענף:** `feat/ai-pr02-transaction-domain`. אם ה־PR גדל, אפשר לפצל: 2a = משימות 1–3, 2b = משימות 4–6.

## אילוצים

- **תקדים:** `src/lib/calendar/index.ts` מייבא מ־`supabase/functions/_shared/calendar/`, ויש בדיקות Deno (`index_deno_test.ts`) ו־fixtures משותפים (`parity-fixtures.ts`). עובדים באותו דפוס.
- **מה אסור בקוד `_shared`:** `i18n`, React, browser APIs, Tauri, קבצים מ־`public/`, ו־aliases מסוג `@/`. ב־Deno מייבאים עם סיומת `.ts`.
- **re-exports:** הנתיבים הישנים נשארים, כך שלא נשבר אף צרכן.
- **בדיקות:** fixtures זהים רצים ב־Vitest וב־Deno ומוכיחים תוצאה זהה.
- **לפני ואחרי:** `scripts/tauri-web-boundary.test.ts`, `lint:ratchet` ו־typecheck ratchet עוברים.

## מבנה יעד

```text
supabase/functions/_shared/transaction-domain/
  transaction-types.ts     # TransactionType, isImportableType, isSpecialType
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

### משימה 1: מפתחות וסוגים
- [ ] `transaction-types.ts`: להעביר את `isImportableType` ואת `isSpecialType` מ־`src/lib/import/type-resolver.ts`, עם re-export.
- [ ] `category-keys.ts` ו־`payment-method-keys.ts`: רק המפתחות והכינויים. `src/lib/category-registry.ts` ו־`src/lib/payment-methods.ts` צורכים אותם ומשאירים אצלם את התוויות ואת `i18n`.

### משימה 2: כינויי parsing
- [ ] `import-locale-aliases.ts` מייבא היום JSON מ־`public/locales`. להעביר את הנתונים למודול typed אחד ב־`_shared` (או ליצור אותו מה־JSON בתהליך build אחד), כך שאין שתי רשימות ידניות.

### משימה 3: `normalize-core` ופרופיל
- [ ] `ValidationProfile = { allowedTypes, foreignCurrency: "reject" | "convert" }`.
- [ ] `FILE_IMPORT` = ההתנהגות של היום: ארבעת הסוגים, `recognized-expense` רק כשהוא כתוב במפורש, `foreign_currency_not_supported` כשגיאה fatal.
- [ ] `AI_DRAFT` = שישה סוגים, בלי `initial_balance`. מטבע זר יוצא עם `original_amount` ו־`original_currency` וממתין להמרה.
- [ ] `src/lib/import/normalize.ts` הופך לעטיפה עם `FILE_IMPORT`. fixtures: כל הבדיקות הקיימות של הייבוא נותנות תוצאה זהה.

### משימה 4: המרת מטבע
- [ ] `exchange-rates.ts`: רשימת הספקים (exchangerate-api, frankfurter, floatrates) וה־parsing שלהם, עם `fetch` מוזרק.
- [ ] `src/lib/services/exchange-rate.service.ts` ו־`process-recurring-transactions` צורכים אותה, ומשאירים אצלם את ה־cache ואת מצב ה־offline.
- [ ] `currency-rules.ts`: `applyConversion` = `amount = round2(original × rate)`, עם שער מעוגל ל־4 ספרות, כמו ב־`TransactionForm`.
- [ ] בדיקות עם תגובות שמורות, כולל ספק שנכשל ומעבר לבא בתור.

### משימה 5: טיפוס משותף ועורך
- [ ] `NormalizedTransactionRow`: שדות ההמרה הם ערך או `null`. `ImportNormalizedRow` הופך לטיפוס צר מעליו, ששדות ההמרה בו נשארים `null`.
- [ ] `ImportRowEditModal`: מתאם שתלוי בפרופיל. `FILE_IMPORT` מאפס כמו היום; `AI_DRAFT` מעביר את השדות בשני הכיוונים.
- [ ] בדיקת round-trip: טיוטת `AI_DRAFT` במטבע זר נפתחת ונשמרת עם כל חמשת השדות.

### משימה 6: חוזה הטיוטה
- [ ] `_shared/intake/contracts.ts`: `TransactionDraftV1` ב־Zod. `src/lib/intake/contracts.ts` רק מייצא אותו מחדש.
- [ ] adapter טהור `draft-to-import.ts` מ־`TransactionDraftV1` ל־`NormalizedTransactionRow`, עם בדיקות. בלי UI.

## מתי זה "גמור"

- אותם fixtures עוברים ב־Vitest וב־Deno.
- ייבוא CSV/XLSX, Desktop, הטופס הידני והוראות קבע בלי regression. כל הבדיקות הקיימות ירוקות.
- `npm run typecheck`, `npm run lint:ratchet`, `npm test` ו־`npm run check-supabase-imports` עוברים.

## מחוץ ל־PR הזה

טבלאות `ai`, Edge Functions של intake, UI של צ'אט, ושינוי התנהגות כלשהו בייבוא.
