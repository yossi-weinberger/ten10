# סקירה טכנית מפורטת: טבלת התנועות (Transactions Table)

## 1. מבוא

טבלת התנועות היא רכיב מרכזי באפליקציית Ten10, המאפשר למשתמשים לצפות, לנהל ולנתח את כל התנועות הפיננסיות שלהם. היא מציגה נתונים בצורה ברורה ומאורגנת, ומספקת כלים לסינון, מיון, עריכה, מחיקה וייצוא של תנועות. הטבלה תומכת בפלטפורמות Web (באמצעות Supabase) ו-Desktop (באמצעות SQLite), כאשר הלוגיקה המרכזית של התצוגה והאינטראקציה משותפת, והגישה לנתונים מותאמת לפלטפורמה הספציפית.

## 2. רכיבים מרכזיים ופונקציונליות

הפונקציונליות של טבלת התנועות ממומשת באמצעות מספר רכיבי React, הפועלים יחדיו ליצירת חווית משתמש קוהרנטית.

### 2.1. `src/pages/TransactionsTable.tsx`

זהו רכיב העמוד הראשי המארח את טבלת התנועות. אחריותו העיקרית היא:

- **זיהוי פלטפורמה:** שימוש ב-Hook `usePlatform` מהקונטקסט `PlatformContext` כדי לקבוע את סביבת הריצה הנוכחית (web/desktop/loading).
- **מצב טעינה ראשוני:** הצגת הודעת "טוען נתוני פלטפורמה..." בזמן שהפלטפורמה מזוהה (כאשר `platform === "loading"`).
- **מבנה העמוד:** עיטוף רכיב התצוגה המרכזי (`TransactionsTableDisplay`) והצגת כותרת ראשית לעמוד ("טבלת תנועות").

### 2.2. `src/components/TransactionsTable/TransactionsTableDisplay.tsx`

זהו רכיב הליבה של הטבלה, המנהל את רוב הלוגיקה הקשורה לתצוגת הנתונים ולאינטראקציה איתם.

- **טעינת נתונים:**
  - **שליפה ראשונית:** מבצע שליפה ראשונית של נתונים באמצעות הפעולה `fetchTransactions` מה-store הגלובלי `useTableTransactionsStore`. שליפה זו מתבצעת כאשר הרכיב נטען והפלטפורמה זוהתה (`platform !== "loading"`).
  - **שליפה חוזרת:** שליפה מחדש של נתונים מתבצעת גם כאשר הגדרות המיון (`sorting` מה-store) משתנות, או כאשר הפילטרים המוגדרים ב-store משתנים. לוגיקה זו ממומשת באמצעות `useEffect` המקשיב לשינויים אלו.
- **טיפול במצבי טעינה ושגיאות:**
  - **שלדי טעינה (Skeletons):** מציג אנימציית טעינה באמצעות רכיב `Skeleton` כאשר הנתונים נמצאים בתהליך טעינה (`loading === true`) ואין עדיין תנועות להצגה (`transactions.length === 0`).
  - **הודעת שגיאה:** מציג הודעת שגיאה למשתמש (השגיאה נלקחת מהשדה `error` ב-store) אם הפעולה `fetchTransactions` נכשלת.
  - **אין נתונים:** מציג הודעה "לא נמצאו תנועות" אם הטעינה הסתיימה ללא שגיאות אך לא נמצאו תנועות התואמות את הקריטריונים.
- **טעינת נתונים נוספים (Pagination - "Load More"):**
  - כאשר המשתמש מגיע לסוף הרשימה המוצגת וקיימים עוד נתונים לטעינה (לפי `pagination.hasMore` מה-store), לחיצה על כפתור "טען עוד" (הנמצא ברכיב `TransactionsTableFooter`) מפעילה את הפעולה `setLoadMorePagination` מה-store (כדי לעדכן את מספר העמוד הנוכחי). לאחר מכן, היא קוראת ל-`fetchTransactions(false, platform)` כדי לשלוף את העמוד הבא של הנתונים, מבלי לאפס את הנתונים שכבר נטענו.
- **מיון (Sorting):**
  - משתמש ברכיב `TransactionsTableHeader` להצגת כותרות העמודות.
  - מאפשר לחיצה על כותרות עמודות הניתנות למיון (כפי שמוגדר במערך `sortableColumns`). לחיצה כזו מפעילה את הפונקציה `handleSort`, אשר בתורה קוראת לפעולה `setSorting` מה-store עם שם השדה הנבחר.
- **פעולות על שורת תנועה:**
  - **עריכה:** לחיצה על כפתור "עריכה" בשורת תנועה ספציפית מפעילה את הפונקציה `handleEditInitiate`. פונקציה זו מעדכנת את המצב המקומי `editingTransaction` עם פרטי התנועה שנבחרה ופותחת את המודל `TransactionEditModal` לעריכת הפרטים.
  - **מחיקה:** לחיצה על כפתור "מחיקה" מפעילה את `handleDeleteInitiate`. פונקציה זו שומרת את התנועה המיועדת למחיקה במשתנה מצב מקומי (`transactionToDelete`) ופותחת דיאלוג אישור (`AlertDialog`). לאחר אישור המשתמש, הפונקציה `handleDeleteConfirm` קוראת לפעולה `deleteTransaction` מה-store, יחד עם מזהה התנועה והפלטפורמה הנוכחית. הודעות על הצלחה או שגיאה במחיקה מוצגות באמצעות `toast`.
