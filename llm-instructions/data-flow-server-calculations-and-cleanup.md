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
- **שירות נתונים (`src/lib/dbStatsCardsService.ts`):**
  - **פונקציה ראשית:** `fetchDbCalculatedTotalIncomeForStatsCards(userId: string | null, startDate: string, endDate: string): Promise<ServerIncomeData | null>`
  - **פונקציות עזר:**
    - `fetchTotalIncomeForUserWeb(userId: string, startDate: string, endDate: string)`: קוראת לפונקציית ה-RPC ב-Supabase.
- **ניהול מצב (Zustand - `src/lib/store.ts`):**
  - **משתני מצב:**
    - `serverCalculatedTotalIncome: number | null`
    - `serverCalculatedChomeshAmount: number | null`
  - **פעולות עדכון:**
    - `setServerCalculatedTotalIncome(totalIncome: number | null)`
    - `setServerCalculatedChomeshAmount(chomeshAmount: number | null)`
- **ממשק משתמש (UI - `src/components/dashboard/StatsCards.tsx`):**
  - `useEffect` קורא ל-`fetchDbCalculatedTotalIncomeForStatsCards` בעת שינוי טווח התאריכים או פרטי המשתמש/פלטפורמה.
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
- **שירות נתונים (`src/lib/dbStatsCardsService.ts`):**
  - **פונקציה ראשית:** `fetchDbCalculatedTotalExpensesForStatsCards(userId: string | null, startDate: string, endDate: string): Promise<number | null>`
  - **פונקציות עזר:**
    - `fetchTotalExpensesForUserWeb(userId: string, startDate: string, endDate: string)`: קוראת ל-RPC ב-Supabase.
- **ניהול מצב (Zustand - `src/lib/store.ts`):**
  - **משתנה מצב:** `serverCalculatedTotalExpenses: number | null`
  - **פעולת עדכון:** `setServerCalculatedTotalExpenses(totalExpenses: number | null)`
- **ממשק משתמש (UI - `src/components/dashboard/StatsCards.tsx`):**
  - `useEffect` קורא ל-`fetchDbCalculatedTotalExpensesForStatsCards`.
  - משתני `useState` (`isLoadingServerExpenses`, `serverExpensesError`) מנהלים טעינה ושגיאות.
  - הנתון (`serverTotalExpenses`) מה-store מוצג בכרטיסייה עם סימון (S).

### 3. סך תרומות

- **מסד נתונים (Supabase/PostgreSQL - Web):**
  - **פונקציית SQL:** `get_total_donations_for_user(p_user_id UUID, p_start_date TEXT, p_end_date TEXT) RETURNS TABLE (total_donations_amount DOUBLE PRECISION, non_tithe_donation_amount DOUBLE PRECISION)`
  - **תיאור:** מחזירה את סך כל התרומות (כולל תרומות מסוג `non_tithe_donation`) ואת הסכום הספציפי של תרומות מסוג `non_tithe_donation` עבור משתמש נתון וטווח תאריכים.
- **קוד צד שרת (Tauri/Rust - Desktop):**
  - **פקודת Rust:** `get_desktop_total_donations_in_range(db_state: State<'_, DbState>, start_date: String, end_date: String) -> Result<DesktopDonationData, String>`
  - **מיקום:** `src-tauri/src/commands/donation_commands.rs`
  - **תיאור:** מבצעת שאילתת SQL מוטמעת על SQLite ומחזירה אובייקט `DesktopDonationData { total_donations_amount: f64, non_tithe_donation_amount: f64 }` המכיל את סך כל התרומות ואת סך התרומות שאינן ממעשר בטווח תאריכים.
- **שירות נתונים (`src/lib/dbStatsCardsService.ts`):**
  - **ממשק נתונים:** `ServerDonationData { total_donations_amount: number; non_tithe_donation_amount: number; }`
  - **פונקציה ראשית:** `fetchDbCalculatedTotalDonationsForStatsCards(userId: string | null, startDate: string, endDate: string): Promise<ServerDonationData | null>`
  - **פונקציות עזר:**
    - `fetchTotalDonationsForUserWeb(userId: string, startDate: string, endDate: string): Promise<ServerDonationData | null>`: קוראת ל-RPC ב-Supabase ומעבדת את התשובה (שהיא מערך) למבנה `ServerDonationData`.
    - `fetchTotalDonationsForUserDesktop(startDate: string, endDate: string): Promise<ServerDonationData | null>`: קוראת לפקודת ה-Rust וממפה את התוצאה ל-`ServerDonationData`.
