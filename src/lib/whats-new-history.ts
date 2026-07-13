// Controls when users see the "What's New" modal again.
// This is intentionally separate from package.json because not every app release
// needs fresh release notes.
export const CURRENT_WHATS_NEW_VERSION = "0.7.0";

export interface WhatsNewHistoryRelease {
  version: string;
  date: string;
  translationKey: string;
  itemKeys: string[];
}

export const whatsNewHistory: WhatsNewHistoryRelease[] = [
  {
    // Listed on Changelog page only — CURRENT_WHATS_NEW_VERSION stays 0.7.0 (no popup).
    version: "0.7.3",
    date: "2026-07-13",
    translationKey: "v073",
    itemKeys: [
      "recurringBillingDay",
      "homeFeedback",
      "toastRefresh",
      "landingPolish",
    ],
  },
  {
    version: "0.7.0",
    date: "2026-05-13",
    translationKey: "v070",
    itemKeys: ["spreadsheetImport", "guidedWizard", "safeReview"],
  },
  {
    version: "0.6.4",
    date: "2026-04-29",
    translationKey: "v064",
    itemKeys: ["backupImport", "duplicateDetection"],
  },
  {
    version: "0.6.2",
    date: "2026-03-30",
    translationKey: "v062",
    itemKeys: ["financialDashboard", "pdfExport"],
  },
  {
    version: "0.6.1",
    date: "2026-03-11",
    translationKey: "v061",
    itemKeys: ["separateChomesh", "settingsSaving", "recurringFixes"],
  },
  {
    version: "0.5.7",
    date: "2026-02-11",
    translationKey: "v057",
    itemKeys: ["paymentMethod", "desktopLock", "desktopImprovements"],
  },
  {
    version: "0.5.4",
    date: "2026-01-27",
    translationKey: "v054",
    itemKeys: ["categories", "manualOpen", "responsiveLayout"],
  },
  {
    version: "0.5.1",
    date: "2026-01-25",
    translationKey: "v051",
    itemKeys: ["modal", "stability"],
  },
  {
    version: "0.5.0",
    date: "2026-01-22",
    translationKey: "v050",
    itemKeys: ["currencyConversion", "defaultCurrency", "localizedFormatting"],
  },
  {
    version: "0.4.9",
    date: "2026-01-18",
    translationKey: "v049",
    itemKeys: ["openingBalance", "autoChomesh"],
  },
  {
    version: "0.4.0",
    date: "2025-12-25",
    translationKey: "v040",
    itemKeys: ["bilingualInterface", "localizedDashboard"],
  },
  {
    version: "0.3.0",
    date: "2025-11-09",
    translationKey: "v030",
    itemKeys: ["desktopUpdates", "releaseManagement"],
  },
  {
    version: "0.2.9",
    date: "2025-09-08",
    translationKey: "v029",
    itemKeys: ["monthlyReminders", "desktopNotifications"],
  },
  {
    version: "0.2.8",
    date: "2025-08-14",
    translationKey: "v028",
    itemKeys: ["halachaLibrary", "halachaContent"],
  },
  {
    version: "0.2.6",
    date: "2025-07-20",
    translationKey: "v026",
    itemKeys: ["recurringPage", "recurringEditing", "recurringDesktop"],
  },
  {
    version: "0.2.5",
    date: "2025-05-09",
    translationKey: "v025",
    itemKeys: ["desktopPersistence", "importExportBackup"],
  },
];