- **רכיבי משנה עיקריים:**
  - `TransactionsFilters`: ממשק משתמש לסינון הנתונים המוצגים.
  - `ExportButton`: כפתור לייצוא הנתונים לפורמטים שונים.
  - `Table`, `TableBody`, `TableRow`, `TableCell`: רכיבי בסיס של הטבלה מבית `shadcn/ui`.
  - `TransactionsTableHeader`: רכיב האחראי על הצגת כותרות הטבלה וניהול לוגיקת המיון.
  - `TransactionRow`: רכיב האחראי על הצגת שורת תנועה בודדת בטבלה.
  - `TransactionsTableFooter`: רכיב המציג את כפתור "טען עוד" ומידע על כמות הנתונים המוצגת.

### 2.3. `src/components/TransactionsTable/TransactionsFilters.tsx`

רכיב זה מאפשר למשתמש לסנן את התנועות המוצגות בטבלה לפי קריטריונים שונים.

- **שדות סינון זמינים:**
  - **חיפוש טקסט חופשי:** שדה קלט `Input` המאפשר חיפוש בתיאור התנועה, בקטגוריה או בנמען/משלם.
  - **טווח תאריכים:** שימוש ברכיב `DatePickerWithRange` לבחירת תאריך התחלה ותאריך סיום לסינון.
  - **סוגי תנועות:** בחירה מרובה של סוגי תנועות מתוך רשימה נפתחת (`DropdownMenu`) המכילה פריטי `DropdownMenuCheckboxItem`. רשימת הסוגים האפשריים (`availableTransactionTypes`) והתרגומים שלהם (`transactionTypeTranslations`) מוגדרים ישירות ברכיב.
- **ניהול מצב הסינון (מקומי וגלובלי):**
  - הרכיב משתמש ב-`useState` מקומי עבור ערכי הקלט (לדוגמה, `localSearch`, `localDateRange`, `localTypes`). זאת, כדי לספק חווית משתמש רספונסיבית ולמנוע עדכונים תכופים מדי ל-store הגלובלי.
  - ערך החיפוש החופשי מסונכרן ל-store הגלובלי (`setStoreFilters({ search: localSearch })`) באמצעות `setTimeout` של 500 מילישניות, כדי למנוע שליפות נתונים מרובות בזמן שהמשתמש מקליד.
  - שינויים בטווח התאריכים ובבחירת סוגי התנועות מעדכנים ישירות את ה-store הגלובלי (`setStoreFilters`).
- **איפוס סינונים:**
  - כפתור "אפס סינונים" מאפס את המצב המקומי של שדות הסינון לערכים ההתחלתיים שלהם (המוגדרים ב-`initialTableTransactionFilters`). בנוסף, הוא קורא לפעולה `resetStoreFiltersState` מה-store (המאפסת את אובייקט הפילטרים ב-store), ומפעיל שליפה מחדש של הנתונים (אם הפלטפורמה אינה בטעינה).
- **שליפה אוטומטית של נתונים:**
  - שינוי ב-`storeFilters` (שנגרם כתוצאה משינוי באחד הפילטרים על ידי המשתמש) גורר שליפה מחדש של הנתונים. הלוגיקה לשליפה זו נמצאת ברכיב `TransactionsTableDisplay.tsx`, בתוך `useEffect` המקשיב לשינויים ב-`storeFilters` וב-`platform`.

### 2.4. `src/components/TransactionsTable/TransactionsTableHeader.tsx`

רכיב זה אחראי על הצגת כותרות העמודות בטבלה ועל מימוש לוגיקת המיון האינטראקטיבית.

- **קלט (Props):** מקבל את הגדרות המיון הנוכחיות (`sorting: TableSortConfig`), פונקציה לעדכון המיון (`handleSort`), ורשימה של עמודות הניתנות למיון (`sortableColumns`).
- **אינטראקטיביות:** כל כותרת עמודה הניתנת למיון היא לחיצה. לחיצה על כותרת קוראת לפונקציה `handleSort` עם שם השדה של העמודה הרלוונטית.
- **חיווי מיון:** מציג אייקונים של חץ (למעלה, למטה, או לשני הכיוונים – באמצעות הרכיבים `ArrowUp`, `ArrowDown`, `ChevronsUpDown` מ-`lucide-react`) ליד כל עמודה הניתנת למיון. האייקון משתנה בהתאם למצב המיון הנוכחי (האם השדה ממוין כעת, ובאיזה כיוון – עולה או יורד).

### 2.5. `src/components/TransactionsTable/TransactionRow.tsx`

רכיב זה אחראי על הצגת שורת תנועה בודדת בטבלת התנועות.

- **קלט (Props):** מקבל אובייקט `transaction` המייצג תנועה בודדת, ואת הפונקציות `onEdit` ו-`onDelete` כפרמטרים.
- **עיצוב נתונים להצגה:**
  - **תאריך:** מפורמט לתצוגה של "dd/MM/yyyy" (ספציפית ללוקליזציה `he-IL`).
  - **סכום:** מפורמט כמספר עם שתי ספרות אחרי הנקודה העשרונית.
  - **סוג תנועה:** מציג רכיב `Badge` צבעוני, המכיל את התווית המתורגמת של סוג התנועה (התוויות נלקחות מהאובייקט `transactionTypeLabels`). צבע הרקע של ה-`Badge` נקבע על ידי הגדרות הצבע באובייקט `typeBadgeColors` ומוחל באמצעות הפונקציה `cn` (classnames).
  - **ערכים בוליאניים:** שדות כמו `is_chomesh` ו-`is_recurring` מפורמטים להצגה כ-"כן" או "לא" באמצעות הפונקציה `formatBoolean`.
  - **שדות טקסטואליים:** שדות כמו תיאור, קטגוריה, ונמען/משלם מוצגים כפי שהם. אם השדה ריק, מוצג "-".
- **תפריט פעולות:** מציג תפריט נפתח (`DropdownMenu`) המופעל על ידי אייקון שלוש נקודות (`MoreHorizontal`). התפריט מכיל אפשרויות "עריכה" (עם אייקון `Edit3`) ו"מחיקה" (עם אייקון `Trash2` וצבע אדום להדגשה).

