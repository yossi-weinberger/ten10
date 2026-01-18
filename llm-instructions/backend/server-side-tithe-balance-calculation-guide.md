# מדריך למימוש שליפה אגרגטיבית של "נדרש לתרומה"

**מטרה:** לשלוף את הנתון "נדרש לתרומה" ישירות ממסד הנתונים (Supabase) באמצעות חישוב אגרגטיבי, במקום לחשב אותו בצד הלקוח מתוך כלל הטרנזקציות. המימוש החדש יתווסף לצד הלוגיקה הקיימת.

**שלב 1: יצירת פונקציית SQL ב-Supabase לחישוב היתרה**

1.  **פתח את ה-SQL Editor** ב-Supabase Studio של הפרויקט שלך.
2.  **הרץ את קוד ה-SQL הבא** כדי ליצור פונקציה חדשה בשם `calculate_user_tithe_balance`. פונקציה זו מקבלת `user_id` ומחזירה את היתרה המחושבת:

    ```sql
    CREATE OR REPLACE FUNCTION calculate_user_tithe_balance(p_user_id UUID)
    RETURNS NUMERIC AS $$
    DECLARE
        v_balance NUMERIC := 0;
    BEGIN
        SELECT
            COALESCE(SUM(
                CASE
                    WHEN type = 'income' THEN
                        amount * (CASE WHEN is_chomesh = TRUE THEN 0.2 ELSE 0.1 END)
                    WHEN type = 'donation' THEN
                        -amount
                    WHEN type = 'recognized-expense' THEN
                        -amount * 0.1
                    WHEN type = 'initial_balance' THEN
                        amount  -- Direct adjustment: positive = debt, negative = credit
                    ELSE
                        0
                END
            ), 0) INTO v_balance  -- COALESCE to return 0 if no transactions or SUM is NULL
        FROM
            public.transactions
        WHERE
            user_id = p_user_id;

        RETURN v_balance;
    END;
    $$ LANGUAGE plpgsql;
    ```
    
    **Note about `initial_balance` type:**
    - This type is used to set an opening balance (debt or credit) without affecting income/expense reports.
    - A **positive amount** increases the tithe obligation (debt).
    - A **negative amount** decreases the tithe obligation (credit/prepayment).
    - This type is **NOT included** in `INCOME_TYPES`, `EXPENSE_TYPES`, or `DONATION_TYPES` to ensure it doesn't appear in charts or standard reports.

    - **`CREATE OR REPLACE FUNCTION`**: יוצר את הפונקציה או מחליף אותה אם היא כבר קיימת.
    - **`p_user_id UUID`**: פרמטר הקלט לפונקציה (מזהה המשתמש).
    - **`RETURNS NUMERIC`**: הפונקציה תחזיר ערך מספרי.
    - **`DECLARE v_balance NUMERIC := 0;`**: הצהרה על משתנה פנימי לאחסון היתרה.
    - **`SELECT COALESCE(SUM(...), 0) INTO v_balance ...`**: זוהי ליבת החישוב, זהה למה שדנו עליו, עם `COALESCE` כדי להבטיח שיוחזר `0` אם אין טרנזקציות למשתמש (ולא `NULL`).
    - **`LANGUAGE plpgsql`**: מציין את שפת הפרוצדורה (שפת ברירת המחדל של PostgreSQL לפונקציות).

    **Database Constraints Updates:**
    To support `initial_balance` correctly, especially with negative amounts (credit), the following constraints were updated:
    1.  **`transactions_type_check`**: Added `initial_balance` to the allowed types list.
    2.  **`transactions_amount_check`**: Updated to allow negative amounts *only* when `type = 'initial_balance'` (e.g., `CHECK (amount >= 0 OR type = 'initial_balance')`).

**שלב 2: הוספת פונקציה חדשה לשליפת היתרה ב-`src/lib/data-layer/analytics.service.ts`**

1.  פתח את הקובץ `src/lib/data-layer/analytics.service.ts`.
2.  הוסף את הפונקציה האסינכרונית הבאה, שתשתמש ב-`supabase.rpc()` כדי לקרוא לפונקציית ה-SQL שיצרת:

    ```typescript
    // import { supabase } from "../supabaseClient"; // Make sure supabase client is imported

    // Add this new function:
    export async function fetchServerTitheBalanceWeb(
      userId: string
    ): Promise<number | null> {
      console.log(
        "AnalyticsService: Fetching user tithe balance from Supabase for user:",
        userId
      );
      try {
        const { data, error } = await supabase.rpc(
          "calculate_user_tithe_balance", // Name of the SQL function
          { p_user_id: userId } // Parameters for the SQL function
        );

        if (error) {
          console.error(
            "AnalyticsService: Error calling calculate_user_tithe_balance RPC:",
            error
          );
          throw error;
        }

        console.log(
          "AnalyticsService: Successfully fetched tithe balance:",
          data
        );
        return typeof data === "number" ? data : null;
      } catch (errorCaught: any) {
        console.error(
          "AnalyticsService: Exception fetching tithe balance:",
          errorCaught
        );
        throw new Error(
          `Failed to fetch tithe balance. Original error: ${
            errorCaught.message || errorCaught
          }`
        );
      }
    }
    ```

