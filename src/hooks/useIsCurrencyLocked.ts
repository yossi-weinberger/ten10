import { useState, useEffect } from "react";
import { useDonationStore } from "@/lib/store";
import { hasAnyTransaction } from "@/lib/data-layer/transactions.service";
import { useShallow } from "zustand/react/shallow";

/**
 * A robust hook to determine if the currency settings should be locked.
 * It combines immediate Store state checks with an async DB verification for maximum reliability.
 * Works for both Web and Desktop platforms.
 */
export function useIsCurrencyLocked() {
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to store changes that indicate transaction activity
  const { 
    serverCalculatedTotalIncome, 
    serverCalculatedTotalExpenses, 
    serverCalculatedTotalDonations, 
    serverCalculatedTitheBalance,
    lastDbFetchTimestamp 
  } = useDonationStore(
    useShallow((state) => ({
      serverCalculatedTotalIncome: state.serverCalculatedTotalIncome,
      serverCalculatedTotalExpenses: state.serverCalculatedTotalExpenses,
      serverCalculatedTotalDonations: state.serverCalculatedTotalDonations,
      serverCalculatedTitheBalance: state.serverCalculatedTitheBalance,
      lastDbFetchTimestamp: state.lastDbFetchTimestamp
    }))
  );

  useEffect(() => {
    let isMounted = true;

    const checkLockStatus = async () => {
      // Always verify against the DB directly for maximum reliability.
      // Relying on store totals (serverCalculatedTotalIncome etc.) is risky because:
      // 1. They depend on the active date range in Dashboard, which might filter out existing transactions.
      // 2. They might be stale immediately after a "Clear Data" operation if the store hasn't refreshed yet.
      // Since hasAnyTransaction() is optimized (COUNT query), calling it on Settings mount is fine.
      try {
        const hasTransactionsInDb = await hasAnyTransaction();
        if (isMounted) {
          setIsLocked(hasTransactionsInDb);
        }
      } catch (error) {
        console.error("Failed to check transaction status from DB:", error);
        // On error, default to safe (false? or true to prevent damage?)
        // False is safer for UX to avoid locking users out due to errors.
        if (isMounted) {
            setIsLocked(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkLockStatus();

    return () => {
      isMounted = false;
    };
  }, [
    serverCalculatedTotalIncome, 
    serverCalculatedTotalExpenses, 
    serverCalculatedTotalDonations, 
    serverCalculatedTitheBalance, 
    lastDbFetchTimestamp // Re-run check whenever data is refreshed/modified
  ]);

  return { isLocked, isLoading };
}
