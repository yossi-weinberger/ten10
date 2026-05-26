# דף הנחיתה של Ten10 - מדריך מלא

## סקירה כללית

דף נחיתה מתקדם עבור **Ten10** - מערכת ניהול המעשרות החכמה. הדף תומך בעברית/אנגלית (RTL/LTR), אנימציות, קרוסלת צילומי מסך, ניווט צף, SEO דינמי ומעקב אנליטיקס.

**הערה על מבנה הקוד בפועל:** הקובץ `src/pages/LandingPage.tsx` הוא _רק_ `re-export` ל־`src/pages/landing/index.tsx` (שם נמצא המימוש של הדף). הראוטינג מוגדר ב־`src/routes.ts` על הנתיב `/landing`.

## עדכון מצב נוכחי (מאי 2026)

דף הנחיתה עבר רענון מקיף סביב שפה עיצובית קיימת של הפרויקט, ולא סביב מערכת עיצוב חדשה. בעת עריכת הדף יש להעדיף את ה־tokens הגלובליים מ־`src/index.css` ו־`tailwind.config.js`: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `primary`, `accent`, ו־`Button`/`Card`/`Popover`/`Dialog` הקיימים.

עקרונות עדכניים:

- **שפה חזותית:** אמון פיננסי־הלכתי, רגוע ומכובד. הרקעים צריכים להיות בהירים/חמים, עם שימוש עדין ב־primary/emerald/accent. אין להחזיר blue SaaS כצבע מוביל ללא סיבה.
- **לא להמציא tokens חדשים:** צבעים קשיחים כמו `#fdfbf7` קיימים בכמה מקומות היסטוריים, אבל שינויים חדשים צריכים להעדיף tokens קיימים.
- **רדיוס:** להשתמש בדפוסי הפרויקט: כפתורים `rounded-md`, פאנלים/כרטיסים `rounded-lg`/`rounded-xl`, pills/icons `rounded-full`. לא להוסיף רדיוסים שונים בלי צורך.
- **Motion:** לשמור על אנימציות שיש להן ערך, כמו count-up בסטטיסטיקות והקלדת ההסכמה, אבל להימנע מ־glow אינסופי, text-shadow אינסופי, `transition-all`, או blobs חזקים מדי. במקומות משמעותיים יש לכבד `useReducedMotion`.
- **תמונות פיצ׳רים:** `src/pages/landing/constants/features.ts` הוא מקור האמת ל־`imageSrc`. אין למחוק קישורים לתמונות גם אם קובץ חסר זמנית; יש להוסיף את ה־asset החסר או להשאיר fallback ויזואלי. מחיקת metadata שוברת את שפת המותג.
- **ביצועים:** נתיב `/landing` lazy-loaded דרך `lazyRouteComponent` ב־`src/routes.ts`. אין להחזיר import סינכרוני של `LandingPage` ל־main bundle.
- **GitHub Releases:** `useLatestRelease` תומך ב־`enabled` ו־cache ב־`sessionStorage`; בדף הנחיתה יש להפעיל אותו רק כשה־DownloadSection נכנס ל־viewport כדי לא לבצע קריאת רשת מוקדמת.
- **ניווט:** הניווט הצף צריך לעבוד מול קונטיינר הגלילה הפנימי של האפליקציה, לא רק מול `window.scrollY`.

## ✨ תכונות עיקריות

### 🎨 עיצוב מודרני

- עיצוב responsive מלא (מובייל, טאבלט, דסקטופ)
- תמיכה מלאה ב-RTL/LTR (עברית ואנגלית)
- מצב כהה ובהיר
- אנימציות חלקות ואפקטים ויזואליים

### 🧭 ניווט חכם

- **Smooth Scrolling**: מעבר חלק בין סקשנים
- **Intersection Observer**: זיהוי אוטומטי של הסקשן הפעיל
- **ניווט צף**: תפריט ניווט שמופיע בגלילה עם הדגשת הסקשן הנוכחי
- **כפתור החלפת שפה**: מיקום קבוע בפינה העליונה

