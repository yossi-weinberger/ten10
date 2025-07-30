import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpApi from "i18next-http-backend";

i18n
  .use(HttpApi) // Load translations via http
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // pass the i18n instance to react-i18next.
  .init({
    supportedLngs: ["en", "he"],
    fallbackLng: "he",
    debug: process.env.NODE_ENV === "development",

    // Define namespaces for your translation files
    ns: [
      "settings",
      "halacha-common",
      "halacha-introduction",
      "halacha-faq",
      "halacha-tithes",
      "halacha-income",
      "halacha-expenses",
    ],
    defaultNS: "halacha-common",

    backend: {
      // Path where translation files are stored
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },

    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });

export default i18n;
