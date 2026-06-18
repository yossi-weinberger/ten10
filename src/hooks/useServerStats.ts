import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useDonationStore } from "@/lib/store";
import {
  fetchAnalyticsRangeStats,
  fetchServerTitheBalance,
  ServerDonationData,
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
  // Consolidate all store selectors into a single subscription using useShallow.
  // Previously 17 individual selectors caused re-renders on any unrelated store change.
  const {
    serverTotalIncome,
    setServerTotalIncome,
    serverChomeshAmount,
    setServerChomeshAmount,
    serverTotalExpenses,
    setServerTotalExpenses,
    serverTotalDonations,
    setServerTotalDonations,
    serverCalculatedDonationsData,
    setServerCalculatedDonationsData,
    serverTitheBalance,
    setServerTitheBalance,
    serverMaaserBalance,
    setServerMaaserBalance,
    serverChomeshBalance,
    setServerChomeshBalance,
    lastDbFetchTimestamp,
  } = useDonationStore(
    useShallow((state) => ({
      serverTotalIncome: state.serverCalculatedTotalIncome,
      setServerTotalIncome: state.setServerCalculatedTotalIncome,
      serverChomeshAmount: state.serverCalculatedChomeshAmount,
      setServerChomeshAmount: state.setServerCalculatedChomeshAmount,
      serverTotalExpenses: state.serverCalculatedTotalExpenses,
      setServerTotalExpenses: state.setServerCalculatedTotalExpenses,
      serverTotalDonations: state.serverCalculatedTotalDonations,
      setServerTotalDonations: state.setServerCalculatedTotalDonations,
      serverCalculatedDonationsData: state.serverCalculatedDonationsData,
      setServerCalculatedDonationsData: state.setServerCalculatedDonationsData,
      serverTitheBalance: state.serverCalculatedTitheBalance,
      setServerTitheBalance: state.setServerCalculatedTitheBalance,
      serverMaaserBalance: state.serverCalculatedMaaserBalance,
      setServerMaaserBalance: state.setServerCalculatedMaaserBalance,
      serverChomeshBalance: state.serverCalculatedChomeshBalance,
      setServerChomeshBalance: state.setServerCalculatedChomeshBalance,
      lastDbFetchTimestamp: state.lastDbFetchTimestamp,
    }))
  );

  const [isLoadingServerIncome, setIsLoadingServerIncome] = useState(false);
  const [serverIncomeError, setServerIncomeError] = useState<string | null>(
    null
  );
  const [isLoadingServerExpenses, setIsLoadingServerExpenses] = useState(false);
  const [serverExpensesError, setServerExpensesError] = useState<string | null>(
    null
  );
  const [isLoadingServerDonations, setIsLoadingServerDonations] =
    useState(false);
  const [serverDonationsError, setServerDonationsError] = useState<
    string | null
  >(null);
  const [isLoadingServerTitheBalance, setIsLoadingServerTitheBalance] =
    useState(false);
  const [serverTitheBalanceError, setServerTitheBalanceError] = useState<
    string | null
  >(null);

  // ─── Range-dependent stats: income, expenses, donations ──────────────────
  // Re-fetches whenever the active date range, user, or DB changes.
  useEffect(() => {
    const effectiveUserId = platform === "web" ? user?.id || null : null;
    const canFetch = (platform === "web" && effectiveUserId) || platform === "desktop";
    const isWebNoUser = platform === "web" && !effectiveUserId;
    const rangeStatsFetchError = "Failed to load analytics range stats.";
    const clearRangeStats = () => {
      setServerTotalIncome(null);
      setServerChomeshAmount(null);
      setServerTotalExpenses(null);
      setServerTotalDonations(null);
      setServerCalculatedDonationsData(null);
    };

    if (isWebNoUser) {
      clearRangeStats();
      setIsLoadingServerIncome(false);
      setServerIncomeError(null);
      setIsLoadingServerExpenses(false);
      setServerExpensesError(null);
      setIsLoadingServerDonations(false);
      setServerDonationsError(null);
      return;
    }

    if (canFetch && activeDateRangeObject.startDate && activeDateRangeObject.endDate) {
      let cancelled = false;

      const loadRangeStats = async () => {
        setIsLoadingServerIncome(true);
        setIsLoadingServerExpenses(true);
        setIsLoadingServerDonations(true);
        setServerIncomeError(null);
        setServerExpensesError(null);
        setServerDonationsError(null);

        try {
          // Single combined RPC/command instead of 3 separate round-trips.
          // auth.uid() / platform detection is handled inside fetchAnalyticsRangeStats.
          const stats = await fetchAnalyticsRangeStats(
            activeDateRangeObject.startDate,
            activeDateRangeObject.endDate
          );

          if (cancelled) return;

          if (!stats) {
            clearRangeStats();
            setServerIncomeError(rangeStatsFetchError);
            setServerExpensesError(rangeStatsFetchError);
            setServerDonationsError(rangeStatsFetchError);
            return;
          }

          setServerTotalIncome(stats.total_income);
          setServerChomeshAmount(stats.chomesh_amount);
          setServerTotalExpenses(stats.total_expenses);
          const donationsData: ServerDonationData = {
            total_donations_amount: stats.total_donations,
            non_tithe_donation_amount: stats.non_tithe_donation_amount,
          };
          setServerCalculatedDonationsData(donationsData);
          setServerTotalDonations(stats.total_donations);
        } catch (err) {
          if (cancelled) return;

          const msg = err instanceof Error ? err.message : String(err);
          logger.error("useServerStats: range stats fetch failed:", err);
          setServerIncomeError(msg);
          setServerExpensesError(msg);
          setServerDonationsError(msg);
          clearRangeStats();
        } finally {
          if (cancelled) return;

          setIsLoadingServerIncome(false);
          setIsLoadingServerExpenses(false);
          setIsLoadingServerDonations(false);
        }
      };

      void loadRangeStats();

      return () => {
        cancelled = true;
      };
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
    lastDbFetchTimestamp,
  ]);

  // ─── Tithe balance — date-range INDEPENDENT ───────────────────────────────
  // The tithe balance is a cumulative all-time figure, not filtered by range.
  // Re-fetches only when the user identity, platform, or DB content changes.
  useEffect(() => {
    const effectiveUserId = platform === "web" ? user?.id || null : null;
    const canFetch = (platform === "web" && effectiveUserId) || platform === "desktop";
    const isWebNoUser = platform === "web" && !effectiveUserId;

    if (isWebNoUser) {
      setServerTitheBalance(null); setServerMaaserBalance(null); setServerChomeshBalance(null);
      setIsLoadingServerTitheBalance(false); setServerTitheBalanceError(null);
      return;
    }
    if (!canFetch) return;

    setIsLoadingServerTitheBalance(true);
    setServerTitheBalanceError(null);

    fetchServerTitheBalance(effectiveUserId)
      .then((titheData) => {
        if (titheData) {
          setServerTitheBalance(titheData.total_balance);
          setServerMaaserBalance(titheData.maaser_balance);
          setServerChomeshBalance(titheData.chomesh_balance);
        } else {
          setServerTitheBalance(null); setServerMaaserBalance(null); setServerChomeshBalance(null);
        }
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("useServerStats: tithe balance fetch failed:", err);
        setServerTitheBalanceError(msg);
        setServerTitheBalance(null); setServerMaaserBalance(null); setServerChomeshBalance(null);
      })
      .finally(() => setIsLoadingServerTitheBalance(false));
  }, [
    user?.id,
    platform,
    lastDbFetchTimestamp,
    setServerTitheBalance,
    setServerMaaserBalance,
    setServerChomeshBalance,
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
