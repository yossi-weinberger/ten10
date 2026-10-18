---
description: "Ten10 AI multichannel intake: non-negotiable rules for AI intake, the ai schema, channel adapters and the shared transaction-domain code."
globs: supabase/functions/_shared/intake/**,supabase/functions/_shared/ai/**,supabase/functions/_shared/transaction-domain/**,supabase/migrations/**,src/lib/intake/**,src/lib/import/**,src/components/ai-intake/**,infrastructure/cloudflare/**,docs/superpowers/plans/*ai-*.md
alwaysApply: false
---

# Ten10 AI Multichannel — חוקי עבודה

- **המסמך המלא:** `docs/superpowers/specs/2026-10-18-ai-multichannel-design.md` (v2.5). אל תקרא אותו כולו. פתח רק סעיפים לפי הפניה (§).
- **התקדמות והחלטות:** `docs/superpowers/plans/ai-progress.md`. קרא בתחילת כל סשן, ועדכן בסוף.
- **תוכנית לכל PR:** `docs/superpowers/plans/2026-10-18-ai-pr*.md`. עבוד רק על המשימה שהוגדרה לסשן.

## העיקרון

ה־AI כותב בעיפרון, Ten10 כותב בעט. ה־AI מציע טיוטה, קוד רגיל בודק, המשתמש מאשר, ו־RPC דטרמיניסטי רושם.

## אסור לשבור

1. AI לעולם לא כותב ל־`public.transactions`. רק `ai.commit_intake_items` כותב, אחרי אישור או שמירה אוטומטית בסיכון נמוך שנבדקת מחדש בתוך ה־RPC (§10.4, §10.6).
2. כל טבלה ופונקציה חדשה של היכולת יושבת ב־schema `ai` (§6.0). ב־`public.transactions` מותרת רק העמודה nullable `origin` (§6.1).
3. בטבלאות `ai` המשתמש (`authenticated`) מקבל SELECT בלבד, עם RLS של בעלות. כל כתיבה עוברת דרך RPC (`SECURITY DEFINER`, `search_path` קשיח, בדיקת `auth.uid()` בגוף, revoke מ־PUBLIC) או Edge Function עם service role (§6.5).
4. Migrations: רק חדשות, רק מוסיפות, ו־GRANT/REVOKE מפורשים (שינוי Supabase מ־30/10/2026). לא עורכים migrations קיימים. מצרפים קובץ rollback ב־`supabase/migrations/rollback/` כשמוחקים או מחליפים פונקציה.
5. ייבוא CSV/XLSX לא משתנה. `ValidationProfile.FILE_IMPORT` שומר בדיוק את ההתנהגות הקיימת, ו־fixtures מוכיחים זאת (§10.1).
6. מטבע זר: המרה בזמן הטיוטה, עם אותם שדות ועיגול כמו `TransactionForm` (סכום ב־2 ספרות, שער ב־4). ה־commit בודק את החישוב מחדש (§10.2, §10.4).
7. "היום" ו"אתמול" מחושבים לפי `received_at` ו־`timezone` של ההודעה, לא לפי שעון השרת (§6.2, §9.9).
8. קוד ב־`supabase/functions/_shared/` טהור: בלי Tauri, browser APIs, `i18n`, קבצים מ־`public/`, ובלי aliases מסוג `@/`. `src` מייבא ממנו, כמו `src/lib/calendar/index.ts`.
9. Desktop/Tauri ו־SQLite לא משתנים.
10. אין שם ספק ב־interface. משתמשים ב־`decide<TChoice>()`, ו־Jev הוא adapter מועמד (§9.2, §9.3).
11. אין תוכן קבלות, טקסט הודעות או פרומפטים בלוגים וב־PostHog. משתמשים ב־`logger`, לא ב־`console`.
12. ב־testing, עבודת AI רק על משתמשי הניסוי, דרך allowlist בצד השרת (§22.1). ענף ה־testing מכיל נתוני ייצור.

## לפני PR

- `npm run typecheck`, `npm run lint:ratchet`, `npm test` (כולל `scripts/tauri-web-boundary.test.ts`), ו־`npm run check-supabase-imports`.
- Edge Function חדשה נוספת ל־`ALL_FUNCTIONS`, ול־`SHARED_DEPENDENT` אם היא משתמשת ב־`_shared`, ב־`supabase/scripts/deploy-changed-functions.sh`.
- PR עם migrations: רק אחד בכל פעם מול ענף ה־testing, כי הענף הזה משותף לכל ה־PRs.

## עבודה בסשנים

- משימה אחת לסשן. קודם תוכנית, אחר כך קוד.
- בסוף הסשן: 3–5 שורות ב־`ai-progress.md` (מה נעשה, החלטות, הצעד הבא), ואז commit.
- קוד, הערות והודעות commit באנגלית, Conventional Commits.