### 2.6. `src/components/TransactionsTable/TransactionEditModal.tsx`

מודל קופץ המאפשר למשתמש לערוך את פרטי תנועה קיימת.

- **ניהול טופס וולידציה:**
  - משתמש בספריית `react-hook-form` לניהול מצב הטופס.
  - משתמש ב-`zodResolver` לביצוע ולידציה של הקלט מול סכימה מוגדרת (`transactionUpdateSchema`). סכימה זו מבוססת על `transactionBaseSchema` אך מאפשרת עדכון חלקי של הנתונים ואינה דורשת למלא שדות שרת כמו `created_at` (שכן אלו נקבעים על ידי השרת).
- **אכלוס ראשוני של הטופס:**
  - כאשר המודל נפתח עם תנועה ספציפית (המועברת דרך ה-prop `transaction`), שדות הטופס מאוכלסים בערכי התנועה הקיימים. שדה התאריך מומר לפורמט `yyyy-MM-dd` הנדרש על ידי שדה קלט מסוג `date`.
  - אם לא מועברת תנועה (מצב שלא אמור לקרות בשימוש הנוכחי), הטופס מאותחל עם ערכים ריקים או ערכי ברירת מחדל.
- **שדות הטופס:**
  - כולל שדות קלט עבור: תאריך, תיאור, סכום, מטבע (רכיב `Select` עם `currencyOptions`), סוג תנועה (רכיב `Select` עם `TransactionTypeValues` והתוויות מ-`transactionTypeLabels`), קטגוריה, ונמען/משלם.
  - מכיל תיבות סימון (`Checkbox`) עבור "הפרשת חומש?" (`is_chomesh`) ו-"תנועה קבועה?" (`is_recurring`).
  - אם האפשרות "תנועה קבועה" מסומנת, מופיע שדה קלט נוסף עבור "יום בחודש לתנועה קבועה" (`recurring_day_of_month`).
- **לוגיקת שליחת הטופס (`onSubmit`):**
  - מוודאת שתנועה לעריכה אכן קיימת (`transaction.id`) ושהפלטפורמה אינה במצב טעינה.
  - בונה אובייקט `updatePayload` המכיל רק את השדות שהמשתמש יכול לשנות ואכן שינה. שדות בוליאניים נשלחים תמיד. שדות ריקים או `null` מטופלים בהתאם (למשל, אם `is_recurring` אינו מסומן, `recurring_day_of_month` מוגדר ל-`null`).
  - קוראת לפעולה `updateTransaction` מה-store הגלובלי, ומעבירה לה את מזהה התנועה, את `updatePayload` המכיל את השינויים, ואת הפלטפורמה הנוכחית.
  - בסיום מוצלח של פעולת העדכון, המודל נסגר. שגיאות פוטנציאליות נרשמות בקונסול.

### 2.7. `src/components/TransactionsTable/ExportButton.tsx`

רכיב זה מאפשר למשתמש לייצא את הנתונים המוצגים כעת בטבלה (לאחר החלת הסינונים הפעילים).

- **ממשק משתמש:** משתמש ברכיב `DropdownMenu` כדי להציע למשתמש שלושה פורמטים לייצוא: Excel (XLSX), PDF, ו-CSV.
- **לוגיקת ייצוא:**
  - בבחירת פורמט ייצוא, הרכיב קורא לפעולה `exportTransactions(format, platform)` מה-store הגלובלי. הפלטפורמה הנוכחית (`platform`) נלקחת מה-`PlatformContext`.
- **חיווי טעינה וטיפול בשגיאות:**
  - מציג חיווי טעינה ויזואלי (אייקון `Loader2` מסתובב והכיתוב "מייצא...") ושולט על מצב `disabled` של הכפתור ושל פריטי התפריט בזמן שתהליך הייצוא מתבצע (בהתבסס על הדגל `exportLoading` מה-store).
  - מציג הודעות `toast` של ספריית `sonner` (הודעת הצלחה או הודעת שגיאה) בסיום פעולת הייצוא. הצגת ההודעות מופעלת על ידי `useEffect` המקשיב לשינויים בדגלים `exportLoading` ו-`exportError` מה-store.

### 2.8. `src/components/TransactionsTable/TransactionsTableFooter.tsx`

רכיב זה אחראי על הצגת החלק התחתון של טבלת התנועות, כולל אפשרויות פגינציה ומידע על כמות הנתונים המוצגת.

- **כפתור "טען עוד":** מציג כפתור "טען עוד" כאשר קיימים עוד נתונים לטעינה (`pagination.hasMore` מה-store) והטעינה אינה מתבצעת כעת. לחיצה על הכפתור קוראת לפונקציה `handleLoadMore` שהועברה כ-prop מהרכיב האב (`TransactionsTableDisplay`).
- **מידע על כמות הנתונים:** מציג טקסט המציין כמה תנועות מוצגות כעת מתוך המספר הכולל של התנועות העונות על הקריטריונים (המידע נלקח מהשדות `transactionsLength` ו-`pagination.totalCount`).
- **חיווי טעינה:** מציג חיווי טעינה ("טוען עוד נתונים..." עם אייקון `Loader2` מסתובב) כאשר הדגל `loading` מה-store הוא `true` ויש כבר תנועות מוצגות (כלומר, זוהי טעינה של "עוד" נתונים ולא טעינה ראשונית של הטבלה).

## 3. ניהול מצב מרכזי (`src/lib/tableTransactions.store.ts`)

ה-store הגלובלי של Zustand, `useTableTransactionsStore`, מרכז את כל המצב (state) והלוגיקה העסקית הקשורה באופן ישיר לטבלת התנועות.

