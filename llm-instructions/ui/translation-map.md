# מפת תרגומים (Translation Map)

מסמך זה מרכז את כל הטקסטים הסטטיים באפליקציה שדורשים תרגום, וממפה אותם לקבצי התרגום (namespaces) המתאימים.

## סטטוס כללי: `הושלם` - כל הקומפוננטים תורגמו! 🎉

### מצב נוכחי:

- ✅ **הושלם**: כל הדפים והקומפוננטים במערכת
- ✅ **תמיכה מלאה ב-RTL/LTR** עם החלפת שפה דינמית
- ✅ **ארגון תרגומים בnamespaces לוגיים** לקלות תחזוקה

---

## 1. ניווט ופריסה כללית

### `navigation.json` - ✅ **הושלם**

| מפתח (Key)              | עברית        | אנגלית           | סטטוס |
| :---------------------- | :----------- | :--------------- | :---- |
| `appName`               | Ten10        | Ten10            | ✅    |
| `home`                  | דף הבית      | Home             | ✅    |
| `addTransaction`        | הוסף תנועה   | Add Transaction  | ✅    |
| `feedback`              | משוב         | Feedback         | ✅    |
| `allTransactions`       | כל התנועות   | All Transactions | ✅    |
| `recurringTransactions` | הוראות קבע   | Recurring        | ✅    |
| `analytics`             | ניתוח נתונים | Analytics        | ✅    |
| `halacha`               | הלכה         | Halacha          | ✅    |
| `settings`              | הגדרות       | Settings         | ✅    |
| `about`                 | אודות        | About            | ✅    |
| `profile`               | פרופיל       | Profile          | ✅    |
| `logout`                | התנתק        | Logout           | ✅    |

### `common.json` - ✅ **הושלם**

| מפתח (Key) | עברית        | אנגלית          | סטטוס |
| :--------- | :----------- | :-------------- | :---- |
| `loading`  | טוען...      | Loading...      | ✅    |
| `save`     | שמור         | Save            | ✅    |
| `cancel`   | ביטול        | Cancel          | ✅    |
| `edit`     | ערוך         | Edit            | ✅    |
| `delete`   | מחק          | Delete          | ✅    |
| `feedback.*` | דיאלוג משוב PostHog | PostHog feedback dialog | ✅ |
| `toasts.*` | הודעות מערכת | System messages | ✅    |

---

## 2. דשבורד - ✅ **הושלם**

### `dashboard.json`

| מפתח (Key)          | עברית               | אנגלית             | סטטוס |
| :------------------ | :------------------ | :----------------- | :---- |
| `title`             | דשבורד              | Dashboard          | ✅    |
| `subtitle`          | סקירת המצב הכספי    | Financial Overview | ✅    |
| `dateRangeLabels.*` | תוויות טווח תאריכים | Date range labels  | ✅    |
| `statsCards.*`      | כרטיסי סטטיסטיקה    | Statistics cards   | ✅    |
| `monthlyChart.*`    | גרף חודשי           | Monthly chart      | ✅    |
| `income`            | הכנסות              | Income             | ✅    |
| `expenses`          | הוצאות              | Expenses           | ✅    |
| `donations`         | תרומות              | Donations          | ✅    |

---

## 3. הוספת תנועה - ✅ **הושלם**

### `transactions.json`

| מפתח (Key)       | עברית                 | אנגלית                          | סטטוס |
| :--------------- | :-------------------- | :------------------------------ | :---- |
| `pageTitle`      | הוספת תנועה חדשה      | Add New Transaction             | ✅    |
| `pageSubtitle`   | הוסף תנועה כספית חדשה | Add a new financial transaction | ✅    |
| `formLabels.*`   | תוויות טופס           | Form labels                     | ✅    |
| `types.*`        | סוגי תנועות           | Transaction types               | ✅    |
| `placeholders.*` | תוויות מציין מקום     | Form placeholders               | ✅    |
| `buttons.*`      | כפתורי פעולה          | Action buttons                  | ✅    |
| `checkboxes.*`   | תיבות סימון           | Checkboxes                      | ✅    |
| `recurring.*`    | הגדרות קבע            | Recurring settings              | ✅    |

---

## 4. דף הגדרות - ✅ **הושלם**

### `settings.json`

| מפתח (Key)          | עברית                   | אנגלית                           | סטטוס |
| :------------------ | :---------------------- | :------------------------------- | :---- |
| `title`             | הגדרות                  | Settings                         | ✅    |
| `description`       | נהל את הגדרות האפליקציה | Manage your application settings | ✅    |
| `languageDisplay.*` | הגדרות שפה ותצוגה       | Language and display settings    | ✅    |
| `financial.*`       | הגדרות כספיות           | Financial settings               | ✅    |
| `calendar.*`        | הגדרות לוח שנה          | Calendar settings                | ✅    |
| `notifications.*`   | הגדרות התראות           | Notification settings            | ✅    |
| `dataManagement.*`  | ניהול נתונים            | Data management                  | ✅    |

---

## 5. טבלאות נתונים - ✅ **הושלם**

### `data-tables.json`

