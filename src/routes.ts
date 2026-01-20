import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
  lazyRouteComponent,
} from "@tanstack/react-router";
import App from "./App";
import { supabase, getCachedSession } from "./lib/supabaseClient";
import { PUBLIC_ROUTES } from "./lib/constants";

// Critical pages loaded synchronously (needed immediately)
import { HomePage } from "./pages/HomePage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import { NotFoundPage } from "./pages/NotFoundPage";

// Lazy-loaded pages for code splitting
const AddTransactionPage = lazyRouteComponent(
  () => import("./pages/AddTransactionPage"),
  "AddTransactionPage"
);
const HalachaPage = lazyRouteComponent(
  () => import("./pages/HalachaPage"),
  "HalachaPage"
);
const SettingsPage = lazyRouteComponent(
  () => import("./pages/SettingsPage"),
  "SettingsPage"
);
const AboutPage = lazyRouteComponent(
  () => import("./pages/AboutPage"),
  "AboutPage"
);
const ProfilePage = lazyRouteComponent(
  () => import("./pages/ProfilePage"),
  "ProfilePage"
);
const AnalyticsPage = lazyRouteComponent(
  () => import("./pages/AnalyticsPage"),
  "AnalyticsPage"
);
const TransactionsTable = lazyRouteComponent(
  () => import("./pages/TransactionsTable"),
  "TransactionsTable"
);
const RecurringTransactionsTable = lazyRouteComponent(
  () => import("./pages/RecurringTransactionsTable"),
  "RecurringTransactionsTable"
);
const ForgotPasswordPage = lazyRouteComponent(
  () => import("./pages/ForgotPasswordPage"),
  "default" // default export
);
const ResetPasswordPage = lazyRouteComponent(
  () => import("./pages/ResetPasswordPage"),
  "default" // default export
);
const UnsubscribePage = lazyRouteComponent(
  () => import("./pages/UnsubscribePage"),
  "default" // default export
);
const PrivacyPage = lazyRouteComponent(
  () => import("./pages/PrivacyPage"),
  "PrivacyPage"
);
const TermsPage = lazyRouteComponent(
  () => import("./pages/TermsPage"),
  "TermsPage"
);
const AccessibilityPage = lazyRouteComponent(
  () => import("./pages/AccessibilityPage"),
  "AccessibilityPage"
);
const AdminDashboardPage = lazyRouteComponent(
  () => import("./pages/AdminDashboardPage"),
  "AdminDashboardPage"
);

const rootRoute = createRootRoute({
  component: App,
  notFoundComponent: NotFoundPage,
  beforeLoad: async ({ location }) => {
    // --- Platform Check ---
    // A simple, synchronous check for the Tauri-injected global.
    // This runs before React components, so we can't use the context/manager here.
    // @ts-expect-error -- this is a Tauri-specific global
    const isDesktop = !!window.__TAURI_INTERNALS__;

    if (isDesktop) {
      return; // Allow access on desktop regardless of auth state
    }

    // --- Web Platform Auth Check ---
    // For public routes, skip the session check entirely to improve load time
    if (PUBLIC_ROUTES.includes(location.pathname)) {
      return; // Skip session check for public routes
    }

    // Use cached session to avoid duplicate network requests (only for protected routes)
    const {
      data: { session },
    } = await getCachedSession();

    // Check if the user is trying to access a protected route on the web without a session
    if (!session) {
      // Redirect to the login page
      throw redirect({
        to: "/login", // Target route
        // search: { redirect: location.href }, // Optional: pass original location to redirect back after login
        replace: true, // Replace history entry to avoid back button issues
      });
    }

    // Optional: Redirect logged-in web users away from login/signup pages
    // if (session && PUBLIC_ROUTES.includes(location.pathname)) {
    //   throw redirect({
    //     to: '/',
    //     replace: true,
    //   });
    // }

    // Allow access if user has session OR is accessing a public route on the web
  },
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const addTransactionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/add-transaction",
  component: AddTransactionPage,
});

const halachaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/halacha",
  component: HalachaPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about",
  component: AboutPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/analytics",
  component: AnalyticsPage,
});

const transactionsTableRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/transactions-table",
  // By omitting the component, this route becomes a "layout-less" or "grouping" route
});

const transactionsTableIndexRoute = createRoute({
  getParentRoute: () => transactionsTableRoute,
  path: "/",
  component: TransactionsTable,
});

const recurringTransactionsRoute = createRoute({
  getParentRoute: () => transactionsTableRoute,
  path: "/recurring-transactions",
  component: RecurringTransactionsTable,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  component: SignupPage,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/forgot-password",
  component: ForgotPasswordPage,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reset-password",
  component: ResetPasswordPage,
});

const unsubscribeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/unsubscribe",
  component: UnsubscribePage,
});

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/landing",
  component: LandingPage,
});

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/privacy",
  component: PrivacyPage,
});

const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/terms",
  component: TermsPage,
});

const accessibilityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/accessibility",
  component: AccessibilityPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminDashboardPage,
  beforeLoad: async () => {
    // Check if on desktop - admin panel is web-only
    // @ts-expect-error -- this is a Tauri-specific global
    const isDesktop = !!window.__TAURI_INTERNALS__;

    if (isDesktop) {
      throw redirect({
        to: "/",
        replace: true,
      });
    }

    // Additional check: Try to fetch admin stats
    // If user is not admin, the RPC will throw an error
    try {
      const { error } = await supabase.rpc("get_admin_dashboard_stats");
      if (error) throw error;
    } catch (error) {
      // Redirect to home if not admin
      throw redirect({
        to: "/",
        replace: true,
      });
    }
  },
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  addTransactionRoute,
  halachaRoute,
  settingsRoute,
  aboutRoute,
  profileRoute,
  analyticsRoute,
  loginRoute,
  signupRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  unsubscribeRoute,
  landingRoute,
  privacyRoute,
  termsRoute,
  accessibilityRoute,
  adminRoute,
  transactionsTableRoute.addChildren([
    transactionsTableIndexRoute,
    recurringTransactionsRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