- **שדות עיקריים במצב (State Fields):**
  - `transactions: Transaction[]`: מערך התנועות הנוכחי שמוצג בטבלה.
  - `loading: boolean`: דגל המציין האם מתבצעת כעת טעינת נתונים מהשרת.
  - `error: string | null`: מחרוזת המכילה הודעת שגיאה במקרה של כשל בשליפת נתונים, או `null` אם אין שגיאה.
  - `pagination`: אובייקט המכיל את פרטי הפגינציה:
    - `page: number`: מספר העמוד הנוכחי.
    - `limit: number`: מספר הפריטים המוצגים בעמוד.
    - `hasMore: boolean`: דגל המציין האם יש עוד עמודים לטעון.
    - `totalCount: number`: המספר הכולל של התנועות העונות על הקריטריונים של הסינון הנוכחי.
  - `filters`: אובייקט המכיל את הגדרות הסינון הנוכחיות:
    - `search: string`: מחרוזת החיפוש החופשי.
    - `dateRange: { from: Date | null; to: Date | null }`: טווח התאריכים הנבחר.
    - `types: string[]`: מערך של סוגי תנועות שנבחרו לסינון.
  - `sorting`: אובייקט המכיל את הגדרות המיון הנוכחיות:
    - `field: SortableField`: השדה שלפיו מתבצע המיון.
    - `direction: "asc" | "desc"`: כיוון המיון (עולה או יורד).
  - `exportLoading: boolean`: דגל המציין האם מתבצע כעת תהליך ייצוא נתונים.
  - `exportError: string | null`: הודעת שגיאה במקרה של כשל בתהליך הייצוא.
- **פעולות מרכזיות (Actions):**
  - `fetchTransactions(reset: boolean, platform: Platform)`:
    - אחראית על שליפת התנועות מה-backend (באמצעות קריאה לפונקציה מתאימה ב-`transactionService`).
    - אם הפרמטר `reset` הוא `true` (לדוגמה, בטעינה ראשונה של הטבלה או לאחר שינוי פילטר/מיון), הפעולה מאפסת את הפגינציה וטוענת את העמוד הראשון של הנתונים.
    - אם `reset` הוא `false` (לדוגמה, כאשר המשתמש לוחץ על "טען עוד"), הפעולה טוענת את העמוד הבא של הנתונים.
    - מעדכנת את השדות `transactions` (מוסיפה נתונים חדשים או מחליפה את הקיימים), `loading`, `error`, ו-`pagination` בהתאם לתשובה שמתקבלת מהשירות.
  - `updateTransaction(transactionId: string, updates: Partial<Transaction>, platform: Platform)`:
    - אחראית על עדכון תנועה קיימת (באמצעות קריאה ל-`transactionService`).
    - לאחר קבלת אישור הצלחה מהשרת, הפעולה מעדכנת את התנועה הרלוונטית במערך `transactions` המקומי ב-store.
  - `deleteTransaction(transactionId: string, platform: Platform)`:
    - אחראית על מחיקת תנועה (באמצעות קריאה ל-`transactionService`).
    - לאחר קבלת אישור הצלחה מהשרת, הפעולה מסירה את התנועה ממערך `transactions` המקומי ב-store.
  - `exportTransactions(format: 'csv' | 'excel' | 'pdf', platform: Platform)`:
    - מפעילה את תהליך ייצוא הנתונים. הפעולה שולפת את כל הנתונים הרלוונטיים מהשרת (ללא פגינציה, אך תוך התחשבות בפילטרים ובמיון הנוכחיים – באמצעות קריאה ל-`transactionService.getAllTransactionsForExport`). לאחר מכן, היא משתמשת בספריות צד-לקוח (`exceljs`, `jspdf`, ופונקציה ייעודית ליצירת CSV) כדי ליצור ולהוריד את הקובץ בפורמט המבוקש.
    - מעדכנת את הדגלים `exportLoading` ו-`exportError` בהתאם להתקדמות התהליך ולשגיאות אפשריות.
  - `setFilters(newFilters: Partial<TableTransactionFilters>)`: מעדכנת את אובייקט הפילטרים ב-store.
  - `resetFiltersState()`: מאפסת את אובייקט הפילטרים ב-store לערכים ההתחלתיים המוגדרים ב-`initialTableTransactionFilters`.
  - `setSorting(field: SortableField)`: מעדכנת את הגדרות המיון. אם המיון מתבצע על אותו שדה, כיוון המיון מתהפך. אם נבחר שדה חדש, המיון מתבצע בסדר עולה לפי השדה החדש.
  - `setLoadMorePagination()`: מגדילה את מספר העמוד (`page`) באובייקט הפגינציה, לצורך טעינת הנתונים של העמוד הבא.
  - `clearStore()`: מאפסת את כל ה-state של ה-store לערכיו ההתחלתיים (שימושי, למשל, בעת התנתקות של משתמש מהמערכת).

## 4. אינטראקציה עם ה-Backend (באמצעות `src/lib/transactionService.ts`)

ה-store `tableTransactions.store.ts` אינו מתקשר ישירות עם ה-backend (בין אם זה Supabase או Tauri). הוא מבצע זאת דרך קובץ השירות `src/lib/transactionService.ts`, אשר מייצא את הקלאס `TableTransactionsService`. הקלאס מכיל מתודות סטטיות לביצוע הפעולות השונות מול ה-backend, בהתאם לפלטפורמה.

