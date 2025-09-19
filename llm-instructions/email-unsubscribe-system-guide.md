# מערכת ביטול הרשמה למיילים (Email Unsubscribe System) - מדריך טכני מלא

## סקירה כללית

מסמך זה מתאר את המערכת המלאה לביטול הרשמה מתזכורות מייל באפליקציית Ten10. המערכת מספקת שתי אפשרויות: הפסקת תזכורות חודשיות בלבד, או ביטול הרשמה מוחלט מכל המיילים.

## ארכיטקטורה כללית

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Email         │    │   Edge Function  │    │   Database      │
│   (With Buttons)│───▶│   /unsubscribe   │───▶│   (profiles)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                       │                       │
        │              ┌─────────▼────────┐             │
        │              │  JWT Validation  │             │
        │              │  & Token Verify  │             │
        │              └──────────────────┘             │
        │                       │                       │
        ▼              ┌─────────▼────────┐             ▼
┌─────────────────┐    │  Success/Error   │    ┌─────────────────┐
│   User Clicks   │    │  HTML Pages      │    │   Update User   │
│   Unsubscribe   │    │  (Hebrew RTL)    │    │   Preferences   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

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
- **תכונות**:
  - יצירת JWT tokens מאובטחים לכל מייל
  - הוספת List-Unsubscribe headers (תמיכה עתידית)
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
- בסיס URL: `${SUPABASE_URL}/functions/v1/unsubscribe`
- פרמטרים: `token` (JWT מוצפן) + `type` (reminder/all)

### 3. Edge Function לטיפול בביטול הרשמה

#### 3.1 מיקום ותכונות

- **מיקום**: `supabase/functions/unsubscribe/index.ts`
- **הגדרה**: `--no-verify-jwt` (גישה ציבורית)
- **תמיכה**: GET (דף רגיל) + POST (One-Click unsubscribe)

#### 3.2 זרימת העבודה

1. **קבלת בקשה**: GET/POST עם JWT token
2. **אימות Token**: בדיקת תקינות וחתימה
3. **בדיקת תפוגה**: וידוא שהטוקן לא פג תוקף
4. **עדכון העדפות**: קריאה ל-RPC function
5. **תגובה**: דף הצלחה/שגיאה בעברית

#### 3.3 דפי תגובה

- **דף הצלחה**: עיצוב gradient כחול, אייקון ✅
- **דף שגיאה**: עיצוב gradient אדום, אייקון ❌
- **RTL מלא**: תמיכה בעברית עם `dir="rtl"`
- **responsive**: מותאם למובייל וטאבלט

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
  - אבטחה: SECURITY DEFINER
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

- **CAN-SPAM Act**: List-Unsubscribe headers (תמיכה עתידית)
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

- `src/pages/UnsubscribePage.tsx` - דף unsubscribe ב-React
- `supabase/functions/verify-unsubscribe-token/index.ts` - אימות JWT מאובטח

### 3. Database Functions

- `update_user_preferences()` - עדכון העדפות
- `get_reminder_users_with_emails()` - שליפת משתמשים

### 4. Deployment

- `supabase/scripts/deploy-functions.js`

## משתני סביבה נדרשים

### Supabase Secrets

```bash
JWT_SECRET="M4G3el9m139YzCuNb7TqD0VoQ3KlK21XOt63ekWWmG4="
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

# פריסה ידנית של פונקציה ספציפית
npx supabase@latest functions deploy unsubscribe --no-verify-jwt --project-ref PROJECT_ID
```

### 2. הגדרות פונקציות

- **send-reminder-emails**: עם JWT verification (רגיל)
- **unsubscribe**: ללא JWT verification (`--no-verify-jwt`)

## בדיקות ומוניטורינג

### 1. בדיקת פונקציונליות

```bash
# בדיקת שליחת מיילים
curl -X POST "URL/functions/v1/send-reminder-emails" \
  -H "Authorization: Bearer ANON_KEY" \
  -d '{"test": true}'

# בדיקת unsubscribe (עם טוקן אמיתי)
curl "URL/functions/v1/unsubscribe?token=JWT_TOKEN&type=all"
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
supabase functions logs unsubscribe
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

### 3. Security Headers (עתידי)

```typescript
// מוכן להוספה כאשר AWS SDK יתמוך
MessageHeaders: [
  {
    Name: "List-Unsubscribe",
    Value: `<${unsubscribeUrls.allUrl}>`,
  },
  {
    Name: "List-Unsubscribe-Post",
    Value: "List-Unsubscribe=One-Click",
  },
];
```

## משימות לשיפור (Future Tasks)

### 1. עיצוב ו-UX

- [ ] שיפור עיצוב דפי unsubscribe
- [ ] הוספת אנימציות ומעברים
- [ ] שיפור responsive design
- [ ] הוספת dark mode לדפי unsubscribe

### 2. תמיכה רב-לשונית

- [ ] זיהוי שפת משתמש מהדאטהבייס
- [ ] מיילים מותאמי שפה (עברית/אנגלית)
- [ ] דפי unsubscribe מותאמי שפה
- [ ] שילוב עם מערכת i18n הקיימת

### 3. תכונות מתקדמות

- [ ] הוספת List-Unsubscribe headers ל-SES
- [ ] אנליטיקס על unsubscribe rates
- [ ] A/B testing למיילים
- [ ] תבניות מייל מרובות

### 4. אבטחה מתקדמת

- [ ] Rate limiting על unsubscribe requests
- [ ] Honeypot protection
- [ ] גיאו-blocking אופציונלי
- [ ] audit log למעקב אחר שינויים

## קבצים שנוצרו/עודכנו

### קבצים חדשים:

- `supabase/functions/unsubscribe/index.ts`
- `supabase/functions/send-reminder-emails/jwt-utils.ts`
- `supabase/functions/send-reminder-emails/simple-email-service.ts`

### קבצים שעודכנו:

- `supabase/functions/send-reminder-emails/email-templates.ts`
- `supabase/functions/send-reminder-emails/email-service.ts`
- `supabase/scripts/deploy-functions.js`

### פונקציות DB שנוצרו:

- `update_user_preferences(p_user_id, p_reminder_enabled, p_mailing_list_consent)`
- `get_reminder_users_with_emails(reminder_day)` (עודכן)

## הוראות תחזוקה

### 1. עדכון תבניות מייל

1. ערוך `email-templates.ts`
2. הרץ `npm run deploy-supabase`
3. בדוק במייל טסט

### 2. שינוי הגדרות אבטחה

1. עדכן JWT_SECRET ב-Supabase secrets
2. עדכן `deploy-functions.js`
3. פרוס מחדש

### 3. הוספת שפות חדשות

1. הוסף זיהוי שפה ב-`profiles` table
2. עדכן `email-templates.ts` לתמיכה רב-לשונית
3. עדכן `unsubscribe/index.ts` לדפים מותאמי שפה

---

**סטטוס**: ✅ **מערכת פעילה ומוכנה לשימוש**
**תאריך עדכון אחרון**: ינואר 2025
**גרסה**: 1.0 - יציבה
**נבדק על**: שליחת מיילים + unsubscribe מלא