| קטגוריה               | מפתח (Key)           | עברית             | אנגלית                   | סטטוס |
| :-------------------- | :------------------- | :---------------- | :----------------------- | :---- |
| **עמודות**            | `columns.*`          | כותרות עמודות     | Column headers           | ✅    |
| **סוגי תנועות**       | `types.*`            | סוגי תנועות       | Transaction types        | ✅    |
| **פעולות**            | `actions.*`          | פעולות            | Actions                  | ✅    |
| **סינון**             | `filters.*`          | אפשרויות סינון    | Filter options           | ✅    |
| **ייצוא**             | `export.*`           | אפשרויות ייצוא    | Export options           | ✅    |
| **הודעות**            | `messages.*`         | הודעות מערכת      | System messages          | ✅    |
| **דיאלוגים**          | `modal.*`            | חלונות דיאלוג     | Dialog windows           | ✅    |
| **הוראות קבע**        | `recurring.*`        | הוראות קבע        | Recurring transactions   | ✅    |
| **רכיבי נגישות**      | `accessibility.*`    | רכיבי נגישות      | Accessibility components | ✅    |
| **עמודות הוראות קבע** | `recurringColumns.*` | עמודות הוראות קבע | Recurring columns        | ✅    |

---

## 6. דף הלכות - ✅ **הושלם**

### קבצי נושאים שונים:

- `halacha-common.json` - טקסטים כלליים ✅
- `halacha-introduction.json` - מבוא ✅
- `halacha-faq.json` - שאלות נפוצות ✅
- `halacha-tithes.json` - מעשרות ✅
- `halacha-income.json` - הכנסות ✅
- `halacha-expenses.json` - הוצאות ✅

---

## 7. דפי התחברות ופרופיל - ✅ **הושלם**

### `auth.json` - ✅ **הושלם**

| מפתח (Key)      | עברית               | אנגלית                 | סטטוס |
| :-------------- | :------------------ | :--------------------- | :---- |
| `login.*`       | טקסטי דף התחברות    | Login page texts       | ✅    |
| `signup.*`      | טקסטי דף הרשמה      | Signup page texts      | ✅    |
| `profile.*`     | טקסטי דף פרופיל     | Profile page texts     | ✅    |
| `notFound.*`    | טקסטי דף 404        | 404 page texts         | ✅    |
| `signOut.error` | הודעת שגיאת התנתקות | Sign out error message | ✅    |

---

## 8. דפי Analytics ואודות - ✅ **הושלם**

### `about.json` - ✅ **הושלם**

| מפתח (Key)    | עברית             | אנגלית                  | סטטוס |
| :------------ | :---------------- | :---------------------- | :---- |
| `analytics.*` | דף ניתוח נתונים   | Analytics page          | ✅    |
| `page.*`      | כותרות דף אודות   | About page headers      | ✅    |
| `appInfo.*`   | מידע על האפליקציה | Application information | ✅    |
| `thanks.*`    | הודעות תודה       | Thank you messages      | ✅    |

---

## 9. קומפוננטים פנימיים - ✅ **הושלם**

### קומפוננטים נוספים שתורגמו:

- ✅ `UserInfoDisplay.tsx` - תצוגת פרטי משתמש (auth namespace)
- ✅ `AuthContext.tsx` - הודעות שגיאה (common + auth namespaces)

### קבצי עזר ייעודיים:

- ✅ `src/types/transactionLabels.ts` - הוחלף בתרגומים דינמיים
- ✅ `src/types/recurringTransactionLabels.ts` - הוחלף בתרגומים דינמיים

---

## סיכום מלא - Namespaces

| Namespace      | תיאור                   | קבצים             | סטטוס | טעינה |
| :------------- | :---------------------- | :---------------- | :---- | :----- |
| `common`       | טקסטים כלליים           | common.json       | ✅    | bundled |
| `navigation`   | תפריט ניווט             | navigation.json   | ✅    | bundled |
| `dashboard`    | דף הבית וסטטיסטיקות     | dashboard.json    | ✅    | bundled |
| `transactions` | טפסי תנועות             | transactions.json | ✅    | bundled |
| `auth`         | התחברות ופרופיל         | auth.json         | ✅    | bundled |
| `contact`      | טופס יצירת קשר          | contact.json      | ✅    | bundled |
| `currency-features` | תכונות מטבע        | currency-features.json | ✅ | bundled |
| `import`       | ייבוא תנועות מגיליון    | import.json       | ✅    | **bundled** (נתיב ראשי) |
| `data-tables`  | טבלאות ונתונים          | data-tables.json  | ✅    | lazy |
| `settings`     | דף הגדרות               | settings.json     | ✅    | lazy |
| `about`        | דפי אודות וניתוח נתונים | about.json        | ✅    | lazy |
| `halacha-*`    | דף הלכות (6 קבצים)      | halacha-\*.json   | ✅    | lazy |

**הערה**: Namespaces המסומנים **bundled** נטענים מיידית עם האפליקציה (מוגדרים ב-`src/lib/i18n.ts`). שאר הnamespaces נטענים lazily על ידי HTTP backend בעת הצורך.

**🎉 המערכת מוכנה לחלוטין עם תמיכה דו-לשונית מלאה! 🎉**
