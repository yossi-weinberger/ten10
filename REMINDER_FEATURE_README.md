# פיצ'ר תזכורות חודשיות - הוראות שימוש

## סקירה כללית

פיצ'ר התזכורות החודשיות מאפשר למשתמשים לקבל תזכורות לעדכון המעשרות שלהם. הפיצ'ר מותאם לפלטפורמות שונות:

- **ווב (Web)**: תזכורות במייל באמצעות Amazon SES
- **דסקטופ (Desktop)**: תזכורות במחשב (ייושם בעתיד)

## תכונות

### הגדרות תזכורות

- **הפעלה/כיבוי**: משתמשים יכולים להפעיל או לכבות תזכורות
- **יום בחודש**: 4 אפשרויות - 1, 10, 15, או 20 בחודש
- **שמירה כפולה**:
  - localStorage (לזמינות offline)
  - Supabase (למשתמשי ווב)

### התאמה לפלטפורמות

- **ווב**: טקסט מתאים לתזכורות במייל
- **דסקטופ**: טקסט מתאים לתזכורות במחשב

## מבנה הנתונים

### Settings Interface

```typescript
interface Settings {
  // ... הגדרות קיימות
  reminderSettings: {
    enabled: boolean;
    dayOfMonth: 1 | 10 | 15 | 20;
  };
}
```

### Supabase Schema

```sql
-- טבלת profiles
ALTER TABLE public.profiles
ADD COLUMN reminder_settings JSONB DEFAULT '{
  "enabled": false,
  "dayOfMonth": 1
}'::jsonb;
```

## קבצים שעודכנו

### Frontend

- `src/lib/store.ts` - הוספת reminderSettings ל-Settings interface
- `src/components/settings/NotificationSettingsCard.tsx` - ממשק משתמש חדש
- `src/pages/SettingsPage.tsx` - שמירה כפולה לווב ודסקטופ

### תרגומים

- `public/locales/he/settings.json` - טקסטים בעברית
- `public/locales/en/settings.json` - טקסטים באנגלית
- `public/locales/he/common.json` - הודעות שגיאה
- `public/locales/en/common.json` - הודעות שגיאה

### Database

- `supabase_migration_add_reminder_settings.sql` - מיגרציה ל-Supabase

## סיכום השלבים

### ✅ מה הושלם:

1. **הפעלת המיגרציה** - נוספו עמודות `reminder_enabled` ו-`reminder_day_of_month` לטבלת `profiles`
2. **תיקון שגיאות** - נוסף migration logic ל-Zustand store למשתמשים קיימים
3. **שיפור UI/UX** - כפתורים מרובעים, בחירת יום מתחת להתראות
4. **הגדרת Amazon SES** - דומיין מאומת, DNS מוגדר, Email Routing פעיל
5. **יצירת AWS IAM User** - `ten10-ses-sender` עם הרשאות SES
6. **יצירת Edge Function** - `send-reminder-emails` ב-Supabase
7. **הגדרת Secrets** - AWS keys ו-Service Role Key ב-Supabase
8. **יצירת RPC Function** - `get_reminder_users_with_emails` למסד הנתונים
9. **בדיקות מוצלחות** - מיילים נשלחים בהצלחה!

### ❌ מה נותר לעשות:

1. **הגדרת Cron Job** לשליחה יומית
2. **יציאה מ-Sandbox Mode** ב-SES (בקשה נשלחה ל-AWS)

## סיכום מה שעשינו

### 1. יצירת AWS IAM User ✅

- נוצר משתמש `ten10-ses-sender` עם הרשאות `AmazonSESFullAccess`
- נוצרו Access Keys ונשמרו ב-Supabase Secrets

### 2. יצירת Edge Function ✅

- נוצר `send-reminder-emails` ב-Supabase
- משתמש ב-SESv2 API עם AWS SDK v3
- תומך בעברית ו-RTL
- מחשב יתרת מעשר לכל משתמש

### 3. הגדרת Secrets ✅

```bash
supabase secrets set \
  AWS_REGION=eu-central-1 \
  AWS_ACCESS_KEY_ID=... \
  AWS_SECRET_ACCESS_KEY=... \
  SES_FROM=reminder-noreply@ten10-app.com \
  SUPABASE_SERVICE_ROLE_KEY=...
```

