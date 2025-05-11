import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Transaction } from "../types/transaction";
import { calculateTotalRequiredDonation } from "./tithe-calculator";

export type Currency = "ILS" | "USD" | "EUR";
export type CalendarType = "gregorian" | "hebrew";
export type Language = "he" | "en";

export interface Settings {
  calendarType: CalendarType;
  theme: "light" | "dark" | "system";
  language: Language;
  defaultCurrency: Currency;
  notifications: boolean;
  autoCalcChomesh: boolean;
  recurringDonations: boolean;
  minMaaserPercentage?: number;
  maaserYearStart?: string;
}

// Income and Donation interfaces removed as they are obsolete

interface DonationState {
  transactions: Transaction[];
  requiredDonation: number;
  settings: Settings;
  lastDbFetchTimestamp?: number | null;
  _hasHydrated: boolean;
  updateSettings: (settings: Partial<Settings>) => void;
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  setLastDbFetchTimestamp: (timestamp: number | null) => void;
  setHasHydrated: (status: boolean) => void;
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

      setLastDbFetchTimestamp: (timestamp) => {
        set(() => ({ lastDbFetchTimestamp: timestamp }));
      },

      setHasHydrated: (status) => {
        set(() => ({ _hasHydrated: status }));
      },
    }),
    {
      name: "Ten10-donation-store",
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
