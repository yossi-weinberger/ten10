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
    logger.log(
      `useServerStats useEffect triggered. Platform: ${platform}, UserID: ${effectiveUserId}, DateRange: ${activeDateRangeObject.startDate}-${activeDateRangeObject.endDate}, Timestamp: ${lastDbFetchTimestamp}`
    );

    if (activeDateRangeObject.startDate && activeDateRangeObject.endDate) {
      if ((platform === "web" && effectiveUserId) || platform === "desktop") {
        const loadTotalIncome = async () => {
          setIsLoadingServerIncome(true);
          setServerIncomeError(null);
          try {
            const incomeData: ServerIncomeData | null =
              await fetchTotalIncomeInRange(
                effectiveUserId,
                activeDateRangeObject.startDate,
                activeDateRangeObject.endDate
              );
            if (incomeData) {
              setServerTotalIncome(incomeData.total_income);
              setServerChomeshAmount(incomeData.chomesh_amount);
            } else {
              setServerTotalIncome(null);
              setServerChomeshAmount(null);
            }
          } catch (error) {
            logger.error(
              "useServerStats: Failed to fetch server total income:",
              error
            );
            setServerIncomeError(
              error instanceof Error ? error.message : String(error)
            );
            setServerTotalIncome(null);
            setServerChomeshAmount(null);
          }
          setIsLoadingServerIncome(false);
        };
        loadTotalIncome();
      } else if (platform === "web" && !effectiveUserId) {
        // logger.warn(
        //   "useServerStats: Web platform detected but no user ID available. Skipping server income fetch."
        // );
        setServerTotalIncome(null);
        setServerChomeshAmount(null);
        setIsLoadingServerIncome(false);
        setServerIncomeError(null);
      }

      if ((platform === "web" && effectiveUserId) || platform === "desktop") {
        const loadTotalExpenses = async () => {
          setIsLoadingServerExpenses(true);
          setServerExpensesError(null);
          try {
            // logger.log(
            //   `useServerStats: Fetching server expenses. User: ${effectiveUserId}, Range: ${activeDateRangeObject.startDate}-${activeDateRangeObject.endDate}, Platform: ${platform}`
            // );
            const expensesData: number | null = await fetchTotalExpensesInRange(
              effectiveUserId,
              activeDateRangeObject.startDate,
              activeDateRangeObject.endDate
            );
            setServerTotalExpenses(expensesData);
          } catch (error) {
            logger.error(
              "useServerStats: Failed to fetch server total expenses:",
              error
            );
            setServerExpensesError(
              error instanceof Error ? error.message : String(error)
            );
            setServerTotalExpenses(null);
          }
          setIsLoadingServerExpenses(false);
        };
        loadTotalExpenses();
      } else if (platform === "web" && !effectiveUserId) {
        // logger.warn(
        //   "useServerStats: Web platform detected but no user ID available. Skipping server expenses fetch."
        // );
        setServerTotalExpenses(null);
        setIsLoadingServerExpenses(false);
        setServerExpensesError(null);
      }

      if ((platform === "web" && effectiveUserId) || platform === "desktop") {
        const loadTotalDonations = async () => {
          setIsLoadingServerDonations(true);
          setServerDonationsError(null);
          try {
            // logger.log(
            //   `useServerStats: Fetching server donations. User: ${effectiveUserId}, Range: ${activeDateRangeObject.startDate}-${activeDateRangeObject.endDate}, Platform: ${platform}`
            // );
            const donationsData: ServerDonationData | null =
              await fetchTotalDonationsInRange(
                effectiveUserId,
                activeDateRangeObject.startDate,
                activeDateRangeObject.endDate
              );
            setServerCalculatedDonationsData(donationsData);

            if (donationsData) {
              setServerTotalDonations(donationsData.total_donations_amount);
            } else {
              setServerTotalDonations(null);
            }
          } catch (error) {
            logger.error(
              "useServerStats: Failed to fetch server total donations:",
              error
            );
            setServerDonationsError(
              error instanceof Error ? error.message : String(error)
            );
            setServerCalculatedDonationsData(null);
          }
          setIsLoadingServerDonations(false);
        };
        loadTotalDonations();
      } else if (platform === "web" && !effectiveUserId) {
        // logger.warn(
        //   "useServerStats: Web platform detected but no user ID available. Skipping server donations fetch."
        // );
        setServerTotalDonations(null);
        setIsLoadingServerDonations(false);
        setServerDonationsError(null);
      }
    }

    if ((platform === "web" && effectiveUserId) || platform === "desktop") {
      const loadServerTitheBalance = async () => {
        setIsLoadingServerTitheBalance(true);
        setServerTitheBalanceError(null);
        try {
          const balanceData: TitheBalanceBreakdown | null =
            await fetchServerTitheBalance(effectiveUserId);
          if (balanceData) {
            setServerTitheBalance(balanceData.total_balance);
            setServerMaaserBalance(balanceData.maaser_balance);
            setServerChomeshBalance(balanceData.chomesh_balance);
          } else {
            setServerTitheBalance(null);
            setServerMaaserBalance(null);
            setServerChomeshBalance(null);
          }
        } catch (error) {
          logger.error(
            "useServerStats: Failed to fetch server overall tithe balance:",
            error
          );
          setServerTitheBalanceError(
            error instanceof Error ? error.message : String(error)
          );
          setServerTitheBalance(null);
          setServerMaaserBalance(null);
          setServerChomeshBalance(null);
        }
        setIsLoadingServerTitheBalance(false);
      };
      loadServerTitheBalance();
    } else if (platform === "web" && !effectiveUserId) {
      setServerTitheBalance(null);
      setServerMaaserBalance(null);
      setServerChomeshBalance(null);
      setIsLoadingServerTitheBalance(false);
      setServerTitheBalanceError(null);
    }
  }, [
    user,
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
