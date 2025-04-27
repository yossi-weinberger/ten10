import { create } from "zustand";
import { persist } from "zustand/middleware";

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
}

export interface Income {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency?: Currency;
  isChomesh: boolean;
  isRecurring: boolean;
  recurringDay?: number;
}

export interface Donation {
  id: string;
  date: string;
  recipient: string;
  amount: number;
  currency?: Currency;
  isRecurring: boolean;
  recurringDay?: number;
}

interface DonationState {
  incomes: Income[];
  donations: Donation[];
  requiredDonation: number;
  settings: Settings;
  addIncome: (income: Income) => void;
  addDonation: (donation: Donation) => void;
  removeIncome: (id: string) => void;
  removeDonation: (id: string) => void;
  updateIncome: (id: string, income: Partial<Income>) => void;
  updateDonation: (id: string, donation: Partial<Donation>) => void;
  updateSettings: (settings: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
  calendarType: "gregorian",
  theme: "system",
  language: "he",
  defaultCurrency: "ILS",
  notifications: true,
  autoCalcChomesh: true,
  recurringDonations: true,
};

export const useDonationStore = create<DonationState>()(
  persist(
    (set, get) => ({
      incomes: [],
      donations: [],
      requiredDonation: 0,
      settings: defaultSettings,

      addIncome: (income) => {
        set((state) => {
          const newIncomes = [
            ...state.incomes,
            {
              ...income,
              currency: income.currency || state.settings.defaultCurrency,
            },
          ];
          const additionalRequired = income.isChomesh
            ? income.amount * 0.2
            : income.amount * 0.1;
          return {
            incomes: newIncomes,
            requiredDonation: state.requiredDonation + additionalRequired,
          };
        });
      },

      addDonation: (donation) => {
        set((state) => {
          const newDonations = [
            ...state.donations,
            {
              ...donation,
              currency: donation.currency || state.settings.defaultCurrency,
            },
          ];
          return {
            donations: newDonations,
            requiredDonation: Math.max(
              0,
              state.requiredDonation - donation.amount
            ),
          };
        });
      },

      removeIncome: (id) => {
        set((state) => {
          const income = state.incomes.find((i) => i.id === id);
          if (!income) return state;

          const reducedRequired = income.isChomesh
            ? income.amount * 0.2
            : income.amount * 0.1;
          return {
            incomes: state.incomes.filter((i) => i.id !== id),
            requiredDonation: Math.max(
              0,
              state.requiredDonation - reducedRequired
            ),
          };
        });
      },

      removeDonation: (id) => {
        set((state) => {
          const donation = state.donations.find((d) => d.id === id);
          if (!donation) return state;

          return {
            donations: state.donations.filter((d) => d.id !== id),
            requiredDonation: state.requiredDonation + donation.amount,
          };
        });
      },

      updateIncome: (id, updatedIncome) => {
        set((state) => {
          const oldIncome = state.incomes.find((i) => i.id === id);
          if (!oldIncome) return state;

          const oldRequired = oldIncome.isChomesh
            ? oldIncome.amount * 0.2
            : oldIncome.amount * 0.1;
          const newRequired =
            updatedIncome.isChomesh ?? oldIncome.isChomesh
              ? (updatedIncome.amount ?? oldIncome.amount) * 0.2
              : (updatedIncome.amount ?? oldIncome.amount) * 0.1;

          return {
            incomes: state.incomes.map((income) =>
              income.id === id ? { ...income, ...updatedIncome } : income
            ),
            requiredDonation:
              state.requiredDonation - oldRequired + newRequired,
          };
        });
      },

      updateDonation: (id, updatedDonation) => {
        set((state) => {
          const oldDonation = state.donations.find((d) => d.id === id);
          if (!oldDonation) return state;

          const amountDiff =
            (updatedDonation.amount ?? oldDonation.amount) - oldDonation.amount;

          return {
            donations: state.donations.map((donation) =>
              donation.id === id
                ? { ...donation, ...updatedDonation }
                : donation
            ),
            requiredDonation: Math.max(0, state.requiredDonation - amountDiff),
          };
        });
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },
    }),
    {
      name: "tenten-donation-store",
    }
  )
);