- **`TableTransactionsService.fetchTransactions(params: FetchTransactionsParams)`:**
  (הפרמטר `params` כולל את הפלטפורמה, הפילטרים, הפגינציה והמיון)

  - **עבור Web (Supabase):** פונקציה זו קוראת לפונקציית RPC (Remote Procedure Call) שהוגדרה ב-Supabase (לדוגמה, פונקציה בשם `get_paginated_transactions` או דומה לה). פונקציית ה-RPC ב-Supabase מקבלת את הפילטרים, הגדרות הפגינציה והמיון, ומחזירה את רשימת התנועות המתאימה ואת המספר הכולל של התנועות שעונות על הפילטרים.
  - **עבור Desktop (Tauri):** פונקציה זו קוראת לפקודת Rust דרך ממשק `invoke` של Tauri (לדוגמה, `invoke('get_filtered_transactions_handler', { args: { filters, pagination, sorting } })`). פקודת ה-Rust בצד השרת תבצע שאילתת SQL על קובץ ה-SQLite המקומי, תוך התחשבות בפילטרים, במיון, ובפגינציה. היא מחזירה את רשימת התנועות ואת הספירה הכוללת.

- **`TableTransactionsService.updateTransaction(transactionId: string, updates: Partial<Transaction>, platform: Platform, userId?: string)`:**

  - **עבור Web (Supabase):** מבצעת קריאת `supabase.from('transactions').update(updates).eq('id', transactionId).eq('user_id', userId)` (או קריאה דומה, תוך הבטחה שמשתמש יכול לעדכן רק את התנועות השייכות לו, באמצעות RLS או פונקציית RPC).
  - **עבור Desktop (Tauri):** קוראת לפקודת Rust (לדוגמה, `invoke('update_transaction_handler', { transactionId, updates })`) שתבצע פקודת `UPDATE` על טבלת `transactions` במסד הנתונים SQLite.

- **`TableTransactionsService.deleteTransaction(transactionId: string, platform: Platform, userId?: string)`:**

  - **עבור Web (Supabase):** מבצעת קריאת `supabase.from('transactions').delete().eq('id', transactionId).eq('user_id', userId)` (או קריאה דומה באמצעות פונקציית RPC כמו `delete_user_transaction`).
  - **עבור Desktop (Tauri):** קוראת לפקודת Rust (לדוגמה, `invoke('delete_transaction_handler', { transactionId })`) שתבצע פקודת `DELETE` ממסד הנתונים SQLite.

- **`TableTransactionsService.exportTransactions(filters: ExportTransactionsFilters, sorting: TableSortConfig, platform: Platform, userId?: string)`:**
  - פונקציה זו אחראית על ייצוא הנתונים.
  - **עבור Web (Supabase):** קוראת לפונקציית RPC (לדוגמה `export_user_transactions`) המקבלת את הפילטרים והמיון ומחזירה את כל הנתונים הרלוונטיים.
  - **עבור Desktop (Tauri):** קוראת לפקודת Rust (לדוגמה, `invoke('export_transactions_handler', { filters, sorting })`) אשר שולפת את כל הנתונים מה-SQLite בהתאם לפילטרים והמיון.
  - בשני המקרים, הנתונים המלאים (ללא פגינציה) נשלחים חזרה ל-frontend, שם הם מעובדים ומומרים לקובץ בפורמט המבוקש (CSV, Excel, PDF).

## 5. שאילתות מסד נתונים (Web - Supabase - דוגמה רעיונית)

עבור פלטפורמת ה-Web המשתמשת ב-Supabase, סביר להניח שהפונקציה `get_filtered_transactions` (או פונקציה בשם דומה) שמופעלת באמצעות RPC תבצע שאילתת SQL מורכבת. להלן המחשה סכמטית של האופן שבו שאילתה כזו עשויה להיראות (זהו קוד SQL רעיוני בלבד ואינו בהכרח המימוש המדויק):

```sql
-- Conceptual SQL for a Supabase RPC function: get_filtered_transactions
-- Parameters might include: p_user_id UUID, p_search_term TEXT,
-- p_start_date DATE, p_end_date DATE, p_types TEXT[],
-- p_sort_field TEXT, p_sort_direction TEXT, p_limit INT, p_offset INT

SELECT
    id, user_id, date, amount, currency, description, type, category,
    is_chomesh, is_recurring, recurring_day_of_month, recipient,
    created_at, updated_at,
    (SELECT COUNT(*) FROM public.transactions sub
     WHERE sub.user_id = p_user_id -- Ensure user matches
       AND (p_search_term IS NULL OR sub.description ILIKE '%' || p_search_term || '%' OR sub.category ILIKE '%' || p_search_term || '%' OR sub.recipient ILIKE '%' || p_search_term || '%')
       AND (p_start_date IS NULL OR sub.date >= p_start_date)
       AND (p_end_date IS NULL OR sub.date <= p_end_date)
       AND (p_types IS NULL OR sub.type = ANY(p_types)) -- Filter by array of types
    ) as total_count
FROM
    public.transactions main
WHERE
    main.user_id = p_user_id -- Ensure user matches
    AND (p_search_term IS NULL OR main.description ILIKE '%' || p_search_term || '%' OR main.category ILIKE '%' || p_search_term || '%' OR main.recipient ILIKE '%' || p_search_term || '%')
    AND (p_start_date IS NULL OR main.date >= p_start_date)
    AND (p_end_date IS NULL OR main.date <= p_end_date)
    AND (p_types IS NULL OR main.type = ANY(p_types)) -- Filter by array of types
ORDER BY
    -- Dynamic sorting based on p_sort_field and p_sort_direction
    -- Example (simplified, actual dynamic sorting in SQL can be more complex):
    -- CASE WHEN p_sort_field = 'date' AND p_sort_direction = 'asc' THEN date END ASC,
    -- CASE WHEN p_sort_field = 'date' AND p_sort_direction = 'desc' THEN date END DESC,
    -- Default sort if not specified or invalid:
    created_at DESC
LIMIT p_limit
OFFSET p_offset;
```

