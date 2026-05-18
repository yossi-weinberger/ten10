declare module "tailwindcss-rtl";

// Add i18n dir method declaration
declare module "i18next" {
  interface i18n {
    dir(lng?: string): "ltr" | "rtl";
    loadNamespaces(ns: string | readonly string[]): Promise<void>;
    // Workaround: bundler moduleResolution doesn't resolve ./index.js imports
    // inside index.d.mts, so these properties from index.d.ts are invisible
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

declare global {
  interface Window {
    __TAURI_INTERNALS__?: Record<string, unknown>;
  }
}
