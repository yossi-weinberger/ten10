# זרימת נתונים סטטיסטיים מחושבי שרת (S) והסרת חישובי קליינט ישנים (C)

## מבוא

מסמך זה מתאר את תהליך שליפת הנתונים הסטטיסטיים המרכזיים באפליקציה (סך הכנסות, הוצאות, תרומות ויתרת מעשר כללית) באמצעות חישובים המתבצעים בצד השרת (S). בנוסף, המסמך מפרט קבצים וקטעי קוד הקשורים לחישובים שהתבצעו בעבר בצד הלקוח (C), אשר ניתן להסירם כעת או בעתיד, כחלק מהמעבר המלא לחישובי שרת.

המעבר לחישובי שרת נועד לשפר את עקביות הנתונים, להפחית את העומס על הקליינט ולהבטיח מקור אמת יחיד לחישובים אלו.

## חלק 1: זרימת מידע מחושב שרת (S)

להלן תיאור הזרימה עבור כל אחד מהמדדים הסטטיסטיים:

### 1. סך הכנסות (כולל חישוב חומש)

- **מסד נתונים (Supabase/PostgreSQL - Web):**
  - **פונקציית SQL:** `get_total_income_and_chomesh_for_user(p_user_id UUID, p_start_date TEXT, p_end_date TEXT)`
  - **תיאור:** מחשבת את סך ההכנסות הכולל ואת סכום ההכנסות עליהן חל חיוב חומש (20%) עבור משתמש נתון וטווח תאריכים.
- **קוד צד שרת (Tauri/Rust - Desktop):**
  - **פקודת Rust:** `get_desktop_total_income_in_range(db_state: State<'_, DbState>, start_date: String, end_date: String)`
  - **מיקום:** `src-tauri/src/commands/income_commands.rs`
  - **תיאור:** מבצעת שאילתת SQL מוטמעת על מסד הנתונים המקומי (SQLite) כדי לחשב סך הכנסות וחומש בטווח תאריכים.
- **שירות נתונים (`src/lib/dataService.ts`):**
  - **פונקציה ראשית:** `fetchTotalIncomeInRange(userId: string | null, startDate: string, endDate: string): Promise<ServerIncomeData | null>`
  - **פונקציות עזר:**
    - `fetchTotalIncomeForUserWeb(userId: string, startDate: string, endDate: string)`: קוראת לפונקציית ה-RPC ב-Supabase.
    - `fetchTotalIncomeForUserDesktop(startDate: string, endDate: string)`: קוראת לפקודת ה-Tauri.
- **ניהול מצב (Zustand - `src/lib/store.ts`):**
  - **משתני מצב:**
    - `serverCalculatedTotalIncome: number | null`
    - `serverCalculatedChomeshAmount: number | null`
  - **פעולות עדכון:**
    - `setServerCalculatedTotalIncome(totalIncome: number | null)`
    - `setServerCalculatedChomeshAmount(chomeshAmount: number | null)`
- **ממשק משתמש (UI - `src/components/dashboard/StatsCards.tsx`):**
  - `useEffect` קורא ל-`fetchTotalIncomeInRange` בעת שינוי טווח התאריכים או פרטי המשתמש/פלטפורמה.
  - משתני `useState` (`isLoadingServerIncome`, `serverIncomeError`) מנהלים את מצב הטעינה והשגיאות.
  - הנתונים (`serverTotalIncome`, `serverChomeshAmount`) מה-store מוצגים בכרטיסייה המתאימה עם סימון (S).

### 2. סך הוצאות

- **מסד נתונים (Supabase/PostgreSQL - Web):**
  - **פונקציית SQL:** `get_total_expenses_for_user(p_user_id UUID, p_start_date TEXT, p_end_date TEXT)`
  - **תיאור:** מסכמת טרנזקציות מסוג `expense` או `recognized-expense` עבור משתמש וטווח תאריכים.
- **קוד צד שרת (Tauri/Rust - Desktop):**
  - **פקודת Rust:** `get_desktop_total_expenses_in_range(db_state: State<'_, DbState>, start_date: String, end_date: String)`
  - **מיקום:** `src-tauri/src/commands/expense_commands.rs`
  - **תיאור:** מבצעת שאילתת SQL מוטמעת על SQLite לסכימת הוצאות (`expense`, `recognized-expense`) בטווח תאריכים.