**הערה:** המימוש בפועל של שאילתת SQL דינמית, במיוחד בכל הקשור למיון דינמי והעברת מערכים כפרמטרים (כמו `p_types`), ידרוש תשומת לב לפרטי התחביר של PL/pgSQL (שפת הפונקציות של PostgreSQL) או שימוש בטכניקות מתאימות לבניית שאילתות בצד השרת.

## 6. הגדרת משיכת נתונים מ-SQLite (גרסת Desktop)

חלק זה מתאר את השלבים הנדרשים למימוש משיכת נתונים מ-SQLite עבור גרסת הדסקטופ, תוך התחשבות בסינון, מיון ופגינציה. הדוגמאות וההסברים כאן מתבססים גם על האופן שבו רכיבים אחרים בפרויקט, כמו `StatsCards.tsx` (דרך `useServerStats.ts` ו-`dataService.ts`), ניגשים לנתוני SQLite דרך פקודות Tauri.

### 6.1. עדכון קוד Rust (`src-tauri/src/main.rs`)

- **הגדרת מבני נתונים (Structs) עבור פרמטרים ותשובה:**
  יש להגדיר מבני נתונים ב-Rust שייצגו את הפילטרים, הפגינציה והמיון המגיעים מה-frontend, וכן מבנה נתונים עבור התשובה שתכלול את רשימת התנועות ואת הספירה הכוללת.

  ```rust
  // In src-tauri/src/main.rs
  // Ensure you have `serde::{Deserialize, Serialize}` derives for these structs

  #[derive(serde::Deserialize, Debug)]
  pub struct TableFiltersPayload {
      search: Option<String>,
      date_from: Option<String>, // ISO date string "YYYY-MM-DD"
      date_to: Option<String>,   // ISO date string "YYYY-MM-DD"
      types: Option<Vec<String>>,
  }

  #[derive(serde::Deserialize, Debug)]
  pub struct TablePaginationPayload {
      page: usize, // Current page number (1-indexed from frontend)
      limit: usize, // Items per page
  }

  #[derive(serde::Deserialize, Debug)]
  pub struct TableSortingPayload {
      field: String,     // Field to sort by (e.g., "date", "amount")
      direction: String, // "asc" or "desc"
  }

  #[derive(serde::Deserialize, Debug)]
  pub struct GetFilteredTransactionsArgs { // Payload for the Tauri command
      filters: TableFiltersPayload,
      pagination: TablePaginationPayload,
      sorting: TableSortingPayload,
  }

  #[derive(serde::Serialize, Debug)]
  pub struct PaginatedTransactionsResponse { // Response structure
      transactions: Vec<Transaction>, // Assuming your Transaction struct is defined and serializable
      total_count: i64,
  }
  ```

  (יש לוודא שמבנה הנתונים `Transaction` ב-Rust תואם לזה שב-TypeScript ושהוא ניתן לסריאליזציה עם `Serialize`).

