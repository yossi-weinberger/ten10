# מערכת ביטול הרשמה למיילים (Email Unsubscribe System) - מדריך טכני מלא

## סקירה כללית

מסמך זה מתאר את המערכת המלאה לביטול הרשמה מתזכורות מייל באפליקציית Ten10. המערכת מספקת שתי אפשרויות: הפסקת תזכורות חודשיות בלבד, או ביטול הרשמה מוחלט מכל המיילים.

## ארכיטקטורה כללית

```
┌─────────────────┐    ┌──────────────────────────────┐    ┌─────────────────┐
│   Email link    │    │  Edge Function               │    │   Database      │
│   /unsubscribe  │───▶│  verify-unsubscribe-token    │───▶│   profiles      │
│   ?token=&type= │    │  (verify JWT + service_role  │    │                 │
└─────────────────┘    │   update_user_preferences)   │    └─────────────────┘
        │              └──────────────────────────────┘
        ▼
┌─────────────────┐
│ UnsubscribePage │  single functions.invoke — no browser RPC with p_user_id
└─────────────────┘
```

**Phase 1:** browser calls only the Edge Function; apply runs with `service_role`.

**Phase 2 (current):** `EXECUTE` on `update_user_preferences` is granted to `service_role` only (`anon` / `authenticated` revoked).

## רכיבי המערכת

### 1. שילוב במיילים

#### 1.1 תבנית המייל (`email-templates.ts`)

- **מיקום**: `supabase/functions/send-reminder-emails/email-templates.ts`
- **תכונות**:
  - שני כפתורים במטה המייל
  - כפתור כתום: "הפסקת תזכורות חודשיות"
  - כפתור אפור: "ביטול הרשמה מכל המיילים"
  - עיצוב RTL מלא בעברית
  - responsive design

```typescript
// הוספה לinterface EmailTemplateData:
unsubscribeUrls?: {
  reminderUrl: string;
  allUrl: string;
};

// הכפתורים מוספים בתחתית המייל עם עיצוב מותאם
```

#### 1.2 שירות שליחת המיילים (`simple-email-service.ts`)

- **מיקום**: `supabase/functions/send-reminder-emails/simple-email-service.ts`
  (reminder transport — not `_shared/simple-email-service.ts`)
- **תכונות**:
  - יצירת JWT tokens מאובטחים לכל מייל
  - `List-Unsubscribe` + `List-Unsubscribe-Post` ב-Raw MIME (מיושם בפרודקשן)
  - קיפול Base64 ב־76 תווים; בדיקות לשורת MIME ≤ 998
  - שליחה דרך AWS SES REST API
  - טיפול בשגיאות ו-rate limiting

### 2. מערכת JWT Tokens

#### 2.1 יצירת Tokens (`jwt-utils.ts`)

- **מיקום**: `supabase/functions/send-reminder-emails/jwt-utils.ts`
- **אבטחה**:
  - חתימה דיגיטלית HMAC-SHA256
  - תפוגה אוטומטית (30 יום)
  - מידע מוצפן: userId, email, type, expiration
  - לא ניתן לזיוף או שינוי

```typescript
interface UnsubscribeTokenPayload {
  userId: string;
  email: string;
  type: "reminder" | "all";
  exp: number;
}
```

#### 2.2 יצירת קישורים מאובטחים

- קישור נפרד לכל סוג ביטול הרשמה
- בסיס URL באפליקציה: `https://ten10-app.com/unsubscribe` (דף React, לא Edge Function)
- פרמטרים: `token` (JWT חתום) + `type` (reminder/all)
- הדף קורא ל־`verify-unsubscribe-token` עם `functions.invoke`

### 3. Edge Function לטיפול בביטול הרשמה

#### 3.1 מיקום ותכונות

- **מיקום**: `supabase/functions/verify-unsubscribe-token/index.ts`
- **תפקיד**: אימות JWT (`JWT_SECRET`) + עדכון העדפות עם `SUPABASE_SERVICE_ROLE_KEY`
- **קריאה**: POST מ־`UnsubscribePage` (גוף: `{ token, type? }`)
- **הערה**: אין פונקציית `unsubscribe` נפרדת בריפו; ה־UI הוא React, לא HTML שמוחזר מה־Edge Function

#### 3.2 זרימת העבודה

