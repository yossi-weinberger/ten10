export type EmailDirection = "rtl" | "ltr";
export type EmailLanguage = "he" | "en";

export interface EmailShellInput {
  lang: EmailLanguage;
  dir: EmailDirection;
  bodyHtml: string;
  headerSlogan: string;
  footerHtml?: string;
  /** Optional document title (user emails that set `<title>`). */
  title?: string;
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
    /** Body/supporting copy on warm user cards */
    bodyMuted: "#4a5955",
    /** Secondary/footer muted */
    bodyLight: "#6b7471",
    userPage: "#e9e7df",
    userCard: "#f7f3e7",
    userFooter: "#efebdf",
    userCardBorder: "#d4d0c3",
    adminPage: "#f4f3ed",
    adminFooter: "#e9eae4",
    adminMeta: "#68736f",
    adminFooterText: "#727b78",
    adminTitle: "#173e3e",
    adminLabel: "#43514d",
    adminValue: "#53615e",
    adminRowBorder: "#e0ddd2",
    adminMetricBorder: "#d6d9d1",
    creditSurface: "#e8f3ee",
    creditBorder: "#b7d4c6",
    creditBadge: "#d7ebe2",
    successSurface: "#e0eee9",
    dangerSurface: "#fee2e2",
    dangerText: "#991b1b",
    warnSurface: "#fef3c7",
    warnText: "#92400e",
    buttonText: "#fffdf8",
  },
  fontFamily: "Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif",
  logoUrl: "https://ten10-app.com/logo/logo-wide.png",
  headerBackgroundUrl:
    "https://ten10-app.com/email/reminder-header-blur.png",
  userHeaderBackgroundImage:
    "radial-gradient(circle at 105% -10%, rgba(17,103,106,.26), transparent 46%), radial-gradient(circle at -5% 115%, rgba(240,192,0,.31), transparent 42%)",
  adminHeaderBackgroundImage:
    "radial-gradient(circle at 100% 0%, rgba(17,103,106,.20), transparent 50%)",
  userWidth: 600,
  adminWidth: 800,
} as const;
