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

    - **`CREATE OR REPLACE FUNCTION`**: יוצר את הפונקציה או מחליף אותה אם היא כבר קיימת.
    - **`p_user_id UUID`**: פרמטר הקלט לפונקציה (מזהה המשתמש).
    - **`RETURNS NUMERIC`**: הפונקציה תחזיר ערך מספרי.
    - **`DECLARE v_balance NUMERIC := 0;`**: הצהרה על משתנה פנימי לאחסון היתרה.
    - **`SELECT COALESCE(SUM(...), 0) INTO v_balance ...`**: זוהי ליבת החישוב, זהה למה שדנו עליו, עם `COALESCE` כדי להבטיח שיוחזר `0` אם אין טרנזקציות למשתמש (ולא `NULL`).
    - **`LANGUAGE plpgsql`**: מציין את שפת הפרוצדורה (שפת ברירת המחדל של PostgreSQL לפונקציות).

**שלב 2: הוספת פונקציה חדשה לשליפת היתרה ב-`src/lib/dataService.ts`**

1.  פתח את הקובץ `src/lib/dataService.ts`.
2.  הוסף את הפונקציה האסינכרונית הבאה, שתשתמש ב-`supabase.rpc()` כדי לקרוא לפונקציית ה-SQL שיצרת:

    ```typescript
    // At the top with other imports:
    // import { supabase } from "./supabaseClient"; // Make sure supabase client is imported

    // Add this new function:
    export async function fetchUserTitheBalance(
      userId: string
    ): Promise<number> {
      console.log(
        "DataService: Fetching user tithe balance from Supabase for user:",
        userId
      );
      try {
        const { data, error } = await supabase.rpc(
          "calculate_user_tithe_balance", // Name of the SQL function
          { p_user_id: userId } // Parameters for the SQL function
        );

        if (error) {
          console.error(
            "DataService: Error calling calculate_user_tithe_balance RPC:",
            error
          );
          throw error;
        }

        console.log("DataService: Successfully fetched tithe balance:", data);
        // Assuming 'data' is the numeric balance.
        // If 'data' could be null or undefined in some RPC scenarios, handle appropriately.
        return typeof data === "number" ? data : 0;
      } catch (errorCaught: any) {
        console.error(
          "DataService: Exception fetching tithe balance:",
          errorCaught
        );
        // Consider re-throwing or returning a default/error indicator
        throw new Error(
          `Failed to fetch tithe balance. Original error: ${
            errorCaught.message || errorCaught
          }`
        );
      }
    }
    ```

**שלב 3: עדכון ה-Store ב-`src/lib/store.ts` (אופציונלי, אך מומלץ לניהול מרכזי)**

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

    - שים לב ששמרנו את `requiredDonation` הקיים, והוספנו `serverCalculatedTitheBalance`.

**שלב 4: שליפת הנתון האגרגטיבי והצגתו (לדוגמה, ב-`AuthContext.tsx`)**

1.  פתח את `src/contexts/AuthContext.tsx`.
2.  נצטרך להוסיף לוגיקה שתקרא ל-`fetchUserTitheBalance` כאשר המשתמש מאומת. אפשר לעשות זאת ב-`useEffect` הקיים שמטפל בטעינת נתונים, או ב-`useEffect` נפרד.
3.  נאחסן את התוצאה ב-Zustand store.

    ```typescript
    // In AuthContext.tsx

    // Import the new service function and store action
    import {
      fetchUserTitheBalance /*, other imports from dataService */,
    } from "@/lib/dataService";
    // const setTransactionsInStore = useDonationStore((state) => state.setTransactions); // existing
    const setServerCalculatedTitheBalanceInStore = useDonationStore(
      (state) => state.setServerCalculatedTitheBalance
    ); // New store action

    // ... inside the AuthProvider component

    // You might want a new state for loading this specific balance
    const [isFetchingTitheBalance, setIsFetchingTitheBalance] = useState(false);

    // Example: Modify or add a useEffect to fetch the server-calculated balance
    useEffect(() => {
      const loadServerBalance = async () => {
        if (user && hasHydrated && !isFetchingTitheBalance) {
          // We only fetch this if not already fetching, and user is available + store hydrated
          // You might add more conditions, e.g., only on login, or less frequently than all transactions
          console.log(
            "AuthContext: Attempting to fetch server-calculated tithe balance for user:",
            user.id
          );
          setIsFetchingTitheBalance(true);
          try {
            const balance = await fetchUserTitheBalance(user.id);
            setServerCalculatedTitheBalanceInStore(balance);
            console.log(
              "AuthContext: Successfully set server-calculated tithe balance in store:",
              balance
            );
          } catch (error) {
            console.error(
              "AuthContext: Failed to fetch/set server-calculated tithe balance:",
              error
            );
            // Optionally set it to null or an error state in the store
            setServerCalculatedTitheBalanceInStore(null);
          } finally {
            setIsFetchingTitheBalance(false);
          }
        }
      };

      loadServerBalance();
    }, [
      user,
      hasHydrated,
      isFetchingTitheBalance,
      setServerCalculatedTitheBalanceInStore /* other dependencies if needed */,
    ]);

    // ... rest of AuthContext
    ```

4.  **הצגת הנתון החדש ב-UI:**

    - בקומפוננטה שמציגה את הכרטיסייה "נדרש לתרומה", קרא את הערך החדש `serverCalculatedTitheBalance` מה-`useDonationStore`.
    - תוכל להציג אותו _לצד_ הנתון הקיים (`requiredDonation`) לצורך השוואה ובדיקה.

    לדוגמה, בקומפוננטת הכרטיסייה:

    ```typescript
    // const requiredDonation = useDonationStore((state) => state.requiredDonation); // Existing
    const serverBalance = useDonationStore(
      (state) => state.serverCalculatedTitheBalance
    );

    // ... in your JSX
    // <p>נדרש לתרומה (קליינט): {formatCurrency(requiredDonation)}</p>
    // <p>נדרש לתרומה (שרת): {serverBalance !== null ? formatCurrency(serverBalance) : 'טוען...'}</p>
    ```

**שלב 5: בדיקה והשוואה**

- הרץ את האפליקציה.
- בצע לוגין.
- בדוק את ערכי "נדרש לתרומה" (הישן המחושב בקליינט והחדש המגיע מהשרת) בכרטיסייה הרלוונטית.
- ודא שהקונסול לוגים מראים שהפונקציות החדשות נקראות ושהנתונים נשלפים ונשמרים כצפוי.
- השווה את שני הערכים. הם אמורים להיות זהים אם הלוגיקה בשני המקומות תואמת.

---

מסמך זה מספק לך את השלבים המרכזיים. כמובן שייתכנו התאמות קטנות בהתאם למבנה המדויק של הקוד שלך.