1. **קבלת בקשה**: POST עם JWT token (ואופציונלית `type`)
2. **אימות Token**: בדיקת חתימה HMAC ותפוגה
3. **קביעת סוג** (`resolveUnsubscribeType` בקוד):
   1. `type` החתום ב־JWT אם `"reminder"` | `"all"`
   2. אחרת `body.type` אם תקין
   3. אחרת ברירת מחדל **`"all"`**
4. **עדכון העדפות**: RPC `update_user_preferences` דרך service_role
5. **תגובה**: JSON `{ success, type }` — בלי `userId`/`email` בדפדפן; הדף מציג הצלחה/שגיאה ב־UI

**Deploy sequencing (Phase 1 → Phase 2):** Phase 1 moved verify+apply into the
Edge Function without revoking RPC grants in the same change (EF deploy can lag
FE/migrations). Phase 2 (`20260715223000_lock_update_user_preferences_service_role.sql`)
locked `EXECUTE` to `service_role` only after Phase 1 was live. Do not revoke
grants before the Edge Function that applies preferences with the service role
is deployed.

#### 3.3 דף התגובה (Frontend)

- `src/pages/UnsubscribePage.tsx`
- מצבי loading / success / error עם i18n (`auth` namespace)
- RTL דרך כיוון האפליקציה הכללי

### 4. מסד הנתונים

#### 4.1 טבלת profiles - עמודות רלוונטיות

```sql
-- עמודות קיימות בטבלת profiles:
reminder_enabled BOOLEAN DEFAULT false  -- הפסקת תזכורות
mailing_list_consent BOOLEAN DEFAULT false  -- ביטול הרשמה מוחלט
```

#### 4.2 RPC Functions

- **`update_user_preferences`**: עדכון העדפות משתמש

  - פרמטרים: `p_user_id`, `p_reminder_enabled`, `p_mailing_list_consent`
  - אבטחה: SECURITY DEFINER; EXECUTE for `service_role` only (Phase 2)
  - לוגיקה: עדכון רק השדות שסופקו (COALESCE)

- **`get_reminder_users_with_emails`**: שליפת משתמשים לתזכורות
  - מסנן: רק משתמשים עם `mailing_list_consent = true`
  - תוצאה: רשימה עם id, email, העדפות

## אבטחה ופרטיות

### 1. הגנת מידע

- **JWT Tokens**: אין חשיפת מידע רגיש בקישורים
- **תפוגה אוטומטית**: טוקנים פגים תוקף אחרי 30 יום
- **הצפנה**: HMAC-SHA256 עם מפתח סודי
- **אימות**: בדיקת חתימה וזמן תפוגה

### 2. הגנה מפני התקפות

- **אין SQL Injection**: שימוש ב-RPC functions
- **אין CSRF**: טוקנים ייחודיים לכל מייל
- **אין Replay Attacks**: טוקנים עם תפוגה
- **Row Level Security**: RLS מופעל על כל הטבלאות

### 3. תאימות לתקנות

- **CAN-SPAM Act**: List-Unsubscribe headers במיילי תזכורות (מיושם ב-Raw MIME)
- **GDPR**: זכות למחיקת נתונים
- **RFC 8058**: One-Click unsubscribe support

## תהליכי העבודה

### 1. זרימת הפסקת תזכורות חודשיות

```
משתמש לוחץ כפתור כתום →
JWT token מאומת →
reminder_enabled = false →
דף הצלחה בעברית →
"לא תקבל יותר תזכורות חודשיות"
```

### 2. זרימת ביטול הרשמה מוחלט

```
משתמש לוחץ כפתור אפור →
JWT token מאומת →
mailing_list_consent = false →
דף הצלחה בעברית →
"הוסרת מרשימת התפוצה שלנו"
```

### 2.1 סנכרון טוגל ההגדרות אחרי unsubscribe

Unsubscribe מעדכן רק עמודות ייעודיות ב־`profiles` (`reminder_enabled` / `mailing_list_consent`), לא את `client_preferences.notifications`.

כדי שהטוגל בהגדרות ישקף את מצב המייל האמיתי:

- **תצוגה (web)**: `NotificationSettingsCard` מציג ON רק כש־`reminderEnabled && mailingListConsent`
- **תצוגה (desktop)**: הטוגל מבוסס על `reminderEnabled` בלבד (תזכורות מקומיות לא תלויות ב־mailing consent)
- **סנכרון**: `PreferencesSyncService` גוזר `notifications` מאותו AND אחרי טעינת העמודות מה־DB
- **כתיבה**: הפעלת הטוגל כותבת גם `reminder_enabled` וגם `mailing_list_consent` (רק השדות שהשתנו)

