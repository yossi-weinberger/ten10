// Routes that are accessible without authentication
export const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/unsubscribe",
  "/landing",
  "/privacy",
  "/terms",
  "/accessibility",
];

// Routes that should ALWAYS be full screen (no sidebar), regardless of auth state
export const FULL_SCREEN_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/landing",
];