**שלב 3: עדכון ה-Store ב-`src/lib/store.ts`**

1.  פתח את הקובץ `src/lib/store.ts`.
2.  הוסף שדה חדש לממשק `DonationState` ואתחול שלו, יחד עם פעולה לעדכונו:

    ```typescript
    interface DonationState {
      // ... existing fields
      transactions: Transaction[];
      requiredDonation: number; // This will be the one calculated on the client (for now)
      serverCalculatedTitheBalance?: number | null; // New field for server-calculated balance
      settings: Settings;
      // ... existing fields
      lastDbFetchTimestamp?: number | null;
      _hasHydrated: boolean;
      // ... existing actions
      updateSettings: (settings: Partial<Settings>) => void;
      setTransactions: (transactions: Transaction[]) => void;
      addTransaction: (transaction: Transaction) => void;
      setLastDbFetchTimestamp: (timestamp: number | null) => void;
      setHasHydrated: (status: boolean) => void;
      setServerCalculatedTitheBalance: (balance: number | null) => void; // New action
    }

    export const useDonationStore = create<DonationState>()(
      persist(
        (set, get) => ({
          // ... existing initializations
          transactions: [],
          requiredDonation: 0,
          serverCalculatedTitheBalance: null, // Initialize the new field
          settings: defaultSettings,
          lastDbFetchTimestamp: null,
          _hasHydrated: false,

          // ... existing actions implementation
          updateSettings: (newSettings) => {
            /* ... */
          },
          setTransactions: (newTransactions) => {
            set({ transactions: newTransactions });
            // Keep the existing client-side calculation for 'requiredDonation' for now
            const newRequiredDonation =
              calculateTotalRequiredDonation(newTransactions);
            set({ requiredDonation: newRequiredDonation });
          },
          addTransaction: (transaction) => {
            /* ... existing logic, ensure requiredDonation is recalculated */
          },
          setLastDbFetchTimestamp: (timestamp) =>
            set({ lastDbFetchTimestamp: timestamp }),
          setHasHydrated: (status) => set({ _hasHydrated: status }),
          setServerCalculatedTitheBalance: (
            balance // New action implementation
          ) => set({ serverCalculatedTitheBalance: balance }),
        }),
        {
          name: "donation-storage",
          // ... existing persist options
          onRehydrateStorage: () => {
            /* ... */
          },
        }
      )
    );
    ```

    - שים לב ששדה ה-`requiredDonation` המחושב בצד הלקוח הוסר, ואנו מסתמכים כעת על `serverCalculatedTitheBalance` כמקור האמת.

**שלב 4: שליפת הנתון האגרגטיבי והצגתו**

הקריאה לפונקציית השירות מתבצעת כעת ב-hook ייעודי בשם `useServerStats.ts`, אשר מופעל מהקומפוננטה `StatsCards.tsx`. ה-hook דואג לקרוא לגרסה המתאימה לפלטפורמה (ווב או דסקטופ).

1.  **קובץ שירות (`analytics.service.ts`):**

    - הפונקציה `fetchServerTitheBalance` מבדילה בין הפלטפורמות.
    - **ווב:** קוראת ל-`fetchServerTitheBalanceWeb` (שהוצגה למעלה).
    - **דסקטופ:** קוראת לפקודת Rust `get_desktop_overall_tithe_balance` באמצעות `invoke`.

2.  **Hook (`src/hooks/useServerStats.ts`):**

    - `useEffect` קורא ל-`fetchServerTitheBalance` מהשירות.
    - הוא מנהל מצבי טעינה ושגיאה (`isLoadingServerTitheBalance`, `serverTitheBalanceError`).
    - עם קבלת התוצאה, הוא מעדכן את ה-Zustand store באמצעות `setServerCalculatedTitheBalance`.

3.  **הצגת הנתון החדש ב-UI (`StatsCards.tsx`):**

    - הקומפוננטה קוראת ל-hook `useServerStats()`.
    - היא צורכת את `serverCalculatedTitheBalance` ישירות מה-store של Zustand.
    - הערך מוצג בכרטיסייה "נדרש לתרומה" עם סימון "(S)" המציין שמדובר בחישוב שרת.

    לדוגמה, בקומפוננטת הכרטיסייה:

    ```typescript
    const serverBalance = useDonationStore(
      (state) => state.serverCalculatedTitheBalance
    );

    // ... in your JSX
    // <p>נדרש לתרומה (שרת): {serverBalance !== null ? formatCurrency(serverBalance) : 'טוען...'}</p>
    ```

**שלב 5: בדיקה והשוואה**

- הרץ את האפליקציה.
- בצע לוגין.
- ודא שהקונסול לוגים מראים שהפונקציות החדשות נקראות ושהנתונים נשלפים ונשמרים כצפוי.
- ודא שהערך המוצג בכרטיסייה "נדרש לתרומה" הוא הערך המגיע מהשרת.

---

מסמך זה מספק לך את השלבים המרכזיים. כמובן שייתכנו התאמות קטנות בהתאם למבנה המדויק של הקוד שלך.
