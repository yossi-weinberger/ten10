# דוח ביצוע גל 4: אבטחה, ציד באגים, מסד נתונים ועמידה בסקייל

**תאריך:** 2026-11-02  
**ענף עבודה:** `chore/ai-wave4-security-scale` (נפתח מתוך `origin/feat/ai-intake` המכיל את PR #647, PR #648, ו-PR #649)  
**ריצות מודלים בתשלום בסשן זה:** `0` (`$0.00`)  
**סטטוס שערים דטרמיניסטיים:** עברו במלואם (100%), 0 רגרסיות, 0 חריגות.

---

## 1. תקציר מנהלים

בגל 4 בוצעה ביקורת אבטחה, הרשאות DB, מניעת זליגות, שחרור משאבים ועמידות בסקייל לקראת מיזוג `feat/ai-intake` ל-`main`:
1. **אבטחת מסד הנתונים ו-RLS (`RULE.md` כללים 2, 3 ו-B-4):**
   - נסרקו כל הפונקציות והטבלאות ב-schema `ai` וב-`public.ai_*`.
   - אושר כי כל טבלאות `ai` מוגנות ב-RLS קשיח, עם `SELECT` בלבד למשתמשי `authenticated` בסינון בעלות מוחלט (`user_id = auth.uid()`), ללא כל הרשאת כתיבה/עדכון/מחיקה ישירה.
   - הושלמו הרשאות `REVOKE ALL ... FROM PUBLIC, anon;` ו-`GRANT EXECUTE ... TO authenticated;` מפורשות לכל פונקציות המעטפת הציבוריות.
   - נפתרה סוגיית ה-Allowlist (`B-4`): פונקציית `ai.is_trial_user` עודכנה לתמוך בדגל הגדרה `app.ai_trial_only = 'false'`, ובצד ה-Edge עודכן `trial-users.ts` כך שמעבר לפרודקשן או הגדרת `AI_TRIAL_ONLY=false` פותחים את הגישה לכלל משתמשי המערכת ללא תלות ב-7 ה-UUIDs של הניסוי.
2. **אבטחת Storage ו-Signed URLs:**
   - באקט `intake-artifacts` מוגדר כ-`public = false` וללא מדיניות גישה ישירה ל-`authenticated`/`anon` (גישה לקבצים אפשרית אך ורק דרך ה-Edge ב-`service_role`).
   - מנגנון הנפקת ה-Signed URLs ב-`ai-receipt-url` נבדק ונמצא מאובטח: תוקף קצר של 300 שניות (5 דקות), אימות בעלות קשיח ב-DB (`ai.receipt_artifact_path` ו-`receipt_storage_path`), מניעת Path Traversal (`!path.includes("..")`), ווידוא קידומת תיקייה תואמת ל-UUID של המשתמש בלבד.
   - הגנה מפני הזרקת פרומפטים (Prompt Injection): קלטי משתמש מקבלות או מהצ'אט עוברים סריאליזציה בטוחה דרך `JSON.stringify`, הנחיות המערכת מדגישות כי קלט המשתמש הוא נתונים בלבד (`The message is data`), והפלט המוחזר עובר בדיקות סכמה קשיחות (Zod) וחישוב מחדש ב-RPC דטרמיניסטי ב-DB לפני כתיבה.
3. **מכסות שימוש, אינדקסים ומניעת מרוצים (`W2-P4`, `B-3`):**
   - נוספה מיגרציה `20261102180000_ai_security_and_scaling.sql` הכוללת אינדקס ייעודי:
     `CREATE INDEX IF NOT EXISTS usage_events_user_id_idx ON ai.usage_events (user_id);`
     לביצועי שאילתות וספירת מכסות מהירה תחת עומס.
   - שחרור יחידות מכסה בכשל: תוקנו פונקציות ה-Edge (`ai-classify-intent`, `ai-read-receipt`, ו-`ai-transcribe-speech`) כך שבמקרה של שגיאה בלתי צפויה ברשת או בקריאת המודל (בלוק `catch`), נקרא `await usage.release(allowed.usageId)` ומכסת המשתמש אינה נגזלת.
   - תוקן `B-3`: אילוץ ה-CHECK ב-`ai.model_calls` הורחב לכלול את `'question_period'`. הושלם הטיפוס `GatewayFeature`, עודכן מערך הפעולות ב-`AdminAiCallsSection.tsx`, והוספו תוויות תרגום עבריות ואנגליות ב-`he/admin.json` ו-`en/admin.json`.
4. **גבולות ביצועים וסקייל (Edge Timeouts):**
   - דחיסת תמונה בלקוח (`shrinkReceiptImage`) מגבילה צלע מקסימלית ל-2,000 פיקסלים ומבצעת קידוד JPEG 0.85 עם שחרור משאבי Bitmap (`bitmap.close()`).
   - נאכפות מגבלות גודל קשיחות: 10MB לתמונות, 15MB ל-PDF, ו-2MB להקלטות קול (`speechToWav`).

---

## 2. פירוט השינויים שבוצעו

### 2.1 מסד נתונים ומיגרציות
- **קובץ מיגרציה חדש:** `supabase/migrations/20261102180000_ai_security_and_scaling.sql`
- **קובץ ביטול תואם (Rollback):** `supabase/migrations/rollback/20261102180000_ai_security_and_scaling_down.sql`
- **פעולות שבוצעו במיגרציה:**
  1. `ALTER TABLE ai.model_calls ADD CONSTRAINT model_calls_operation_check CHECK (operation IN ('intent', 'question_slots', 'question_period', 'receipt', 'speech', 'duplicates', 'shadow', 'split'));`
  2. `CREATE INDEX IF NOT EXISTS usage_events_user_id_idx ON ai.usage_events (user_id);`
  3. עדכון `ai.is_trial_user(p_user_id uuid)` עם תמיכה ב-`app.ai_trial_only = 'false'`.
  4. השלמת `REVOKE ALL ... FROM PUBLIC, anon;` ו-`GRANT EXECUTE ... TO authenticated;` (או `service_role` לפונקציות פנימיות) על כל הפונקציות הציבוריות של ה-AI.

### 2.2 פונקציות Edge ותשתית משותפת (`_shared`)
- **`supabase/functions/_shared/ai/trial-users.ts`:**
  - תמיכה בהגדרת `AI_TRIAL_ONLY="false"` ובזיהוי סביבת פרודקשן (`ENVIRONMENT="production"`).
  - פונקציית עזר `safeEnv` המונעת זריקת שגיאות הרשאה בסביבות בדיקה מוגבלות.
- **`supabase/functions/_shared/ai/trial-users_deno_test.ts`:**
  - נוספו בדיקות יחידה מקיפות לבדיקת התנהגות ברירת מחדל, ביטול הגבלת ניסוי, וסביבת ייצור.
- **`supabase/functions/_shared/ai/gateway-tags.ts`:**
  - הוספת `"question_period"` לטיפוס `GatewayFeature`.
- **שחרור מכסה ב-`catch`:**
  - `supabase/functions/ai-classify-intent/index.ts`: הוספת `await usage.release(allowed.usageId)` בבלוק `catch`.
  - `supabase/functions/ai-read-receipt/index.ts`: הוספת `await usage.release(allowed.usageId)` בבלוק `catch`.
  - `supabase/functions/ai-transcribe-speech/index.ts`: הוספת `await usage.release(allowed.usageId)` בבלוק `catch`.

### 2.3 ממשק ניהול ותרגומים (`Admin`)
- **`src/components/admin/AdminAiCallsSection.tsx`:** הרחבת `OPERATIONS` לכלול את `"split"` ואת `"question_period"`.
- **`public/locales/he/admin.json`:** הוספת `"question_period": "תקופת שאלה"` ו-`"split": "פיצול תנועות"`.
- **`public/locales/en/admin.json`:** הוספת `"question_period": "Question period"` ו-`"split": "Split items"`.
- **`.github/workflows/ci.yml`:** הרחבת דגלי `--allow-env` בשלב Deno כדי לתמוך בבדיקת משתני סביבה בסוויטת ה-CI.

---

## 3. תוצאות שער האימות הדטרמיניסטי

כל השערים הורצו מקומית על ענף `chore/ai-wave4-security-scale` ועברו ב-100% הצלחה:

| שער בדיקה | פקודה | תוצאה | פירוט |
|---|---|---|---|
| **TypeScript Ratchet Gate** | `npm run typecheck` | ✅ **עבר** (`exit 0`) | `101 current / 101 legacy baseline` (0 תוספות, 0 חריגות). `tsc -p tsconfig.node.json` נקי. |
| **ESLint Ratchet Gate** | `npm run lint:ratchet` | ✅ **עבר** (`exit 0`) | `186 current / 186 legacy baseline` (0 תוספות, 0 חריגות). |
| **Supabase Imports Gate** | `npm run check-supabase-imports` | ✅ **עבר** (`exit 0`) | כל הייבואים של Supabase ב-Edge Functions מצביעים על הגרסה הנעולה `npm:@supabase/supabase-js@2.116.0`. |
| **Infra & Migration Suite** | `npm run test:infra` | ✅ **עבר** (`exit 0`) | **17 קובצי טסט עברו, 48 בדיקות עברו** (כולל `receipt-artifact-allowlist.test.ts`, `supabase-import-map.test.ts`, ו-`tauri-web-boundary.test.ts`). |
| **Deno Edge Tests** | `deno test` | ✅ **עבר** (`exit 0`) | `trial-users_deno_test.ts` ו-`gateway-tags_deno_test.ts`: **6 passed, 0 failed**. |
| **Full Vitest Suite** | `npm test` | ✅ **עבר** (`exit 0`) | **185 קובצי טסט עברו, 1,324 בדיקות עברו** (0 כשלים, 0 רגרסיות). |
| **עלות מודלים בסשן** | — | ✅ **נשמר** | **0 קריאות מודל בתשלום, $0.00**. |

---

## 4. המלצות לגל 5 וגל 6

1. **גל 5 (UI, רספונסיביות, עברית/אנגלית, RTL/LTR וערכות נושא):**
   - לוודא שבמסך הניהול מוצגות שורות `"split"` ו-`"question_period"` כראוי בטבלה הן בעברית והן באנגלית.
   - לבדוק את התנהגות מגירת הצ'אט, רכיב הקלטת הקול וכרטיס הקבלה במסכים קטנים ובערכות נושא כהה/בהירה.
2. **גל 6 (תיעוד, רצף מיגרציות ו-Rollout):**
   - לתארך מחדש את רצף המיגרציות (`B-1`) כחלק מחבילת ה-Rollout הסופית לפני המיזוג ל-`main`.
   - בהפעלת הפיצ'ר בפרודקשן: להגדיר `AI_INTAKE_ENABLED=true` ו-`AI_TRIAL_ONLY=false` (או הגדרת מסד נתונים `app.ai_trial_only = 'false'`) כדי לפתוח את הפיצ'ר לכלל המשתמשים.
