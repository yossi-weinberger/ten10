import { useDonationStore, Income, Donation, Currency } from "./store";
import { PlatformContextType } from "@/contexts/PlatformContext";
import { invoke } from "@tauri-apps/api";

// פונקציה לקבלת הפלטפורמה (יש להפעיל אותה מהקומפוננטה הראשית)
let currentPlatform: PlatformContextType["platform"] = "loading";
export function setDataServicePlatform(
  platform: PlatformContextType["platform"]
) {
  currentPlatform = platform;
}

// --- CRUD API ---

export async function addIncome(income: Income) {
  console.log("Current platform in addIncome:", currentPlatform);
  if (currentPlatform === "desktop") {
    try {
      console.log("Attempting to add income via Tauri invoke...");
      const result = await invoke("add_income", { income });
      console.log("Tauri invoke add_income successful:", result);
      useDonationStore.getState().addIncome(income);
      return result;
    } catch (error) {
      console.error("Error invoking add_income:", error);
      throw error; // Re-throw the error so the caller knows something went wrong
    }
  } else {
    // שמירה ב-store (web)
    useDonationStore.getState().addIncome(income);
  }
}

export async function addDonation(donation: Donation) {
  console.log("Current platform in addDonation:", currentPlatform);
  if (currentPlatform === "desktop") {
    try {
      console.log("Attempting to add donation via Tauri invoke...");
      const result = await invoke("add_donation", { donation });
      console.log("Tauri invoke add_donation successful:", result);
      useDonationStore.getState().addDonation(donation);
      return result;
    } catch (error) {
      console.error("Error invoking add_donation:", error);
      throw error; // Re-throw the error so the caller knows something went wrong
    }
  } else {
    useDonationStore.getState().addDonation(donation);
  }
}

// אפשר להוסיף כאן גם getIncomes, getDonations, removeIncome וכו' בעתיד

// דוגמה ל-get (כרגע מה-store בלבד)
export function getIncomes() {
  return useDonationStore.getState().incomes;
}

export function getDonations() {
  return useDonationStore.getState().donations;
}

export async function clearAllData() {
  console.log("Attempting to clear all data...");
  if (currentPlatform === "desktop") {
    try {
      console.log("Invoking clear_all_data...");
      await invoke("clear_all_data");
      console.log("SQLite data cleared successfully via invoke.");
    } catch (error) {
      console.error("Error invoking clear_all_data:", error);
      // Decide if you want to proceed with clearing the store even if DB clear failed
      // For now, let's throw to prevent clearing store if DB failed
      throw error;
    }
  } else {
    // Placeholder for web - call cloud API endpoint in the future
    console.log("TODO: Call cloud API to clear user data.");
    // Simulate async operation for now
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Clear the Zustand store regardless of platform, after platform-specific action succeeded
  console.log("Clearing Zustand store...");
  useDonationStore.setState({
    incomes: [],
    donations: [],
    requiredDonation: 0, // Resetting this as well
  });
  console.log("Zustand store cleared.");
}
