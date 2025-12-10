import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpApi from "i18next-http-backend";
import { logger } from "./logger";
import contact from "../../public/locales/en/contact.json";
import contact_he from "../../public/locales/he/contact.json";

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

// Using the default i18n instance from i18next, with a type-safe cast
const i18n = i18next as unknown as import("i18next").i18n;

(i18n as any)
  .use(HttpApi) // Load translations via http
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // pass the i18n instance to react-i18next.
  .init({
    supportedLngs: ["en", "he"],
    fallbackLng: "he",
    lng: getInitialLanguage(), // Set initial language from Zustand store
    debug: process.env.NODE_ENV === "development",

    // Define namespaces for your translation files
    ns: [
      "common",
      "navigation",
      "dashboard",
      "transactions",
      "data-tables",
      "settings",
      "auth",
      "about",
      "landing",
      "halacha-common",
      "halacha-introduction",
      "halacha-faq",
      "halacha-tithes",
      "halacha-income",
      "halacha-expenses",
      "halacha-principles",
      "halacha-chomesh",
      "contact",
      "admin",
    ],
    defaultNS: "common",

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
      // Path where translation files are stored
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
