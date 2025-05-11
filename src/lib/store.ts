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
  updateSettings: (settings: Partial<Settings>) => void;
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
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
    }),
    {
      name: "Ten10-donation-store",
    }
  )
);

export const selectCalculatedBalance = (state: DonationState): number => {
  return calculateTotalRequiredDonation(state.transactions);
};
