import { useEffect, useState } from "react";
import { useDonationStore } from "@/lib/store";
import {
  fetchTotalIncomeInRange,
  ServerIncomeData,
  fetchTotalExpensesInRange,
  fetchTotalDonationsInRange,
  fetchServerTitheBalance,
  ServerDonationData,
  TitheBalanceBreakdown,
} from "@/lib/data-layer";
import { User } from "@/contexts/AuthContext";
import { DateRangeObject } from "./useDateControls";
import { Platform } from "@/contexts/PlatformContext";
import { logger } from "@/lib/logger";

export function useServerStats(
  activeDateRangeObject: DateRangeObject,
  user: User | null,
  platform: Platform | undefined
) {
  const serverTotalIncome = useDonationStore(
    (state) => state.serverCalculatedTotalIncome
  );
  const setServerTotalIncome = useDonationStore(
    (state) => state.setServerCalculatedTotalIncome
  );
  const serverChomeshAmount = useDonationStore(
    (state) => state.serverCalculatedChomeshAmount
  );
  const setServerChomeshAmount = useDonationStore(
    (state) => state.setServerCalculatedChomeshAmount
  );
  const [isLoadingServerIncome, setIsLoadingServerIncome] = useState(false);
  const [serverIncomeError, setServerIncomeError] = useState<string | null>(
    null
  );

  const serverTotalExpenses = useDonationStore(
    (state) => state.serverCalculatedTotalExpenses
  );
  const setServerTotalExpenses = useDonationStore(
    (state) => state.setServerCalculatedTotalExpenses
  );
  const [isLoadingServerExpenses, setIsLoadingServerExpenses] = useState(false);
  const [serverExpensesError, setServerExpensesError] = useState<string | null>(
    null
  );

  const serverTotalDonations = useDonationStore(
    (state) => state.serverCalculatedTotalDonations
  );
  const setServerTotalDonations = useDonationStore(
    (state) => state.setServerCalculatedTotalDonations
  );
  const serverCalculatedDonationsData = useDonationStore(
    (state) => state.serverCalculatedDonationsData
  );
  const setServerCalculatedDonationsData = useDonationStore(
    (state) => state.setServerCalculatedDonationsData
  );
  const [isLoadingServerDonations, setIsLoadingServerDonations] =
    useState(false);
  const [serverDonationsError, setServerDonationsError] = useState<
    string | null
  >(null);

  const serverTitheBalance = useDonationStore(
    (state) => state.serverCalculatedTitheBalance
  );
  const setServerTitheBalance = useDonationStore(
    (state) => state.setServerCalculatedTitheBalance
  );
  const serverMaaserBalance = useDonationStore(
    (state) => state.serverCalculatedMaaserBalance
  );
  const setServerMaaserBalance = useDonationStore(
    (state) => state.setServerCalculatedMaaserBalance
  );
  const serverChomeshBalance = useDonationStore(
    (state) => state.serverCalculatedChomeshBalance
  );
  const setServerChomeshBalance = useDonationStore(
    (state) => state.setServerCalculatedChomeshBalance
  );
  const [isLoadingServerTitheBalance, setIsLoadingServerTitheBalance] =
    useState(false);
  const [serverTitheBalanceError, setServerTitheBalanceError] = useState<
    string | null
  >(null);

  const lastDbFetchTimestamp = useDonationStore(
    (state) => state.lastDbFetchTimestamp
  );

  useEffect(() => {
    const effectiveUserId = platform === "web" ? user?.id || null : null;
    const canFetch = (platform === "web" && effectiveUserId) || platform === "desktop";
    const isWebNoUser = platform === "web" && !effectiveUserId;

    if (isWebNoUser) {
      // Clear all values — no user available on web
      setServerTotalIncome(null); setServerChomeshAmount(null); setIsLoadingServerIncome(false); setServerIncomeError(null);
      setServerTotalExpenses(null); setIsLoadingServerExpenses(false); setServerExpensesError(null);
      setServerTotalDonations(null); setServerCalculatedDonationsData(null); setIsLoadingServerDonations(false); setServerDonationsError(null);
      setServerTitheBalance(null); setServerMaaserBalance(null); setServerChomeshBalance(null); setIsLoadingServerTitheBalance(false); setServerTitheBalanceError(null);
      return;
    }

    if (canFetch && activeDateRangeObject.startDate && activeDateRangeObject.endDate) {
      // Single Promise.all → all setStates fire close together → React batches into ~1 render
      const loadAll = async () => {
        setIsLoadingServerIncome(true);
        setIsLoadingServerExpenses(true);
        setIsLoadingServerDonations(true);
        setIsLoadingServerTitheBalance(true);
        setServerIncomeError(null);
        setServerExpensesError(null);
        setServerDonationsError(null);
        setServerTitheBalanceError(null);

        try {
          const [incomeData, expensesData, donationsData, titheData] = await Promise.all([
            fetchTotalIncomeInRange(effectiveUserId, activeDateRangeObject.startDate, activeDateRangeObject.endDate),
            fetchTotalExpensesInRange(effectiveUserId, activeDateRangeObject.startDate, activeDateRangeObject.endDate),
            fetchTotalDonationsInRange(effectiveUserId, activeDateRangeObject.startDate, activeDateRangeObject.endDate),
            fetchServerTitheBalance(effectiveUserId),
          ]);

          // Income
          if (incomeData) { setServerTotalIncome(incomeData.total_income); setServerChomeshAmount(incomeData.chomesh_amount); }
          else { setServerTotalIncome(null); setServerChomeshAmount(null); }

          // Expenses
          setServerTotalExpenses(expensesData);

          // Donations
          setServerCalculatedDonationsData(donationsData);
          setServerTotalDonations(donationsData?.total_donations_amount ?? null);

          // Tithe balance
          if (titheData) { setServerTitheBalance(titheData.total_balance); setServerMaaserBalance(titheData.maaser_balance); setServerChomeshBalance(titheData.chomesh_balance); }
          else { setServerTitheBalance(null); setServerMaaserBalance(null); setServerChomeshBalance(null); }

        } catch (error) {
          logger.error("useServerStats: Failed to fetch stats:", error);
          const msg = error instanceof Error ? error.message : String(error);
          setServerIncomeError(msg);
          setServerExpensesError(msg);
          setServerDonationsError(msg);
          setServerTitheBalanceError(msg);
          setServerTotalIncome(null); setServerChomeshAmount(null);
          setServerTotalExpenses(null);
          setServerTotalDonations(null); setServerCalculatedDonationsData(null);
          setServerTitheBalance(null); setServerMaaserBalance(null); setServerChomeshBalance(null);
        } finally {
          setIsLoadingServerIncome(false);
          setIsLoadingServerExpenses(false);
          setIsLoadingServerDonations(false);
          setIsLoadingServerTitheBalance(false);
        }
      };
      loadAll();
    }
  }, [
    user?.id,
    platform,
    activeDateRangeObject,
    setServerTotalIncome,
    setServerChomeshAmount,
    setServerTotalExpenses,
    setServerTotalDonations,
    setServerCalculatedDonationsData,
    setServerTitheBalance,
    setServerMaaserBalance,
    setServerChomeshBalance,
    lastDbFetchTimestamp,
  ]);

  return {
    serverTotalIncome,
    isLoadingServerIncome,
    serverIncomeError,
    serverChomeshAmount,
    serverTotalExpenses,
    isLoadingServerExpenses,
    serverExpensesError,
    serverTotalDonations,
    serverCalculatedDonationsData,
    isLoadingServerDonations,
    serverDonationsError,
    serverTitheBalance,
    serverMaaserBalance,
    serverChomeshBalance,
    isLoadingServerTitheBalance,
    serverTitheBalanceError,
  };
}