- **שירות נתונים (`src/lib/dataService.ts`):**
  - **פונקציה ראשית:** `fetchTotalExpensesInRange(userId: string | null, startDate: string, endDate: string): Promise<number | null>`
  - **פונקציות עזר:**
    - `fetchTotalExpensesForUserWeb(userId: string, startDate: string, endDate: string)`: קוראת ל-RPC ב-Supabase.
    - `fetchTotalExpensesForUserDesktop(startDate: string, endDate: string)`: קוראת לפקודת ה-Tauri.
- **ניהול מצב (Zustand - `src/lib/store.ts`):**
  - **משתנה מצב:** `serverCalculatedTotalExpenses: number | null`
  - **פעולת עדכון:** `setServerCalculatedTotalExpenses(totalExpenses: number | null)`
- **ממשק משתמש (UI - `src/components/dashboard/StatsCards.tsx`):**
  - `useEffect` קורא ל-`fetchTotalExpensesInRange`.
  - משתני `useState` (`isLoadingServerExpenses`, `serverExpensesError`) מנהלים טעינה ושגיאות.
  - הנתון (`serverTotalExpenses`) מה-store מוצג בכרטיסייה עם סימון (S).

### 3. סך תרומות

- **מסד נתונים (Supabase/PostgreSQL - Web):**
  - **פונקציית SQL:** `get_total_donations_for_user(p_user_id UUID, p_start_date TEXT, p_end_date TEXT)`
  - **תיאור:** מסכמת טרנזקציות מסוג `donation` עבור משתמש וטווח תאריכים.
- **קוד צד שרת (Tauri/Rust - Desktop):**
  - **פקודת Rust:** `get_desktop_total_donations_in_range(db_state: State<'_, DbState>, start_date: String, end_date: String)`
  - **מיקום:** `src-tauri/src/commands/donation_commands.rs`
  - **תיאור:** מבצעת שאילתת SQL מוטמעת על SQLite לסכימת תרומות (`donation`) בטווח תאריכים.
- **שירות נתונים (`src/lib/dataService.ts`):**
  - **פונקציה ראשית:** `fetchTotalDonationsInRange(userId: string | null, startDate: string, endDate: string): Promise<number | null>`
  - **פונקציות עזר:**
    - `fetchTotalDonationsForUserWeb(userId: string, startDate: string, endDate: string)`: קוראת ל-RPC ב-Supabase.
    - `fetchTotalDonationsForUserDesktop(startDate: string, endDate: string)`: קוראת לפקודת ה-Tauri.
- **ניהול מצב (Zustand - `src/lib/store.ts`):**
  - **משתנה מצב:** `serverCalculatedTotalDonations: number | null`
  - **פעולת עדכון:** `setServerCalculatedTotalDonations(totalDonations: number | null)`
- **ממשק משתמש (UI - `src/components/dashboard/StatsCards.tsx`):**
  - `useEffect` קורא ל-`fetchTotalDonationsInRange`.
  - משתני `useState` (`isLoadingServerDonations`, `serverDonationsError`) מנהלים טעינה ושגיאות.
  - הנתון (`serverTotalDonations`) מה-store מוצג בכרטיסייה עם סימון (S). חישוב האחוז מההכנסות (S) מתבצע גם הוא.

### 4. נדרש לתרומה (כללי - יתרת מעשר כוללת)

- **מסד נתונים (Supabase/PostgreSQL - Web):**
  - **פונקציית SQL:** `calculate_user_tithe_balance(p_user_id UUID)`
  - **תיאור:** מחשבת את יתרת המעשר הכוללת למשתמש על בסיס כלל הטרנזקציaties שלו, תוך התחשבות בסוג הטרנזקציה (`income`, `donation`, `recognized-expense`) והאם מדובר בחומש.
- **קוד צד שרת (Tauri/Rust - Desktop):**
  - **פקודת Rust:** `get_desktop_overall_tithe_balance(db_state: State<'_, DbState>)`
  - **מיקום:** `src-tauri/src/commands/donation_commands.rs`
  - **תיאור:** קוראת את כל הטרנזקציות מ-SQLite ומחשבת את יתרת המעשר הכוללת בלוגיקה דומה לפונקציית ה-SQL ב-Supabase.
- **שירות נתונים (`src/lib/dataService.ts`):**
  - **פונקציה ראשית:** `fetchServerTitheBalance(userId: string | null): Promise<number | null>`
  - **פונקציות עזר:**
    - `fetchServerTitheBalanceWeb(userId: string)`: קוראת ל-RPC ב-Supabase.
    - `fetchServerTitheBalanceDesktop()`: קוראת לפקודת ה-Tauri.