הערה טכנית עדכנית: הגלילה באפליקציה מתבצעת לרוב בתוך קונטיינר פנימי (`overflow-y-auto`) ולא ב־`window`. לכן `src/pages/landing/index.tsx` משתמש ב־helper שמאתר את ה־scroll parent האמיתי. כל ניווט פנימי צריך להשתמש ב־`scrollToSection`/`smoothScrollToElement` במקום `document.getElementById(...).scrollIntoView(...)` מקומי בתוך סקשנים.

התנהגות עדכנית:

- בדסקטופ: ניווט צף אנכי עם אפקט זכוכית, לוגו רחב, וטקסטים מלאים לסקשנים.
- במובייל/טאבלט: כפתור צף קטן שפותח `Popover` קומפקטי עם קישורי הסקשנים.
- `screenshots` הוא סקשן ניווט מלא ומופיע ב־`navigationItems`.
- בזמן גלילה שנגרמת מלחיצה, ה־IntersectionObserver מושתק זמנית כדי שהסימון הפעיל לא יקפוץ לסקשן ביניים.

### 🎠 קרוסלה מתקדמת

- **3 סלידים**: Dashboard, Transactions, Reports
- **Progress Bar**: מעקב אחר התקדמות הצפייה
- **Auto-loop**: חזרה אוטומטית לתחילה
- **Responsive**: מותאם לכל הגדלי מסך
- **מוכן לצילומי מסך אמיתיים**: רק להחליף את הדמו

### 📱 תמיכה רב-פלטפורמית מורחבת

- **גרסת ווב**: עם סנכרון בענן
- **גרסת מובייל PWA**: עם אזהרה שזה לא מומלץ כפתרון ראשי
- **גרסת דסקטופ**: מומלצת ומודגשת
- **הורדות לכל הפלטפורמות**: Windows, macOS, Linux

### 📖 תוכן דתי ותרבותי

- **ציטוטים מהמקורות**: פסוקים ומאמרי חז"ל
- **הסכמות רבנים**: 3 הסכמות (מוכן לעדכון עם שמות אמיתיים)
- **שיתוף עם מכון תורת האדם לאדם**: הדגשת האמינות ההלכתית

### 🔍 SEO ואופטימיזציה

- **Meta tags דינמיים**: מתעדכנים לפי שפה
- **Schema.org markup**: לתוצאות חיפוש מובנות
- **Open Graph**: לשיתוף ברשתות חברתיות
- **Twitter Cards**: לשיתוף בטוויטר
- **PWA meta tags**: לתמיכה באפליקציית ווב

### 📊 Analytics ומעקב

- **Google Analytics**: מעקב מלא אחר משתמשים
- **Event tracking**: מעקב אחר לחיצות על כפתורים חשובים
- **Language tracking**: מעקב אחר שפת המשתמש
- **Performance monitoring**: מוכן לחיבור

### ⚡ ביצועים

- **Lazy Loading**: רכיב מותאם אישית לתמונות
- **Code splitting**: טעינה מותנית של סקריפטים
- **Optimized animations**: אנימציות מותאמות לביצועים
- **Responsive images**: תמונות מותאמות לגודל מסך
- **Lazy route**: נתיב `/landing` נטען כ־lazy route דרך `lazyRouteComponent` כדי לא להגדיל את ה־main bundle.
- **Release fetch deferred**: פרטי ה־GitHub release נטענים רק כאשר סקשן ההורדה נכנס למסך, עם cache ב־`sessionStorage`.
- **Carousel listeners**: קרוסלת צילומי המסך לא מעדכנת React state על כל `scroll` של Embla; progress מתעדכן ב־`select`/`reInit`.

## 🏗️ מבנה הדף

### 1. Header Area

- כפתור החלפת שפה (קבוע)
- ניווט צף (מופיע בגלילה)

### 2. Hero Section (`#hero`)

- כותרת דינמית לפי שפה
- 2 כפתורי CTA עם tracking
- לוגו מונפש ורספונסיבי (`AnimatedLogo`)
- רקע ממותג ועדין בגווני `primary`/`accent`, ללא blue blobs כבדים

### 3. Stats Section

- 2 סטטיסטיקות (מונה אנימטיבי): הורדות דסקטופ + משתמשי אתר
- עיצוב trust-strip שקט עם tokens גלובליים, ללא glow/text-shadow אינסופי
- הספירה צריכה להתחיל כשהסקשן נכנס למסך, ולא מיד בטעינת הדף