- **יצירת פקודת Tauri חדשה (לדוגמה, `get_filtered_transactions_handler`):**
  פקודה זו תקבל את הפרמטר `args: GetFilteredTransactionsArgs`. היא אחראית על בניית שאילתת SQL דינמית עבור SQLite והרצתה. בניית SQL דינמי דורשת זהירות רבה למניעת SQL Injection. שימוש בפרמטרים מסומנים (`?`) של ספריית `rusqlite` הוא קריטי.

  ```rust
  use rusqlite::{params, Connection, Result, ToSql, OptionalExtension}; // Ensure imports

  // Assume Transaction struct is defined here with Serialize and potentially Deserialize
  // #[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
  // pub struct Transaction { ... }

  #[tauri::command]
  fn get_filtered_transactions_handler(
      db_state: tauri::State<'_, super::DbState>, // Assuming DbState is your DB connection state
      args: GetFilteredTransactionsArgs,
  ) -> std::result::Result<PaginatedTransactionsResponse, String> {
      let conn_guard = db_state.0.lock().map_err(|e| format!("DB lock error: {}", e))?;
      let conn = &*conn_guard;

      let mut base_query = "SELECT id, user_id, date, amount, currency, description, type, category, is_chomesh, is_recurring, recurring_day_of_month, recipient, created_at, updated_at FROM transactions".to_string();
      let mut count_query = "SELECT COUNT(*) FROM transactions".to_string();

      let mut where_clauses: Vec<String> = Vec::new();
      let mut sql_params: Vec<Box<dyn ToSql>> = Vec::new();

      // Build WHERE clauses and params based on args.filters
      if let Some(search_term) = &args.filters.search {
          if !search_term.is_empty() {
              where_clauses.push("(description LIKE ?1 OR category LIKE ?2 OR recipient LIKE ?3)".to_string());
              let pattern = format!("%{}%", search_term);
              sql_params.push(Box::new(pattern.clone())); // param 1
              sql_params.push(Box::new(pattern.clone())); // param 2
              sql_params.push(Box::new(pattern));         // param 3
          }
      }
      if let Some(date_from) = &args.filters.date_from {
          if !date_from.is_empty() {
              where_clauses.push(format!("date >= ?{}", sql_params.len() + 1));
              sql_params.push(Box::new(date_from.clone()));
          }
      }
      if let Some(date_to) = &args.filters.date_to {
          if !date_to.is_empty() {
              where_clauses.push(format!("date <= ?{}", sql_params.len() + 1));
              sql_params.push(Box::new(date_to.clone()));
          }
      }
      if let Some(types) = &args.filters.types {
          if !types.is_empty() {
              let placeholders: Vec<String> = types.iter().enumerate().map(|(i, _)| format!("?{}", sql_params.len() + 1 + i)).collect();
              where_clauses.push(format!("type IN ({})", placeholders.join(", ")));
              for t_type in types {
                  sql_params.push(Box::new(t_type.clone()));
              }
          }
      }

      let params_for_rusqlite: Vec<&dyn ToSql> = sql_params.iter().map(|p| p.as_ref()).collect();

      if !where_clauses.is_empty() {
          let where_str = format!(" WHERE {}", where_clauses.join(" AND "));
          base_query.push_str(&where_str);
          count_query.push_str(&where_str);
      }

      // Get total count
      let total_count: i64 = conn.query_row(
          &count_query,
          params_for_rusqlite.as_slice(),
          |row| row.get(0),
      ).map_err(|e| format!("Failed to count transactions: {}", e))?;

      // Apply sorting
      let sort_field = match args.sorting.field.as_str() {
          "date" => "date", "amount" => "amount", "description" => "description",
          "currency" => "currency", "type" => "type", "category" => "category",
          "recipient" => "recipient", _ => "created_at", // Default
      };
      let sort_direction = if args.sorting.direction.to_lowercase() == "asc" { "ASC" } else { "DESC" };
      base_query.push_str(&format!(" ORDER BY {} {}", sort_field, sort_direction));

      // Apply pagination
      let limit = args.pagination.limit;
      let offset = (args.pagination.page.saturating_sub(1)) * limit; // page is 1-indexed
      base_query.push_str(&format!(" LIMIT {} OFFSET {}", limit, offset));

      // Fetch transactions
      let mut stmt = conn.prepare(&base_query)
          .map_err(|e| format!("Failed to prepare statement: {}", e))?;

      let transactions_iter = stmt.query_map(
          params_for_rusqlite.as_slice(),
          |row| {
              // Map row to Transaction struct. Ensure field names and types match.
              // This mapping needs to be robust and handle Option types correctly.
              Ok(Transaction {
                  id: row.get("id")?,
                  user_id: row.get::<_, Option<String>>("user_id").optional()?.flatten(),
                  date: row.get("date")?,
                  amount: row.get("amount")?,
                  currency: row.get("currency")?,
                  description: row.get::<_, Option<String>>("description").optional()?.flatten(),
                  type_str: row.get("type")?, // Assuming 'type' in DB is TEXT
                  category: row.get::<_, Option<String>>("category").optional()?.flatten(),
                  is_chomesh: row.get::<_, Option<i64>>("is_chomesh").optional()?.flatten().map(|v| v != 0),
                  is_recurring: row.get::<_, Option<i64>>("is_recurring").optional()?.flatten().map(|v| v != 0),
                  recurring_day_of_month: row.get::<_, Option<i64>>("recurring_day_of_month").optional()?.flatten().map(|v| v as i32),
                  recipient: row.get::<_, Option<String>>("recipient").optional()?.flatten(),
                  created_at: row.get::<_, Option<String>>("created_at").optional()?.flatten(),
                  updated_at: row.get::<_, Option<String>>("updated_at").optional()?.flatten(),
              })
          },
      ).map_err(|e| format!("Failed to query transactions: {}", e))?;

      let mut transactions_vec = Vec::new();
      for transaction_result in transactions_iter {
          transactions_vec.push(transaction_result.map_err(|e| format!("Failed to map transaction row: {}", e))?);
      }

      Ok(PaginatedTransactionsResponse {
          transactions: transactions_vec,
          total_count,
      })
  }
  ```

  **הערות חשובות על קוד ה-Rust:**

  - **בטיחות SQL:** בניית שאילתות SQL דינמיות דורשת זהירות רבה. יש לוודא ששמות שדות המיון (`sort_field`) עוברים ולידציה ולא מוזרקים ישירות לשאילתה. עבור סעיפי `WHERE`, שימוש בסימן שאלה (`?`) והעברת הערכים דרך `params` (או `rusqlite::params!`) היא הדרך הנכונה והבטוחה.
  - **טיפול בשגיאות:** יש להחזיר `Result` ולטפל בשגיאות `rusqlite` בצורה נאותה, ולהמיר אותן למחרוזת שגיאה ברורה עבור ה-frontend.
  - **המרה למבנה `Transaction`:** יש לוודא שהמיפוי משורת ה-SQLite למבנה ה-`Transaction` ב-Rust (שצריך להיות מוגדר גם ב-Rust ותואם ל-TypeScript) מדויק. זה כולל טיפול בערכי `NULL` והמרת טיפוסים (למשל, `INTEGER` ב-SQLite ל-`bool` או `Option<i32>` ב-Rust).
  - **שדה `type`:** אם שדה `type` ב-DB הוא מסוג `TEXT` (כמו `income`, `expense`), ובמבנה `Transaction` ב-Rust (וב-TS) הוא Enum או טיפוס מחרוזתי מוגבל, יש לוודא שההמרות מתבצעות כראוי. בקוד הדוגמה, השדה נקרא `type_str` כדי למנוע התנגשות עם מילת המפתח `type` ב-Rust, אם `Transaction` Struct יכלול שדה בשם `type`.

- **רישום הפקודה:** יש להוסיף את הפקודה החדשה לרשימת הפקודות ב-`main.rs` בתוך `tauri::generate_handler![...]`. לדוגמה: ` .invoke_handler(tauri::generate_handler![..., get_filtered_transactions_handler])`

### 6.2. עדכון `src/lib/transactionService.ts` (או קובץ שירות דומה ב-Frontend)

