import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  Transaction,
  Currency as TransactionCurrency,
} from "../types/transaction";
import { calculateTotalRequiredDonation } from "./tithe-calculator";
import { ServerDonationData } from "./dbStatsCardsService";

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

interface DonationState {
  transactions: Transaction[];
  requiredDonation: number;
  settings: Settings;
  lastDbFetchTimestamp: number | null;
  _hasHydrated: boolean;
  serverCalculatedTitheBalance?: number | null;
  serverCalculatedTotalIncome?: number | null;
  serverCalculatedChomeshAmount?: number | null;
  serverCalculatedTotalExpenses?: number | null;
  serverCalculatedTotalDonations: number | null;
  serverCalculatedDonationsData: ServerDonationData | null;
  updateSettings: (settings: Partial<Settings>) => void;
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  removeTransaction: (id: string) => void;
  updateTransaction: (updatedTransaction: Transaction) => void;
  setLastDbFetchTimestamp: (timestamp: number | null) => void;
  setHasHydrated: (status: boolean) => void;
  setServerCalculatedTitheBalance: (balance: number | null) => void;
  setServerCalculatedTotalIncome: (totalIncome: number | null) => void;
  setServerCalculatedChomeshAmount: (chomeshAmount: number | null) => void;
  setServerCalculatedTotalExpenses: (totalExpenses: number | null) => void;
  setServerCalculatedTotalDonations: (total: number | null) => void;
  setServerCalculatedDonationsData: (data: ServerDonationData | null) => void;
}

const defaultSettings: Settings = {
  calendarType: "gregorian",
  theme: "system",
  language: "he",
  defaultCurrency: "ILS",
  notifications: true,
  autoCalcChomesh: true,
  recurringDonations: true,
  minMaaserPercentage: 10,
  maaserYearStart: "01-01",
};

export const useDonationStore = create<DonationState>()(
  persist(
    (set, get) => ({
      transactions: [],
      requiredDonation: 0,
      settings: defaultSettings,
      lastDbFetchTimestamp: null,
      _hasHydrated: false,
      serverCalculatedTitheBalance: null,
      serverCalculatedTotalIncome: null,
      serverCalculatedChomeshAmount: null,
      serverCalculatedTotalExpenses: null,
      serverCalculatedTotalDonations: null,
      serverCalculatedDonationsData: null,

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      setTransactions: (transactions) => {
        set(() => ({ transactions }));
      },

      addTransaction: (transaction) => {
        set((state) => ({
          transactions: [...state.transactions, transaction],
        }));
      },

      removeTransaction: (id) =>
        set((state) => {
          const newTransactions = state.transactions.filter((t) => t.id !== id);
          const newRequiredDonation =
            calculateTotalRequiredDonation(newTransactions);
          return {
            transactions: newTransactions,
            requiredDonation: newRequiredDonation,
          };
        }),

      updateTransaction: (updatedTransaction) =>
        set((state) => {
          const newTransactions = state.transactions.map((t) =>
            t.id === updatedTransaction.id ? updatedTransaction : t
          );
          const newRequiredDonation =
            calculateTotalRequiredDonation(newTransactions);
          return {
            transactions: newTransactions,
            requiredDonation: newRequiredDonation,
          };
        }),

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

export const selectCalculatedBalance = (state: DonationState): number => {
  return calculateTotalRequiredDonation(state.transactions);
};