### 4. Features Section (`#features`)

- 16 תכונות ב־Bento/Grid עם תמונות פיצ׳ר (`imageSrc`) ואינדיקציה לזמינות Web/Desktop
- תמונות הפיצ׳רים הן חלק משפת המותג; אין להסיר `imageSrc` כדי "למנוע 404". יש להוסיף assets חסרים או להשתמש ב־fallback icon.
- צבעי Web/Desktop צריכים להישאר עקביים עם `primary`/emerald ולא לחזור ל־blue SaaS חזק.

### 5. Platform Comparison (`#platforms`)

- **2 גרסאות עיקריות**: Web, Desktop
- הדגשת הגרסה המומלצת (Desktop)
- אזכור PWA כתכונה נוספת בגרסת הווב (לא כפלטפורמה נפרדת)

### 6. Testimonials (`#testimonials`)

- קרוסלת המלצות אופקית עם כרטיס מרכזי מודגש וכרטיסים צדדיים קטנים יותר
- תוכן ההמלצות אמיתי ומאנונם. אין להחזיר שמות משפחה מלאים ללא אישור.
- נקודות ניווט הן buttons רגילים עם `aria-current`, לא ARIA tabs.
- אין דירוג כוכבים כרגע, לפי החלטת UX קודמת.

### 7. Torah Quotes Section

- פסוק מרכזי מהתורה
- 2 מאמרי חז"ל
- עיצוב source-sheet / paper, ללא כרטיסיות גנריות וללא side-stripe borders
- להשתמש ב־`text-start` ו־`dir={i18n.dir()}` כדי לשמור RTL/LTR תקין

### 8. About & Endorsements (`#about`)

- שיתוף עם מכון תורת האדם לאדם
- הסכמה אחת מוצגת כ־featured endorsement כהה ומכובד
- בלוק ההסכמה משתמש ב־`/background.webp` כרקע עם overlay כהה לשמירת קריאות
- אנימציית ההקלדה של ההסכמה היא חלק מהעיצוב; אם משנים אותה, לשמור על שבירת שורות תקינה ועל `useReducedMotion`
- אין להוסיף טקסטים חדשים כמו "הסכמות נוספות יתווספו" ללא בקשת מוצר מפורשת

### 9. FAQ Section (`#faq`)

- 5 שאלות נפוצות
- תשובות מפורטות
- עיצוב מבוסס tokens (`bg-background`, `bg-card`, `border-border`)
- להשתמש ב־`text-start`, לא `text-right`

### 10. Download Section (`#download`)

- קישורי הורדה לכל הפלטפורמות
- **3 אפשרויות ל-Windows**:
  1. **Standard EXE** (מומלץ) - קל, ללא אדמין
  2. **MSI** - התקנה ארגונית
  3. **Offline / WebView2** - התקנה מלאה למחשבים ללא אינטרנט
- כפתור לאפליקציית ווב
- הדגשת האפשרויות השונות
- כפתור "לחסומים" מופיע רק בסביבת `desktop` לפי החלטת מוצר. אל תשנה זאת ללא אישור מפורש.
- כפתור גרסת האתר צריך להפנות ל־`https://ten10-app.com` כקישור חיצוני, לא ל־`/` בתוך אפליקציית הדסקטופ.
- אין להציג את הערת `download.comingSoon` אם היא יוצרת עומס חזותי בסקשן.

### 11. Footer

- קישורים לדפים נוספים
- מידע על החברה
- זכויות יוצרים

הערה: ה־Footer ממומש בקובץ `src/pages/landing/sections/Footer.tsx` אבל הוא מוצג ע"י `src/App.tsx` (כלומר הוא “גלובלי” ומופיע בכל הדפים הרלוונטיים, כולל `/landing`).

## 🛠️ קבצים שנוצרו/עודכנו

### קבצים חדשים:

- `src/components/ui/language-toggle.tsx` - כפתור החלפת שפה
- `src/components/ui/lazy-image.tsx` - רכיב lazy loading לתמונות

### קבצים שעודכנו:

