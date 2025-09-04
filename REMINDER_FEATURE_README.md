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

## השלבים הבאים

### 1. ✅ הפעלת המיגרציה - הושלם!

המיגרציה הופעלה בהצלחה ב-Supabase באמצעות MCP:

- נוספה עמודה `reminder_settings` JSONB לטבלת `profiles`
- נוספו indexes לביצועים טובים יותר
- כל המשתמשים הקיימים קיבלו ערכי ברירת מחדל

### 2. ✅ תיקון שגיאת Migration - הושלם!

תוקנה השגיאה "Cannot read properties of undefined (reading 'enabled')":

- נוסף migration logic ל-Zustand store
- משתמשים קיימים יקבלו ערכי ברירת מחדל אוטומטית
- הפיצ'ר עכשיו עובד ללא שגיאות

### 3. ✅ שיפור מבנה DB ו-UI - הושלם!

- **מבנה DB**: שונה מ-JSONB לעמודות נפרדות (`reminder_enabled`, `reminder_day_of_month`)
- **UI משופר**: הסרת תזכורת חודשית נפרדת, בחירת היום מתחת להתראות
- **כפתורים מרובעים**: החלפת רשימת בחירה בכפתורים מרובעים כמו בבחירת מטבע
- **UX משופר**: הכפתורים לא מוסתרים אלא רק לא זמינים כשההתראות כבויות

### 4. הגדרת Amazon SES

- הגדר את Amazon SES לשליחת מיילים
- הוסף את ההגדרות לסביבת הייצור
- צור Edge Function ב-Supabase לשליחת המיילים

### 5. יישום תזכורות דסקטופ

- הוסף תמיכה בהתראות מקומיות
- השתמש ב-Tauri notifications API

## בדיקות

### בדיקות ידניות

1. **ווב**:

   - פתח את דף ההגדרות
   - הפעל תזכורות
   - בחר יום בחודש
   - בדוק שההגדרות נשמרות ב-localStorage ו-Supabase

2. **דסקטופ**:
   - פתח את האפליקציה
   - בדוק שהטקסט מתאים לפלטפורמת דסקטופ
   - בדוק שההגדרות נשמרות ב-localStorage

### בדיקות אוטומטיות

- הוסף בדיקות unit ל-components
- הוסף בדיקות integration ל-Supabase

## הערות טכניות

### שמירה כפולה

ההגדרות נשמרות בשני מקומות:

1. **localStorage** - באמצעות Zustand persist middleware
2. **Supabase** - רק למשתמשי ווב מחוברים

### טיפול בשגיאות

- אם שמירה ב-Supabase נכשלת, המשתמש מקבל הודעת שגיאה
- ההגדרות המקומיות עדיין נשמרות

### ביצועים

- השמירה ב-Supabase מתבצעת באופן אסינכרוני
- אין חסימה של ממשק המשתמש

## תמיכה

לשאלות או בעיות, פנה לצוות הפיתוח.