### 3. One-Click Unsubscribe (עתידי)

```
ספק מייל שולח POST →
אימות טוקן →
עדכון מיידי →
תגובה 200 OK
```

## קבצי הקוד המרכזיים

### 1. Frontend Email Generation

- `supabase/functions/send-reminder-emails/email-templates.ts`
- `supabase/functions/send-reminder-emails/simple-email-service.ts`
- `supabase/functions/send-reminder-emails/jwt-utils.ts`

### 2. Unsubscribe Handling

- `src/pages/UnsubscribePage.tsx` - React page; one `functions.invoke("verify-unsubscribe-token")`
- `supabase/functions/verify-unsubscribe-token/index.ts` - verifies JWT and applies preference update with `SUPABASE_SERVICE_ROLE_KEY`
- `src/components/settings/NotificationSettingsCard.tsx` - web: ON iff both columns; desktop: `reminderEnabled` only
- `src/lib/services/preferences-sync.service.ts` - derives local `notifications` from those columns on sync

### 3. Database Functions

- `update_user_preferences()` - called by the Edge Function (service_role only; anon/authenticated cannot EXECUTE)
- `get_reminder_users_with_emails()` - שליפת משתמשים

### 4. Deployment

- `supabase/scripts/deploy-functions.js`

## משתני סביבה נדרשים

### Supabase Secrets

```bash
JWT_SECRET="YOUR_JWT_SECRET_BASE64"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="eu-central-1"
SES_FROM="reminder-noreply@ten10-app.com"
SUPABASE_URL="..."
SUPABASE_SERVICE_ROLE_KEY="..."
```

## פריסה והפעלה

### 1. פקודות פריסה

```bash
# פריסה אוטומטית של כל הפונקציות
npm run deploy-supabase

# פריסה ידנית של פונקציית האימות/עדכון
npx supabase@latest functions deploy verify-unsubscribe-token --project-ref PROJECT_ID
```

### 2. הגדרות פונקציות

- **send-reminder-emails**: עם JWT verification (רגיל)
- **verify-unsubscribe-token**: נקראת מ־`functions.invoke` (anon/session key ב־gateway); האימות העסקי הוא JWT של unsubscribe (`JWT_SECRET`)
- **process-email-request**: ללא JWT verification (Cloudflare uses shared secret, not Supabase JWT)
  - Recommended: enforce via `supabase/config.toml`:
    ```toml
    [functions.process-email-request]
    verify_jwt = false
    ```
## בדיקות ומוניטורינג

### 1. בדיקת פונקציונליות

```bash
# בדיקת שליחת מיילים
curl -X POST "URL/functions/v1/send-reminder-emails" \
  -H "Authorization: Bearer ANON_KEY" \
  -d '{"test": true}'

# בדיקת unsubscribe (עם טוקן אמיתי)
curl -X POST "URL/functions/v1/verify-unsubscribe-token" \
  -H "Authorization: Bearer ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"token":"JWT_TOKEN","type":"all"}'
```
### 2. מוניטורינג

```sql
-- בדיקת מצב העדפות משתמשים
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE reminder_enabled = true) as reminder_enabled,
  COUNT(*) FILTER (WHERE mailing_list_consent = true) as mailing_consent
FROM profiles;

-- בדיקת פעילות unsubscribe
SELECT
  updated_at,
  reminder_enabled,
  mailing_list_consent
FROM profiles
WHERE updated_at > NOW() - INTERVAL '7 days'
ORDER BY updated_at DESC;
```

### 3. לוגים

```bash
# בדיקת לוגי פונקציות
supabase functions logs send-reminder-emails
supabase functions logs verify-unsubscribe-token
supabase functions logs send-reminder-emails
```

## בעיות ידועות ופתרונות

### 1. AWS SES SDK Compatibility

- **בעיה**: AWS SDK לא עובד ב-Deno Edge Functions
- **פתרון**: שימוש ב-REST API ישיר עם fetch
- **סטטוס**: פתור - `SimpleEmailService` עובד מושלם

### 2. JWT Library Imports

- **בעיה**: `createJWT` לא קיים ב-djwt v3.0.1
- **פתרון**: שימוש ב-`create` במקום `createJWT`
- **סטטוס**: פתור

