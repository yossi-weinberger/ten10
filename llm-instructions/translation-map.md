# מפת תרגומים (Translation Map)

מסמך זה מרכז את כל הטקסטים הסטטיים באפליקציה שדורשים תרגום, וממפה אותם לקבצי התרגום (namespaces) המתאימים.

## סטטוס כללי: `בתהליך`

---

## 1. ניווט ופריסה כללית (`common.json`)

אלו טקסטים שמופיעים במערכת הניווט הראשית ובפריסה הכללית של האפליקציה.

| מפתח (Key)         | עברית         | אנגלית           | סטטוס      |
| :----------------- | :------------ | :--------------- | :--------- |
| `nav.home`         | דשבורד        | Dashboard        | `לא תורגם` |
| `nav.transactions` | כל התנועות    | All Transactions | `לא תורגם` |
| `nav.recurring`    | תנועות קבועות | Recurring        | `לא תורגם` |
| `nav.analytics`    | ניתוח נתונים  | Analytics        | `לא תורגם` |
| `nav.halacha`      | הלכה          | Halacha          | `בוצע`     |
| `nav.settings`     | הגדרות        | Settings         | `לא תורגם` |
| `nav.about`        | אודות         | About            | `לא תורגם` |
| `nav.profile`      | פרופיל        | Profile          | `לא תורגם` |
| `nav.logout`       | התנתק         | Logout           | `לא תורגם` |
| `general.save`     | שמור          | Save             | `לא תורגם` |
| `general.cancel`   | ביטול         | Cancel           | `לא תורגם` |
| `general.edit`     | עריכה         | Edit             | `לא תורגם` |
| `general.delete`   | מחיקה         | Delete           | `לא תורגם` |

---

## 2. דשבורד (`dashboard.json`)

| מפתח (Key)        | עברית       | אנגלית          | סטטוס      |
| :---------------- | :---------- | :-------------- | :--------- |
| `stats.income`    | סך הכנסות   | Total Income    | `לא תורגם` |
| `stats.expenses`  | סך הוצאות   | Total Expenses  | `לא תורגם` |
| `stats.donations` | סך תרומות   | Total Donations | `לא תורגם` |
| `stats.required`  | הפרשה נדרשת | Required Tithe  | `לא תורגם` |
| `stats.magic`     | קסם פיננסי  | Financial Magic | `לא תורגם` |
| `chart.title`     | סיכום חודשי | Monthly Summary | `לא תורגם` |

---

## 3. טופס עסקה (`transaction-form.json`)

| מפתח (Key)      | עברית           | אנגלית                 | סטטוס      |
| :-------------- | :-------------- | :--------------------- | :--------- |
| `title.add`     | הוספת עסקה חדשה | Add New Transaction    | `לא תורגם` |
| `title.edit`    | עריכת עסקה      | Edit Transaction       | `לא תורגם` |
| `type`          | סוג עסקה        | Transaction Type       | `לא תורגם` |
| `type.income`   | הכנסה           | Income                 | `לא תורגם` |
| `type.expense`  | הוצאה           | Expense                | `לא תורגם` |
| `type.donation` | תרומה           | Donation               | `לא תורגם` |
| `amount`        | סכום            | Amount                 | `לא תורגם` |
| `currency`      | מטבע            | Currency               | `לא תורגם` |
| `date`          | תאריך           | Date                   | `לא תורגם` |
| `description`   | תיאור           | Description            | `לא תורגם` |
| `category`      | קטגוריה         | Category               | `לא תורגם` |
| `isRecurring`   | עסקה קבועה?     | Recurring Transaction? | `לא תורגם` |
| `isTithe`       | נחשב למעשר?     | Count for Tithe?       | `לא תורגם` |
| `isCredit`      | עסקת אשראי?     | Credit Transaction?    | `לא תורגם` |

---

## 4. דף הגדרות (`settings.json`)

| מפתח (Key)                | עברית                                       | אנגלית                                                 | סטטוס      |
| :------------------------ | :------------------------------------------ | :----------------------------------------------------- | :--------- |
| `title`                   | הגדרות                                      | Settings                                               | `לא תורגם` |
| `langDisplay.title`       | שפה ותצוגה                                  | Language and Display                                   | `בוצע`     |
| `langDisplay.description` | הגדרות שפה ותצוגה כלליות                    | General language and display settings                  | `בוצע`     |
| `langDisplay.language`    | שפה                                         | Language                                               | `בוצע`     |
| `langDisplay.theme`       | ערכת נושא                                   | Theme                                                  | `בוצע`     |
| `financial.title`         | הגדרות כספים                                | Financial Settings                                     | `לא תורגם` |
| `financial.description`   | הגדרות הקשורות לכספים ומטבעות               | Settings related to finances and currencies            | `לא תורגם` |
| `financial.mainCurrency`  | מטבע ראשי                                   | Main Currency                                          | `לא תורגם` |
| `data.title`              | ניהול נתונים                                | Data Management                                        | `לא תורגם` |
| `data.import`             | ייבוא נתונים                                | Import Data                                            | `לא תורגם` |
| `data.export`             | ייצוא נתונים                                | Export Data                                            | `לא תורגם` |
| `data.clear`              | מחיקת כל הנתונים                            | Clear All Data                                         | `לא תורגם` |
| `data.clear.warning`      | אזהרה: פעולה זו תמחק את כל הנתונים לצמיתות. | Warning: This action will permanently delete all data. | `לא תורגם` |

---

## 5. טבלאות נתונים (`data-tables.json`)

| מפתח (Key)           | עברית            | אנגלית                   | סטטוס      |
| :------------------- | :--------------- | :----------------------- | :--------- |
| `column.type`        | סוג              | Type                     | `לא תורגם` |
| `column.description` | תיאור            | Description              | `לא תורגם` |
| `column.category`    | קטגוריה          | Category                 | `לא תורגם` |
| `column.date`        | תאריך            | Date                     | `לא תורגם` |
| `column.amount`      | סכום             | Amount                   | `לא תורגם` |
| `column.actions`     | פעולות           | Actions                  | `לא תורגם` |
| `filter.placeholder` | סנן לפי תיאור... | Filter by description... | `לא תורגם` |
| `export.csv`         | ייצוא ל-CSV      | Export to CSV            | `לא תורגם` |
| `export.excel`       | ייצוא ל-Excel    | Export to Excel          | `לא תורגם` |
| `export.pdf`         | ייצוא ל-PDF      | Export to PDF            | `לא תורגם` |

---

המסמך מוכן לשימוש. נוכל להשתמש בו כמפת דרכים לתרגום מלא של האפליקציה.
