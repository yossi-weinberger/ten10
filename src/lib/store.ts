import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  Transaction,
  Currency as TransactionCurrency,
} from "../types/transaction";
import { ServerIncomeData } from "./data-layer/analytics.service";
import { ServerDonationData } from "./data-layer/stats.service";
import { MonthlyDataPoint } from "./data-layer/chart.service";

export type { TransactionCurrency as Currency };

export type CalendarType = "gregorian" | "hebrew";
export type Language = "he" | "en";

export interface Settings {
  calendarType: CalendarType;
  theme: "light" | "dark" | "system";
  language: Language;
  defaultCurrency: TransactionCurrency;
  notifications: boolean;
  autoCalcChomesh: boolean;
  recurringDonations: boolean;
  minMaaserPercentage?: number;
  maaserYearStart?: string;
}

export interface DonationState {
  serverCalculatedTitheBalance?: number | null;
  settings: Settings;
  lastDbFetchTimestamp: number | null;
  _hasHydrated: boolean;
  serverCalculatedTotalIncome?: number | null;
  serverCalculatedChomeshAmount?: number | null;
  serverCalculatedTotalExpenses?: number | null;
  serverCalculatedTotalDonations: number | null;
  serverCalculatedDonationsData: ServerDonationData | null;
  serverMonthlyChartData: MonthlyDataPoint[];
  currentChartEndDate: string | null;
  isLoadingServerMonthlyChartData: boolean;
  serverMonthlyChartDataError: string | null;
  canLoadMoreChartData: boolean;
  updateSettings: (settings: Partial<Settings>) => void;
  setLastDbFetchTimestamp: (timestamp: number | null) => void;
  setHasHydrated: (status: boolean) => void;
  setServerCalculatedTitheBalance: (balance: number | null) => void;
  setServerCalculatedTotalIncome: (totalIncome: number | null) => void;
  setServerCalculatedChomeshAmount: (chomeshAmount: number | null) => void;
  setServerCalculatedTotalExpenses: (totalExpenses: number | null) => void;
  setServerCalculatedTotalDonations: (total: number | null) => void;
  setServerCalculatedDonationsData: (data: ServerDonationData | null) => void;
  setServerMonthlyChartData: (
    data: MonthlyDataPoint[],
    prepend: boolean
  ) => void;
  setCurrentChartEndDate: (date: string | null) => void;
  setIsLoadingServerMonthlyChartData: (loading: boolean) => void;
  setServerMonthlyChartDataError: (error: string | null) => void;
  setCanLoadMoreChartData: (canLoad: boolean) => void;
}

const defaultSettings: Settings = {
  calendarType: "gregorian",
  theme: "system",
  language: "he",
  defaultCurrency: "ILS",
  notifications: true,
  autoCalcChomesh: false,
  recurringDonations: true,
  minMaaserPercentage: 10,
  maaserYearStart: "01-01",
};

