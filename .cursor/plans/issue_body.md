## תיאור

הוספת כפתור חדש "הוצאה מוכרת לחומש" ליד הכפתור הקיים "הוצאה מוכרת למעשר".

### מה צריך להוסיף:

- כפתור checkbox חדש `isRecognizedForChomesh` עבור הוצאות
- סוג טרנזקציה חדש: `chomesh-recognized-expense`
- ניכוי של **20%** מההוצאה מיתרת המעשר (במקום 10% של הוצאה מוכרת רגילה)
- שני הכפתורים (מוכרת למעשר ומוכרת לחומש) הם **mutually exclusive** - רק אחד יכול להיות מסומן

### קבצים לעדכון:

- TypeScript types (`transaction.ts`, `transactionLabels.ts`)
- Zod schema עם ולידציה
- UI components (`TransactionCheckboxes.tsx`, `TransactionTypeSelector.tsx`)
- Backend: Supabase migration + Rust code
- תרגומים (עברית + אנגלית)
- תיעוד

### תוכנית מפורטת:

ראה: `.cursor/plans/add_chomesh_expense_type.plan.md`

## Checklist

- [ ] הוספת סוג חדש ל-TypeScript types
- [ ] הוספת checkbox ל-schema עם ולידציה
- [ ] עדכון form service logic
- [ ] הוספת כפתור ב-UI עם mutual exclusion
- [ ] עדכון filters ו-category combobox
- [ ] הוספת תרגומים
- [ ] יצירת Supabase migration
- [ ] עדכון Rust backend
- [ ] עדכון תיעוד