- **ניהול מצב (Zustand - `src/lib/store.ts`):**
  - **משתנה מצב:** `serverCalculatedTitheBalance: number | null`
  - **פעולת עדכון:** `setServerCalculatedTitheBalance(balance: number | null)`
- **ממשק משתמש (UI - `src/components/dashboard/StatsCards.tsx`):**
  - `useEffect` קורא ל-`fetchServerTitheBalance` (לא תלוי בטווח תאריכים).
  - משתני `useState` (`isLoadingServerTitheBalance`, `serverTitheBalanceError`) מנהלים טעינה ושגיאות.
  - הנתון (`serverCalculatedTitheBalance`) מה-store מוצג בכרטיסייה עם סימון (S).

## חלק 2: קבצים וקטעי קוד למחיקה (חישובי קליינט ישנים - C)

עם המעבר לחישובים בצד השרת, חלק מהלוגיקה ששימשה לחישובים בצד הלקוח הופכת למיותרת או נשמרת רק לצורכי השוואה זמניים.

- **`src/components/dashboard/StatsCards.tsx`:**

  - **פונקציות חישוב בצד הלקוח:**
    - `calculateClientSideTotalIncome(transactions: Transaction[], dateRange: DateRangeObject)`
    - `calculateClientSideTotalExpenses(transactions: Transaction[], dateRange: DateRangeObject)`
    - `calculateClientSideTotalDonations(transactions: Transaction[], dateRange: DateRangeObject)`
    - משתנים נגזרים כמו `clientChomeshAmountInRange`.
    - כרגע, פונקציות אלו עדיין בשימוש להצגת ערכי (C) לצד ערכי (S). בעתיד, עם המעבר המלא לחישובי שרת, ניתן יהיה להסירן ולהציג רק את ערכי (S).
  - **חישוב יתרת מעשר כללית בצד הלקוח:**
    - המשתנה `clientCalculatedOverallRequired` המחושב באמצעות הסלקטור `selectCalculatedBalance` מה-store. גם נתון זה מוצג עם סימון (C). בעתיד, ניתן יהיה להסתמך רק על `serverCalculatedTitheBalance`.
  - **קוד שמיש שהוסר (דוגמה):**
    - הפונקציות `getStartDate` ו-`filterByDateRange`.
    - המשתנה `filteredTransactions`.
    - בלוק ה-`useMemo` שחישב את `clientTotalIncomeForAllFilters`, `totalExpenses`, `totalDonations`, ו-`chomeshIncomesAmount` (הוסר עקב אי-שימוש ושגיאת לינטר).

- **`src/lib/tithe-calculator.ts`:**

  - הפונקציה המרכזית `calculateTotalRequiredDonation(transactions: Transaction[])`.
  - פונקציה זו היא הבסיס לחישוב `clientCalculatedOverallRequired` ב-`StatsCards.tsx`. כל עוד נתוני (C) מוצגים, פונקציה זו נשארת רלוונטית. אם יוחלט להסיר לחלוטין את תצוגת (C) עבור יתרת המעשר, השימוש בפונקציה זו בקונטקסט של `StatsCards` יפחת. עם זאת, ייתכן שהיא עדיין תשמש במקומות אחרים או לצרכים אחרים.

- **קבצים שנמחקו בתהליך:**
  - `sql_queries/supabase/expenses/calculate_total_expenses.sql` (הלוגיקה הוטמעה בפונקציית SQL כללית יותר).
  - `sql_queries/sqlite/expenses/select_total_expenses.sql` (השאילתה הוטמעה ישירות בקוד ה-Rust).
  - `src/services/dataService.ts` (אם היה קיים קובץ כזה בנתיב זה והוא מוזג/הוחלף על ידי `src/lib/dataService.ts`).

## הערה כללית

הכוונה הסופית היא להסתמך באופן מלא על חישובי השרת (S) כמקור האמת. הצגת נתוני הלקוח (C) כרגע היא בעיקר לצורך השוואה ובדיקה במהלך המעבר. לאחר שהאמון בחישובי השרת יתבסס, ניתן יהיה להסיר את חישובי הלקוח המקבילים מה-UI ובהמשך גם את קטעי הקוד המשויכים להם.
