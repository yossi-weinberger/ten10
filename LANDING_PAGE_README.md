# דף הנחיתה של Ten10

## סקירה כללית

דף נחיתה מודרני ומשכנע עבור אפליקציית Ten10 - מערכת ניהול מעשרות חכמה.

## תכונות עיקריות

### 🎨 עיצוב מודרני

- עיצוב responsive מלא (מובייל, טאבלט, דסקטופ)
- תמיכה מלאה ב-RTL/LTR (עברית ואנגלית)
- מצב כהה ובהיר
- אנימציות חלקות ואפקטים ויזואליים

### 📱 תמיכה רב-פלטפורמית

- הצגת יתרונות גרסת הווב מול גרסת הדסקטופ
- קישורי הורדה לכל הפלטפורמות (Windows, macOS, Linux)
- קישור ישיר לאפליקציית הווב

### 🌍 תמיכה רב-לשונית

- תרגומים מלאים בעברית ואנגלית
- שימוש במערכת i18next הקיימת
- namespace ייעודי: `landing`

## מבנה הדף

### 1. Hero Section

- כותרת ראשית משכנעת
- תיאור קצר של הערך המוצע
- שני כפתורי CTA: הורדה ונסיון בדפדפן
- דמו ויזואלי של הדשבורד

### 2. Stats Section

- סטטיסטיקות מרשימות (משתמשים, סכומים מנוהלים, דיוק)
- עיצוב gradient אטרקטיבי

### 3. Features Section

- 6 תכונות מרכזיות עם אייקונים
- כרטיסים אינטראקטיביים עם hover effects
- הסבר ברור על כל תכונה

### 4. Platform Comparison

- השוואה בין גרסת ווב לדסקטופ
- הדגשת יתרונות כל גרסה
- כפתורי פעולה ספציפיים לכל גרסה

### 5. Testimonials

- 3 המלצות ממשתמשים
- דירוג כוכבים
- עיצוב אמין ומקצועי

### 6. FAQ

- 4 שאלות נפוצות עם תשובות
- מתמודד עם חששות נפוצים
- מידע על אבטחה ונגישות

### 7. Download Section

- קישורי הורדה ספציפיים לכל פלטפורמה
- אפשרות לפתיחה באפליקציית הווב
- עיצוב נקי ופונקציונלי

### 8. Footer

- קישורים לדפים נוספים
- מידע על החברה
- זכויות יוצרים

## קבצים שנוצרו/עודכנו

### קבצים חדשים:

- `src/pages/LandingPage.tsx` - הקומפוננטה הראשית
- `public/locales/he/landing.json` - תרגומים בעברית
- `public/locales/en/landing.json` - תרגומים באנגלית

### קבצים שעודכנו:

- `src/routes.ts` - הוספת נתיב `/landing`
- `src/lib/i18n.ts` - הוספת namespace `landing`
- `src/index.css` - הוספת אנימציות CSS

## נגישות לדף

הדף נגיש בכתובת: `/landing`

הדף מוגדר כציבורי ולא דורש אימות, מה שמאפשר למשתמשים חדשים לצפות בו לפני ההרשמה.

## טכנולוגיות בשימוש

- **React** + **TypeScript**
- **Tailwind CSS** לעיצוב
- **shadcn/ui** לקומפוננטים
- **Lucide React** לאייקונים
- **react-i18next** לתרגומים
- **TanStack Router** לניתוב

## הערות פיתוח

- הדף בנוי על פי הגיידליינים הקיימים של הפרויקט
- שימוש בקומפוננטים מהספרייה הקיימת
- תמיכה מלאה בנושא הקיים (light/dark mode)
- קוד נקי ומתועד

## צילומי מסך

הדף כולל דמו ויזואלי של הדשבורד באזור ה-Hero, המדגים את הממשק הנקי והפשוט של האפליקציה.

---

**תאריך יצירה:** ינואר 2025
**סטטוס:** מוכן לשימוש
**גרסה:** 1.0