- **ניהול מצב (Zustand - `src/lib/store.ts`):**
  - **משתני מצב:**
    - `serverCalculatedDonationsData: ServerDonationData | null` (הדרך המועדפת לקבל נתוני תרומות מהשרת)
    - `serverCalculatedTotalDonations: number | null` (עשוי להיות מאוכלס מ-`donationsData.total_donations_amount` לצורכי תאימות לאחור או שימושים נקודתיים)
  - **פעולות עדכון:**
    - `setServerCalculatedDonationsData(data: ServerDonationData | null)`
    - `setServerCalculatedTotalDonations(total: number | null)`
- **ממשק משתמש (UI - `src/hooks/useServerStats.ts`, `src/components/dashboard/StatsCards.tsx`, `src/components/dashboard/StatCards/DonationsStatCard.tsx`):**
  - ה-hook `useServerStats.ts` קורא ל-`fetchDbCalculatedTotalDonationsForStatsCards` ומעדכן את `serverCalculatedDonationsData` ב-store.
  - הקומפוננטה `StatsCards.tsx` מעבירה את `serverCalculatedDonationsData` ל-`DonationsStatCard.tsx`.
  - הקומפוננטה `DonationsStatCard.tsx` צורכת את `serverCalculatedDonationsData` כדי להציג את `total_donations_amount` כסך התרומות (S) ואת `non_tithe_donation_amount` כפירוט "מתוכן X תרומה אישית (S)".
  - חישוב האחוז מההכנסות (S) מתבצע בהתבסס על `total_donations_amount`.
  - משתני `useState` (`isLoadingServerDonations`, `serverDonationsError`) ב-`useServerStats.ts` מנהלים טעינה ושגיאות.

### 4. נדרש לתרומה (כללי - יתרת מעשר כוללת)

- **מסד נתונים (Supabase/PostgreSQL - Web):**
  - **פונקציית SQL:** `calculate_user_tithe_balance(p_user_id UUID)`
  - **תיאור:** מחשבת את יתרת המעשר הכוללת למשתמש על בסיס כלל הטרנזקציaties שלו, תוך התחשבות בסוג הטרנזקציה (`income`, `donation`, `recognized-expense`) והאם מדובר בחומש.
- **קוד צד שרת (Tauri/Rust - Desktop):**
  - **פקודת Rust:** `get_desktop_overall_tithe_balance(db_state: State<'_, DbState>)`
  - **מיקום:** `src-tauri/src/commands/donation_commands.rs`
  - **תיאור:** קוראת את כל הטרנזקציות מ-SQLite ומחשבת את יתרת המעשר הכוללת בלוגיקה דומה לפונקציית ה-SQL ב-Supabase.
- **שירות נתונים (`src/lib/dbStatsCardsService.ts`):**
  - **פונקציה ראשית:** `fetchDbCalculatedTitheBalanceForStatsCards(userId: string | null): Promise<number | null>`
  - **פונקציות עזר:**
    - `fetchServerTitheBalanceWeb(userId: string)`: קוראת ל-RPC ב-Supabase.
- **ניהול מצב (Zustand - `src/lib/store.ts`):**
  - **משתנה מצב:** `serverCalculatedTitheBalance: number | null`
  - **פעולת עדכון:** `setServerCalculatedTitheBalance(balance: number | null)`
- **ממשק משתמש (UI - `src/components/dashboard/StatsCards.tsx`):**
  - `useEffect` קורא ל-`fetchDbCalculatedTitheBalanceForStatsCards` (לא תלוי בטווח תאריכים).
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
  - `src/lib/dataService.ts` (הקובץ המקורי פוצל למספר שירותים: `platformService.ts`, `transactionService.ts`, `dbStatsCardsService.ts`, `storeService.ts`).
  - `src/components/dashboard/TransactionsTable.tsx` (הקומפוננטה לא הייתה בשימוש והוסרה).

## הערה כללית

הכוונה הסופית היא להסתמך באופן מלא על חישובי השרת (S) כמקור האמת. הצגת נתוני הלקוח (C) כרגע היא בעיקר לצורך השוואה ובדיקה במהלך המעבר. לאחר שהאמון בחישובי השרת יתבסס, ניתן יהיה להסיר את חישובי הלקוח המקבילים מה-UI ובהמשך גם את קטעי הקוד המשויכים להם.
