declare module "tailwindcss-rtl";

// Add i18n dir method declaration
declare module "i18next" {
  interface i18n {
    dir(lng?: string): "ltr" | "rtl";
    // Ensure TS knows about common properties we use
    t: import("i18next").TFunction;
    language: string;
  }
}

// Vite environment variables
interface ImportMetaEnv {
  readonly VITE_G_ANALYTICS_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
