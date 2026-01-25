import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpApi from "i18next-http-backend";
import { logger } from "./logger";

// Import critical translations statically (bundled) for instant loading
// These are needed immediately on app startup
import common_en from "../../public/locales/en/common.json";
import common_he from "../../public/locales/he/common.json";
import navigation_en from "../../public/locales/en/navigation.json";
import navigation_he from "../../public/locales/he/navigation.json";
import dashboard_en from "../../public/locales/en/dashboard.json";
import dashboard_he from "../../public/locales/he/dashboard.json";
import auth_en from "../../public/locales/en/auth.json";
import auth_he from "../../public/locales/he/auth.json";
import contact_en from "../../public/locales/en/contact.json";
import contact_he from "../../public/locales/he/contact.json";
import currency_features_en from "../../public/locales/en/currency-features.json";
import currency_features_he from "../../public/locales/he/currency-features.json";

// Read the language from Zustand store if available
const getInitialLanguage = (): string => {
  try {
    const storedData = localStorage.getItem("Ten10-donation-store");
    if (storedData) {
      const parsed = JSON.parse(storedData);
      if (parsed?.state?.settings?.language) {
        return parsed.state.settings.language;
      }
    }
  } catch (error) {
    logger.error("Failed to read language from Zustand store:", error);
  }
  return "he"; // fallback to Hebrew
};

// Bundled resources for critical namespaces (loaded instantly, no HTTP)
const bundledResources = {
  en: {
    common: common_en,
    navigation: navigation_en,
    dashboard: dashboard_en,
    auth: auth_en,
    contact: contact_en,
    "currency-features": currency_features_en,
  },
  he: {
    common: common_he,
    navigation: navigation_he,
    dashboard: dashboard_he,
    auth: auth_he,
    contact: contact_he,
    "currency-features": currency_features_he,
  },
};

// Using the default i18n instance from i18next, with a type-safe cast
const i18n = i18next as unknown as import("i18next").i18n;

(i18n as any)
  .use(HttpApi) // Load non-bundled translations via http (lazy loaded)
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // pass the i18n instance to react-i18next.
  .init({
    supportedLngs: ["en", "he"],
    fallbackLng: "he",
    lng: getInitialLanguage(), // Set initial language from Zustand store
    debug: import.meta.env.DEV,

    // Bundled resources - loaded instantly without HTTP requests
    resources: bundledResources,
    // Allow loading additional namespaces via HTTP backend
    partialBundledLanguages: true,

    // CRITICAL: Only load bundled namespaces at init time
    // Other namespaces will be lazy-loaded when components request them
    ns: ["common", "navigation", "dashboard", "auth", "contact", "currency-features"],
    defaultNS: "common",
    
    // Don't preload all namespaces - let them load on demand
    preload: [],

    // Language detection configuration
    detection: {
      // Order: check Zustand store via localStorage, then browser language, then HTML tag
      order: ["localStorage", "navigator", "htmlTag"],
      // Cache the language selection in localStorage
      caches: ["localStorage"],
      // Use the same key as i18next default to avoid conflicts
      lookupLocalStorage: "i18nextLng",
    },

    backend: {
      // Path where translation files are stored (for lazy-loaded namespaces)
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },

    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });

// Add direction support based on language
(i18n as any).dir = (lng?: string) => {
  const language = lng || i18n.language;
  return language === "he" ? "rtl" : "ltr";
};

export default i18n as import("i18next").i18n;
