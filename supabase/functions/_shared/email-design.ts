export const EMAIL_THEME = {
  colors: {
    primary: "#0d9488", // Teal
    background: "#f8fafc",
    cardBackground: "#ffffff",
    textMain: "#374151", // Gray 700
    textSecondary: "#4b5563", // Gray 600
    textLight: "#6b7280", // Gray 500
    border: "#e5e7eb", // Gray 200
    success: {
      bg: "#f0fdf4",
      border: "#bbf7d0",
      text: "#166534",
    },
    warning: {
      bg: "#fef3c7",
      border: "#fde68a",
      text: "#92400e",
    },
    error: {
      bg: "#fee2e2",
      border: "#fecaca",
      text: "#991b1b",
    },
  },
  fonts: {
    main: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  logo: {
    url: "https://ten10-app.com/logo/logo-wide.png",
    height: "60px",
  },
};

export const SLOGANS = {
  he: "ניהול מעשרות ותקציב פיננסי פשוט ומדויק",
  en: "Simple and Accurate Tithe and Financial Budget Management",
};

export function getEmailHeader(lang: "he" | "en" = "he"): string {
  const slogan = lang === "he" ? SLOGANS.he : SLOGANS.en;
  // We use inline styles here to ensure it works even if <style> tags are stripped
  return `
    <div style="background-color: ${EMAIL_THEME.colors.cardBackground}; padding: 40px 20px; text-align: center; border-bottom: 1px solid ${EMAIL_THEME.colors.border};">
      <img src="${EMAIL_THEME.logo.url}" alt="Ten10 Logo" style="height: ${EMAIL_THEME.logo.height}; width: auto; margin-bottom: 10px;">
      <p style="color: ${EMAIL_THEME.colors.primary}; font-size: 14px; margin: 0; font-weight: 500;">${slogan}</p>
    </div>
  `;
}

export function getContainerStyles(dir: "rtl" | "ltr" = "rtl"): string {
  return `
        max-width: 600px; 
        margin: 40px auto; 
        background-color: ${EMAIL_THEME.colors.cardBackground}; 
        border-radius: 16px; 
        overflow: hidden; 
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); 
        border-top: 6px solid ${EMAIL_THEME.colors.primary};
        direction: ${dir};
    `;
}

export function getBodyStyles(dir: "rtl" | "ltr" = "rtl"): string {
  return `
        margin: 0; 
        padding: 0; 
        font-family: ${EMAIL_THEME.fonts.main}; 
        background-color: ${EMAIL_THEME.colors.background}; 
        direction: ${dir};
    `;
}
