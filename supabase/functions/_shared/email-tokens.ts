export type EmailDirection = "rtl" | "ltr";
export type EmailLanguage = "he" | "en";

export interface EmailShellInput {
  lang: EmailLanguage;
  dir: EmailDirection;
  bodyHtml: string;
  headerSlogan: string;
  footerHtml?: string;
  /** Optional raw markup inserted into `<head>` (e.g. responsive style tags). */
  headHtml?: string;
  maxWidth?: 600 | 800;
}

export const EMAIL_TOKENS = {
  colors: {
    teal: "#11676a",
    gold: "#f0c000",
    cream: "#f9f6eb",
    surface: "#fffdf8",
    border: "#ded9ca",
    text: "#243834",
    mutedText: "#596662",
  },
  fontFamily: "Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif",
  logoUrl: "https://ten10-app.com/logo/logo-wide.png",
  headerBackgroundUrl:
    "https://ten10-app.com/email/reminder-header-blur.png",
  userWidth: 600,
  adminWidth: 800,
} as const;