- יש ליצור פונקציה חדשה, לדוגמה `getTransactionsFromDesktopService`, שתקבל את אובייקטי הפילטרים, הפגינציה והמיון מה-store. **חשוב: פונקציה זו (והפקודה ב-Rust שהיא קוראת לה) אינה צריכה לקבל `userId` עבור פלטפורמת הדסקטופ, שכן ההקשר הוא מקומי למשתמש.**
- פונקציה זו תקרא ל-`invoke('get_filtered_transactions_handler', { args: { filters, pagination, sorting } })`, כאשר `args` הוא האובייקט המכיל את כל הפרמטרים הנדרשים על ידי פקודת ה-Rust.
- הפונקציה תחזיר את התשובה שמתקבלת מה-Rust (`PaginatedTransactionsResponse`).

  ```typescript
  // In a service file like src/lib/transactionService.ts
  import { invoke } from "@tauri-apps/api/tauri";
  import type { Transaction } from "@/types/transaction"; // Assuming Transaction type definition
  import type {
    TableFiltersState,
    TablePaginationState,
    TableSortConfig,
  } from "@/lib/tableTransactions.store"; // Adjust paths as necessary

  // Define the expected Rust response structure in TypeScript
  interface PaginatedTransactionsResponseFromRust {
    transactions: Transaction[];
    total_count: number; // Rust's i64 might be serialized as number or string depending on setup
  }

  // Define the payload structure for the Tauri command, matching Rust's GetFilteredTransactionsArgs
  // Note: No userId is included in this payload for desktop operations.
  interface GetFilteredTransactionsArgsPayload {
    filters: {
      search: string | null;
      date_from: string | null; // "YYYY-MM-DD"
      date_to: string | null; // "YYYY-MM-DD"
      types: string[] | null;
    };
    pagination: {
      page: number; // Current page number (1-indexed)
      limit: number; // Items per page
    };
    sorting: {
      field: string;
      direction: string; // "asc" or "desc"
    };
  }

  export async function getTransactionsFromDesktopService(
    filters: TableFiltersState,
    pagination: TablePaginationState,
    sorting: TableSortConfig
    // No userId parameter needed here for desktop
  ): Promise<PaginatedTransactionsResponseFromRust> {
    const payload: GetFilteredTransactionsArgsPayload = {
      filters: {
        search: filters.search || null,
        date_from: filters.dateRange.from
          ? new Date(filters.dateRange.from).toISOString().split("T")[0]
          : null,
        date_to: filters.dateRange.to
          ? new Date(filters.dateRange.to).toISOString().split("T")[0]
          : null,
        types: filters.types.length > 0 ? filters.types : null,
      },
      pagination: {
        page: pagination.page, // Send current page from store
        limit: pagination.limit, // Send current limit from store
      },
      sorting: {
        field: sorting.field,
        direction: sorting.direction,
      },
    };

    try {
      console.log(
        "Invoking get_filtered_transactions_handler with payload:",
        JSON.stringify(payload)
      );
      // The command name must match exactly what's registered in Rust.
      // The second argument to invoke is an object where keys are argument names in Rust.
      const response = await invoke<PaginatedTransactionsResponseFromRust>(
        "get_filtered_transactions_handler",
        { args: payload } // Pass the payload nested under 'args'
      );
      console.log(
        "Response from desktop (getTransactionsFromDesktopService):",
        response
      );
      return {
        ...response,
        total_count: Number(response.total_count), // Ensure total_count is a number
      };
    } catch (error) {
      console.error("Error fetching transactions from desktop service:", error);
      throw new Error(
        `Failed to fetch transactions from desktop: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
  ```

### 6.3. עדכון `src/lib/tableTransactions.store.ts`

- בתוך הפעולה `fetchTransactions`, כאשר `platform === 'desktop'`, הפעולה תקרא לפונקציה החדשה `getTransactionsFromDesktopService`.
- היא תעביר את `state.filters`, `state.pagination` (או את החלקים הרלוונטיים ממנו כמו `page` ו-`limit`), ו-`state.sorting` לפונקציה זו. **אין צורך להעביר `userId` לפונקציית השירות של הדסקטופ.**
- לאחר קבלת התשובה מה-Rust, היא תעדכן את המצב של ה-store (`transactions`, `pagination.totalCount`, `pagination.hasMore`).

  ```typescript
  // Inside fetchTransactions action in tableTransactions.store.ts
  // ...
  if (platform === "desktop") {
    const { filters, pagination, sorting } = get(); // Get current state from store
    // No need to get or pass userId for desktop platform
    const currentPageToFetch = reset ? 1 : pagination.page; // Determine page to fetch

    try {
      set({ loading: true, error: null }); // Set loading state

      // Call the new service function for desktop (does not require userId)
      const desktopResponse = await getTransactionsFromDesktopService(
        filters,
        { ...pagination, page: currentPageToFetch }, // Pass relevant pagination info for the request
        sorting
      );

      // Determine new transactions array based on whether it's a reset or load more
      const newTransactions = reset
        ? desktopResponse.transactions
        : [...get().transactions, ...desktopResponse.transactions]; // Append if not reset

      // Update store state with fetched data
      set({
        transactions: newTransactions,
        pagination: {
          ...pagination, // Keep existing limit
          page: currentPageToFetch, // Update current page
          totalCount: desktopResponse.total_count, // Update total count
          hasMore: newTransactions.length < desktopResponse.total_count, // Determine if there's more
        },
        loading: false, // Reset loading state
        error: null, // Clear any previous error
      });
    } catch (err: any) {
      console.error("Error in fetchTransactions (desktop platform):", err);
      set({
        loading: false,
        error: err.message || "Failed to fetch desktop transactions",
      });
    }
  } else if (platform === "web") {
    // ... existing web logic using its own service call ...
  }
  // ...
  ```

תהליך זה מכסה את השינויים העיקריים הנדרשים. החלק המורכב והקריטי ביותר הוא המימוש הנכון והבטוח של פקודת ה-Rust, ובמיוחד בניית שאילתות ה-SQL הדינמיות בצורה מאובטחת ויעילה. חשוב לבדוק היטב את כל מקרי הקצה של הפילטרים והמיון, ולוודא שהטיפול ב-`userId` (או היעדרו) עקבי בכל שכבות האפליקציה עבור כל פלטפורמה.

</rewritten_file>
