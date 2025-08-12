import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpApi from "i18next-http-backend";

// Using the default i18n instance from i18next, with a type-safe cast
const i18n = i18next as unknown as import("i18next").i18n;

(i18n as any)
  .use(HttpApi) // Load translations via http
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // pass the i18n instance to react-i18next.
  .init({
    supportedLngs: ["en", "he"],
    fallbackLng: "he",
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
      "halacha-common",
      "halacha-introduction",
      "halacha-faq",
      "halacha-tithes",
      "halacha-income",
      "halacha-expenses",
      "halacha-principles",
      "halacha-chomesh",
    ],
    defaultNS: "common",

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