- `src/pages/LandingPage.tsx` - entrypoint (re-export) לדף הנחיתה
- `src/pages/landing/index.tsx` - המימוש בפועל של דף הנחיתה
- `src/App.tsx` - הסתרת סיידבר בדף הנחיתה
- `src/routes.ts` - ראוט `/landing`
- `public/locales/he/landing.json` - תרגומים עברית מורחבים
- `public/locales/en/landing.json` - תרגומים אנגלית מורחבים
- `index.html` - meta tags בסיסיים (כולל Open Graph / Twitter / PWA)
- `src/index.css` - smooth scrolling גלובלי

## 🎯 הוראות שימוש

### גישה לדף:

```
https://your-domain.com/landing
```

### החלפת שפה:

- כפתור קבוע בפינה העליונה
- מעבר מיידי בין עברית לאנגלית
- השפה מנוהלת ע"י i18n; באפליקציה יש גם סנכרון מול `settings.language` לאחר hydration (כדי שהשינוי יישמר ולא “יוחזר”, חשוב לעדכן גם את ההגדרה)

### ניווט:

- גלילה רגילה או שימוש בניווט הצף
- לחיצה על כפתורי הניווט מעבירה חלק לסקשן
- הדגשה אוטומטית של הסקשן הפעיל

### הורדה:

- כפתורים מובילים לסקשן ההורדה
- קישורים ספציפיים לכל פלטפורמה
- tracking אוטומטי של לחיצות

## 🔧 הגדרות נדרשות

### Google Analytics:

1. הגדר משתנה סביבה `VITE_G_ANALYTICS_ID` עם המזהה האמיתי (למשל `G-XXXXXXXXXX`)
2. הגדר goals ב-GA לmeasure conversions
3. הפעל Enhanced Ecommerce אם רלוונטי

### צילומי מסך:

1. צלם 3 צילומי מסך איכותיים:
   - Dashboard עם נתונים
   - טבלת טרנזקציות
   - דוחות ותרשימים
2. שמור בגודל 1200x800 פיקסלים
3. החלף את הדמו בקרוסלה

### הסכמות רבנים:

1. עדכן את שמות הרבנים האמיתיים
2. הוסף ציטוטים אמיתיים
3. וודא אישור לפני פרסום

### קישורי הורדה:

1. העלה קבצי התקנה לתיקיית `/downloads/`
2. עדכן את הקישורים בקוד
3. בדוק שהקישורים עובדים

## 📈 מדדי הצלחה

### KPIs למעקב:

- **Conversion Rate**: אחוז המבקרים שמורידים
- **Time on Page**: זמן שהייה בדף
- **Scroll Depth**: עד איפה משתמשים גוללים
- **Language Usage**: איזה שפה נפוצה יותר
- **Platform Preference**: איזה גרסה מורידים יותר

### A/B Tests אפשריים:

- כותרות שונות
- צבעי כפתורים
- סדר סקשנים
- תוכן ההסכמות

## 🚀 שלבים הבאים

### מיידי:

1. ✅ הוסף צילומי מסך אמיתיים
2. ✅ עדכן שמות רבנים
3. ✅ הגדר Google Analytics
4. ✅ בדוק על מכשירים שונים

### קצר טווח:

- הוסף וידאו הדגמה
- שפר את האנימציות
- הוסף testimonials אמיתיים
- בצע A/B testing

### ארוך טווח:

- הוסף chatbot לתמיכה
- שלב עם CRM
- הוסף blog/מאמרים
- בנה קהילת משתמשים

## 💡 טיפים לאופטימיזציה

### ביצועים:

- השתמש ב-WebP לתמונות
- הפעל compression בשרת
- השתמש ב-CDN לקבצים סטטיים
- מזער CSS ו-JS

### SEO:

- הוסף sitemap.xml
- בצע audit עם Google PageSpeed
- וודא mobile-friendliness
- הוסף structured data נוספים

### UX:

- בדוק accessibility עם screen readers
- וודא contrast ratios
- בדוק keyboard navigation
- הוסף loading states

## 🌍 תמיכה רב-לשונית

### קבצי תרגום:

- `public/locales/he/landing.json` - תרגומים עברית
- `public/locales/en/landing.json` - תרגומים אנגלית

### שימוש ב-i18n:

```typescript
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation("landing");

  return <h1>{t("hero.title")}</h1>;
}
```