### 3. HTML Encoding בדפי תגובה

- **בעיה**: טקסט עברית מוצג כ-HTML entities
- **פתרון**: תיקון Content-Type headers
- **סטטוס**: פתור

### 4. JWT Security Issues (תיקונים אבטחה - ינואר 2025)

- **בעיה**: Fallback secret "fallback-secret" ואימות JWT חסר בצד הלקוח
- **פתרון**:
  - הסרת fallback secret מ-`jwt-utils.ts`
  - יצירת פונקציה `verify-unsubscribe-token` לאימות מלא עם חתימה
  - מעבר מ-decode פשוט לאימות מאובטח ב-`UnsubscribePage.tsx`
- **סטטוס**: פתור - אבטחה מלאה מיושמת

## תכונות מתקדמות (מוטמעות)

### 1. One-Click Unsubscribe Support

- תמיכה ב-POST requests
- תואם RFC 8058
- מוכן לספקי מייל מתקדמים

### 2. AWS Click Tracking

- תמיכה אוטומטית ב-SES click tracking
- קישורים מוצפנים דרך AWS
- מעקב אחר לחיצות למטרות analytics

### 3. List-Unsubscribe headers (מיושם)

במיילי תזכורות, הכותרות מתווספות ב-Raw MIME ב־
`send-reminder-emails/simple-email-service.ts` (לא דרך MessageHeaders של
SDK ישן). `_shared/simple-email-service.ts` אינו מוסיף כותרות אלה.

## משימות לשיפור (Future Tasks)

### 1. עיצוב ו-UX

- [ ] שיפור עיצוב דפי unsubscribe
- [ ] הוספת אנימציות ומעברים
- [ ] שיפור responsive design
- [ ] הוספת dark mode לדפי unsubscribe

### 2. תמיכה רב-לשונית

- [x] מיילי תזכורות מותאמי שפה (עברית/אנגלית מ־`client_preferences.language`)
- [ ] דפי unsubscribe מותאמי שפה (כולל כיוון RTL/LTR מהטוקן או מהפרופיל)
- [ ] שילוב מלא עם מערכת i18n הקיימת בדפי unsubscribe

### 3. תכונות מתקדמות

- [x] List-Unsubscribe headers למיילי תזכורות (Raw MIME)
- [ ] אנליטיקס על unsubscribe rates
- [ ] A/B testing למיילים
- [ ] תבניות מייל מרובות

### 4. אבטחה מתקדמת

- [ ] Rate limiting על unsubscribe requests
- [ ] Honeypot protection
- [ ] גיאו-blocking אופציונלי
- [ ] audit log למעקב אחר שינויים

## קבצים שנוצרו/עודכנו

### קבצים מרכזיים (מצב נוכחי):

- `src/pages/UnsubscribePage.tsx`
- `supabase/functions/verify-unsubscribe-token/index.ts`
- `supabase/functions/send-reminder-emails/jwt-utils.ts`
- `supabase/functions/send-reminder-emails/simple-email-service.ts`
- `supabase/functions/send-reminder-emails/email-templates.ts`
- `docs/superpowers/specs/2026-07-15-secure-unsubscribe-flow-design.md`

### פונקציות DB:

- `update_user_preferences(p_user_id, p_reminder_enabled, p_mailing_list_consent)` — Edge Function only (`service_role`); grants locked in Phase 2
- `get_reminder_users_with_emails(reminder_day)`

## הוראות תחזוקה

### 1. עדכון תבניות מייל

1. ערוך `email-templates.ts`
2. הרץ `npm run deploy-supabase`
3. בדוק במייל טסט

### 2. שינוי הגדרות אבטחה

1. עדכן JWT_SECRET ב-Supabase secrets
2. פרוס מחדש את `verify-unsubscribe-token` ו־`send-reminder-emails`

### 3. הוספת שפות חדשות

1. הוסף מפתחות ב־`public/locales/*/auth.json` תחת `unsubscribe`
2. עדכן `email-templates.ts` לתמיכה רב-לשונית במיילים

---

**סטטוס**: ✅ **מערכת פעילה** — Phase 1 (verify+apply ב־EF) + Phase 2 (grants ל־service_role בלבד)  
**תאריך עדכון אחרון**: יולי 2026  
**נבדק על**: שליחת מיילים + זרימת unsubscribe דרך `verify-unsubscribe-token`
