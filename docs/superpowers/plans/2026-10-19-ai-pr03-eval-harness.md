# PR 3 — harness להערכה אופליין של החלטות

> **לסוכן:** משימה אחת לסשן. קודם תוכנית ובדיקות, אחר כך קוד. בסוף: לעדכן `ai-progress.md`. הכללים ב־`.cursor/rules/ai-multichannel/RULE.md`.

**מטרה:** ממשק החלטה ספק־אגנוסטי, מתאם כללים טהור, שני מתאמי־דמה שאין להם רשת, ו־runner שנותן ציון exact match על fixtures מקומיים. בלי ספק אמיתי, בלי קבלות ובלי persistence.

**סעיפים במסמך:** §9.1–9.6, §21.2, שורת PR 3 ב־§24.1.

**סוג:** קוד בלבד, בלי migrations ובלי Edge Function חדשה.

**תלות:** PR 2b ממוזג ל־`feat/ai-intake` (חוזה הטיוטה וסוגי `AI_DRAFT`). ה־PR הזה נפתח מ־`origin/feat/ai-intake` אחרי מיזוג `origin/main`.

**ענף:** `feat/ai-pr03-eval-harness`, מול `feat/ai-intake`. לא מול `main`, ולא ממזגים אותו בסשן הזה.

## אילוצים

- **הממשק:** רק `decide<TChoice>()`. אין שם ספק בתוך ה־interface. `Jev` ו־structured LLM הם שמות של מחלקות מתאם, לא של הממשק.
- **מה אסור בקוד `_shared`:** `i18n`, React, browser APIs, Tauri, קבצים מ־`public/`, ו־aliases מסוג `@/`. ב־Deno מייבאים עם סיומת `.ts`.
- **אין רשת ואין סודות.** אין מפתחות, אין קריאת `fetch`, אין SDK, ואין קריאת env של ספק. מתאם הדמה זורק `not configured` רק כשקוראים ל־`decide` בלי credentials. הבנאי עצמו לא זורק.
- **טקסט מקור הוא נתון.** מחרוזת prompt injection לא משנה את ההחלטה. המתאם קורא רק שדות שכבר חולצו, לא את `text`.
- **בדיקות Deno:** קובץ `*_deno_test.ts`. שלב ה־Deno ב־CI אוסף אותם אוטומטית לפי השם; אין צורך לערוך `ci.yml`.
- **פריסה:** אין פונקציית Edge חדשה, ולכן לא נוגעים ב־`deploy-changed-functions.sh`. קבצים חדשים תחת `_shared` עדיין יפרסו את כל פונקציות ה־Edge כש־`feat/ai-intake` ימוזג ל־`main`. זה לא קורה ב־PR הזה.
- **אין לוגים.** אין `console`, אין PostHog, ואין תוכן של קבלה או פרומפט בפלט. logger משותף יתווסף לפני הקוד הראשון שכותב לוג, לא כאן.

## מבנה יעד

```text
supabase/functions/_shared/ai/
  decision.ts                      # DecisionAdapter.decide<TChoice>()
  rules-decision-adapter.ts        # בחירה טהורה מרשימה סגורה
  stub-decision-adapters.ts        # JevDecisionAdapter, StructuredLlmDecisionAdapter
  eval-runner.ts                   # קריאת JSON מקומי וציון exact match
  fixtures/eval-cases.json         # 12 מקרים סינתטיים
  decision_deno_test.ts
```

ה־runner מקבל פונקציית קריאה מוזרקת. כך אין תלות ב־Deno או ב־Node בתוך הליבה. `deno test` ב־2.5.2 לא מעניק `--allow-read`, ולכן הבדיקה מזינה את תוכן `eval-cases.json` דרך הפונקציה הזו, בלי לשנות את `ci.yml`.

## משימות

### משימה 1: ממשק ההחלטה
- [ ] `DecisionFields`: `date`, `amount`, `currency`, `type`, ו־`text` לא מהימן.
- [ ] `DecisionInput<TChoice>`: `choices` סגור ו־`fields`.
- [ ] `DecisionResult<TChoice>`: `choice` אחד מתוך הרשימה.
- [ ] `DecisionAdapter.decide` מחזיר `Promise`. אין `extractDraft`, `transcribe` או `summarizeAggregates` ב־PR הזה.

### משימה 2: מתאם כללים
- [ ] אם `fields.type` נמצא ב־`choices`, זו הבחירה.
- [ ] תווית מעשר לא קנונית (`מעשר`, `מעשרות`, `tithe`, `maaser`) נפתרת ל־`donation` רק אם `donation` נמצא ברשימה הסגורה.
- [ ] `text` לא נקרא. רשימה ריקה, או סוג שאינו ברשימה ואינו תווית מעשר, זורקים שגיאה ולא ממציאים סוג.
- [ ] `initial_balance` לא נכנס, כי הוא לא ב־`AI_DRAFT_ALLOWED_TYPES` שהבדיקה מעבירה.

### משימה 3: מתאמי דמה
- [ ] `JevDecisionAdapter` ו־`StructuredLlmDecisionAdapter` מממשים את אותו interface.
- [ ] credentials הם דגל `configured` בלבד, בלי מפתח.
- [ ] `decide` בלי credentials זורק `DecisionNotConfiguredError` שההודעה שלה מכילה `not configured`.
- [ ] גם אם `configured: true`, אין קריאת רשת: השגיאה אומרת שהקריאות כבויות בבילד הזה.

### משימה 4: runner ו־fixtures
- [ ] 12 מקרים סינתטיים בעברית ובאנגלית: סכום, תאריך וסוג; מקרה USD אחד בלי המרה; מקרה מעשר עמום; מקרה prompt injection כנתון.
- [ ] הציון הוא exact match נפרד ל־`date`, `amount`, `currency` ו־`type`.
- [ ] תאריך, סכום ומטבע מושווים לשדות שכבר חולצו. הסוג מושווה ל־`choice` של המתאם שהועבר. ה־runner לא בוחר ספק.

### משימה 5: בדיקות
- [ ] מתאם הכללים מחזיר בחירה מתוך הרשימה המותרת.
- [ ] אותו שדות עם טקסט הזרקה ובלי טקסט הזרקה נותנים אותה בחירה.
- [ ] בניית מתאם דמה בלי credentials לא זורקת; הקריאה ל־`decide` זורקת.
- [ ] ה־runner טוען את קובץ ה־fixtures וכל השדות יוצאים exact match מול מתאם הכללים.

## מתי זה "גמור"

- `deno test` על `decision_deno_test.ts` עובר.
- `npm run typecheck`, `npm run lint:ratchet`, `npm test` ו־`npm run check-supabase-imports` עוברים.
- אין קריאת ספק, אין תמונת קבלה, ואין migration.

## מחוץ ל־PR הזה

קריאות Jev או LLM אמיתיות, תמונות ו־PDF, STT, חילוץ קבלות, persistence, PostHog, UI, כיול confidence, ו־privacy events. §21.2 המלא (50–100 קבלות אמיתיות, F1, confusion matrix, יציבות של 5 הרצות) מחכה לספק ולדאטה אמיתית.