export const useDonationStore = create<DonationState>()(
  persist(
    (set, get) => ({
      serverCalculatedTitheBalance: null,
      settings: defaultSettings,
      lastDbFetchTimestamp: null,
      _hasHydrated: false,
      serverCalculatedTotalIncome: null,
      serverCalculatedChomeshAmount: null,
      serverCalculatedTotalExpenses: null,
      serverCalculatedTotalDonations: null,
      serverCalculatedDonationsData: null,
      serverMonthlyChartData: [],
      currentChartEndDate: null,
      isLoadingServerMonthlyChartData: false,
      serverMonthlyChartDataError: null,
      canLoadMoreChartData: true,

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      setLastDbFetchTimestamp: (timestamp) => {
        set(() => ({ lastDbFetchTimestamp: timestamp }));
      },

      setHasHydrated: (status) => {
        set(() => ({ _hasHydrated: status }));
      },

      setServerCalculatedTitheBalance: (balance) =>
        set({ serverCalculatedTitheBalance: balance }),

      setServerCalculatedTotalIncome: (totalIncome) =>
        set({ serverCalculatedTotalIncome: totalIncome }),

      setServerCalculatedChomeshAmount: (chomeshAmount) =>
        set({ serverCalculatedChomeshAmount: chomeshAmount }),

      setServerCalculatedTotalExpenses: (totalExpenses) =>
        set({ serverCalculatedTotalExpenses: totalExpenses }),

      setServerCalculatedTotalDonations: (total) =>
        set({ serverCalculatedTotalDonations: total }),

      setServerCalculatedDonationsData: (data) =>
        set({ serverCalculatedDonationsData: data }),

      setServerMonthlyChartData: (
        data: MonthlyDataPoint[],
        prepend: boolean
      ) => {
        console.log(
          "[Store] setServerMonthlyChartData called. Prepend:",
          prepend,
          "New data length:",
          data.length,
          "New data:",
          JSON.parse(JSON.stringify(data))
        );
        set((state) => {
          console.log(
            "[Store] Current serverMonthlyChartData length:",
            state.serverMonthlyChartData.length,
            "Current data:",
            JSON.parse(JSON.stringify(state.serverMonthlyChartData))
          );

          // Filter out duplicates from the new data based on existing month_labels if prepending or potentially if initial load might refetch
          const existingLabels = new Set(
            state.serverMonthlyChartData.map((d) => d.month_label)
          );
          const uniqueNewData = data.filter(
            (d) => !existingLabels.has(d.month_label) || !prepend
          ); // if not prepending, we typically want to overwrite with new data anyway

          console.log(
            "[Store] Unique new data to be added/set:",
            JSON.parse(JSON.stringify(uniqueNewData))
          );

          if (prepend) {
            // for 'loadMore' which loads older data
            // Ensure uniqueNewData only contains items not already in state if there's an overlap concern during prepend
            const trulyNewDataForPrepend = uniqueNewData.filter(
              (d) => !existingLabels.has(d.month_label)
            );
            if (trulyNewDataForPrepend.length !== uniqueNewData.length) {
              console.warn(
                "[Store] Some data in prepend was already present and filtered out again."
              );
            }
            console.log(
              "[Store] Prepending data. Current length:",
              state.serverMonthlyChartData.length,
              "Adding:",
              trulyNewDataForPrepend.length
            );
            return {
              serverMonthlyChartData: [
                ...trulyNewDataForPrepend,
                ...state.serverMonthlyChartData,
              ],
            };
          } else {
            // for initial load or refresh
            console.log(
              "[Store] Setting new data (overwrite). Length:",
              data.length
            );
            return { serverMonthlyChartData: data }; // Overwrite with the new data (original data, not uniqueNewData if it's an overwrite)
          }
        });
      },

      setCurrentChartEndDate: (date) => set({ currentChartEndDate: date }),

      setIsLoadingServerMonthlyChartData: (loading) =>
        set({ isLoadingServerMonthlyChartData: loading }),

      setServerMonthlyChartDataError: (error) =>
        set({ serverMonthlyChartDataError: error }),

      setCanLoadMoreChartData: (canLoad) =>
        set({ canLoadMoreChartData: canLoad }),
    }),
    {
      name: "Ten10-donation-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        _hasHydrated: state._hasHydrated,
        lastDbFetchTimestamp: state.lastDbFetchTimestamp,
      }),
      onRehydrateStorage: () => {
        console.log("Zustand hydration process started/attempted.");
        return (state, error) => {
          if (error) {
            console.error(
              "Zustand: An error occurred during rehydration:",
              error
            );
          } else if (state) {
            console.log("Zustand: Rehydration finished.");
            state.setHasHydrated(true);
          } else {
            console.log(
              "Zustand: Rehydration completed, but no persisted state was found or state is undefined."
            );
            useDonationStore.setState({ _hasHydrated: true });
          }
        };
      },
    }
  )
);