### החלפת שפה:

- כפתור קבוע בפינה העליונה
- השפה נשמרת דרך הגדרות האפליקציה (Zustand `settings.language`) וה־i18n מסונכרן אליה לאחר hydration
- מעבר מיידי בין שפות

## 🎨 עיצוב ו-UX

### עקרונות עיצוב:

- **RTL/LTR Support**: תמיכה מלאה בעברית ואנגלית
- **Responsive Design**: מותאם לכל הגדלי מסך
- **Dark Mode**: תמיכה במצב כהה ובהיר
- **Accessibility**: תמיכה ב-screen readers ו-keyboard navigation

### אנימציות:

- **Framer Motion**: אנימציות חלקות ומתקדמות
- **Intersection Observer**: אנימציות בהתבסס על גלילה
- **Hover Effects**: אפקטים אינטראקטיביים
- **Loading States**: מצבי טעינה ברורים

## 🔧 פיתוח ותחזוקה

### טכנולוגיות:

- **React** + **TypeScript**
- **Tailwind CSS** לעיצוב
- **shadcn/ui** לקומפוננטים
- **Lucide React** לאייקונים
- **react-i18next** לתרגומים
- **TanStack Router** לניתוב
- **Framer Motion** לאנימציות

### מבנה קבצים:

```
src/pages/landing/
├── index.tsx                    # הדף הראשי
├── sections/
│   ├── HeroSection.tsx         # סקשן ראשי
│   ├── StatsSection.tsx        # סטטיסטיקות
│   ├── FeaturesSection.tsx     # תכונות
│   ├── QuotesSection.tsx       # ציטוטים
│   ├── PlatformsSection.tsx    # פלטפורמות
│   ├── AboutSection.tsx        # אודות
│   ├── TestimonialsSection.tsx # המלצות
│   ├── FaqSection.tsx          # שאלות נפוצות
│   ├── DownloadSection.tsx     # הורדות
│   └── Footer.tsx              # כותרת תחתונה
├── components/
│   ├── ScreenshotCarousel.tsx  # קרוסלת צילומי מסך
│   ├── FloatingNavigation.tsx  # ניווט צף
│   ├── LanguageToggleFixed.tsx # החלפת שפה/Theme (דרך PageControls)
│   ├── AnimatedLogo.tsx        # לוגו מונפש
│   └── LandingButtons.tsx      # כפתורים/CTA (אם בשימוש)
└── constants/
    ├── navigationItems.ts      # פריטי ניווט
    ├── features.ts             # רשימת תכונות (כולל imageSrc infrastructure)
    ├── faqs.ts                 # (אם בשימוש)
    └── testimonials.ts         # (אם בשימוש)
```

### הוראות פיתוח:

1. **עקוב אחר הגיידליינים הקיימים** של הפרויקט
2. **השתמש בקומפוננטים מהספרייה הקיימת**
3. **תמיכה מלאה בנושא הקיים** (light/dark mode)
4. **קוד נקי ומתועד**

## 📊 Analytics ו-Monitoring

### Google Analytics:

- **Page Views**: מעקב אחר צפיות בדף
- **Events**: מעקב אחר לחיצות על כפתורים
- **Conversions**: מעקב אחר הורדות
- **Language Usage**: מעקב אחר שפת המשתמש

### Performance Monitoring:

- **Core Web Vitals**: LCP, FID, CLS
- **Loading Times**: זמן טעינת הדף
- **User Engagement**: זמן שהייה ואינטראקציה

## 🚀 Deployment

### CI/CD:

- **GitHub Actions**: deployment אוטומטי
- **Vercel**: hosting מהיר ויעיל
- **Supabase**: backend services

### Environment Variables:

```bash
VITE_G_ANALYTICS_ID=G-XXXXXXXXXX
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

---

**סטטוס:** ✅ **ממומש בקוד** (כולל קרוסלה, SEO דינמי, GA אופציונלי, תרגומים)  
**גרסה:** 2.0 - Enhanced  
**תאריך עדכון:** ינואר 2025  
**מפתח:** AI Assistant + User Collaboration

**הערה:** זכור להחליף את הדמו בצילומי מסך אמיתיים ולעדכן את שמות הרבנים לפני פרסום!