### 4. יצירת RPC Function ✅

```sql
CREATE OR REPLACE FUNCTION get_reminder_users_with_emails(reminder_day INTEGER)
RETURNS TABLE (
  id UUID,
  email VARCHAR(255),
  reminder_enabled BOOLEAN,
  reminder_day_of_month INTEGER
)
```

### 5. בדיקות מוצלחות ✅

```bash
supabase functions invoke send-reminder-emails --body '{"test": true}'
```

## השלבים הבאים

### 1. הגדרת Cron Job

- הגדר Scheduled Edge Function לפעם ביום
- בדוק משתמשים עם `reminder_enabled = true`
- שלח מיילים בימים 1, 10, 15, 20

### 2. יציאה מ-Sandbox Mode

- בקשה נשלחה ל-AWS
- ממתין לאישור (24-48 שעות)
- אחרי האישור: שליחה לכל מייל ללא הגבלות

## איך זה עובד

### זרימת העבודה

1. **משתמש מגדיר תזכורות**:

   - בוחר יום בחודש (1, 10, 15, 20)
   - מפעיל תזכורות
   - ההגדרות נשמרות ב-`profiles` table

2. **Cron Job רץ כל יום**:

   - בודק אם היום הוא יום תזכורת
   - קורא ל-Edge Function

3. **Edge Function**:

   - משתמש ב-RPC function `get_reminder_users_with_emails`
   - מביא משתמשים עם תזכורות ליום הנוכחי
   - מחשב יתרת מעשר לכל משתמש
   - שולח מייל מותאם אישית

4. **מייל נשלח**:
   - דרך Amazon SES
   - תוכן בעברית עם RTL
   - קישור לאפליקציה

### מבנה המייל

```html
<div dir="rtl">
  <h2>שלום!</h2>
  <p>זוהי התזכורת החודשית שלך לעדכון המעשרות.</p>

  <div style="background-color: #fef3c7;">
    <h3>נותר לך 150.00 ₪ לתרומה</h3>
  </div>

  <a href="https://ten10-app.com">פתח את Ten10</a>
</div>
```

## בדיקות

### בדיקות ידניות ✅

1. **ווב**:

   - ✅ פתח את דף ההגדרות
   - ✅ הפעל תזכורות
   - ✅ בחר יום בחודש
   - ✅ בדוק שההגדרות נשמרות ב-localStorage ו-Supabase

2. **שליחת מיילים**:
   - ✅ Edge Function עובד
   - ✅ מיילים נשלחים בהצלחה
   - ✅ תוכן בעברית ו-RTL

### בדיקות אוטומטיות

- הוסף בדיקות unit ל-components
- הוסף בדיקות integration ל-Supabase

## הערות טכניות

### שמירה כפולה

ההגדרות נשמרות בשני מקומות:

1. **localStorage** - באמצעות Zustand persist middleware
2. **Supabase** - רק למשתמשי ווב מחוברים

### Edge Function Architecture

```typescript
// RPC Function - גישה למסד הנתונים
const { data: users } = await supabaseClient.rpc(
  "get_reminder_users_with_emails",
  { reminder_day: currentDay }
);

// SES Client - שליחת מיילים
const sesClient = new SESv2Client({
  region: "eu-central-1",
  credentials: { accessKeyId, secretAccessKey },
});

// חישוב מעשר לכל משתמש
const { data: titheData } = await supabaseClient.rpc(
  "calculate_user_tithe_balance",
  { p_user_id: user.id }
);
```

### טיפול בשגיאות

- אם שמירה ב-Supabase נכשלת, המשתמש מקבל הודעת שגיאה
- ההגדרות המקומיות עדיין נשמרות
- Edge Function מטפל בשגיאות SES וממשיך למשתמש הבא

### ביצועים

- השמירה ב-Supabase מתבצעת באופן אסינכרוני
- אין חסימה של ממשק המשתמש
- Edge Function רץ ב-Deno runtime (מהיר ויעיל)

## תמיכה

לשאלות או בעיות, פנה לצוות הפיתוח.
