import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
} from "@tanstack/react-router";
import App from "./App";
import { HomePage } from "./pages/HomePage";
import { AddTransactionPage } from "./pages/AddTransactionPage";
import { HalachaPage } from "./pages/HalachaPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AboutPage } from "./pages/AboutPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { TransactionsTable } from "./pages/TransactionsTable";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import UnsubscribePage from "./pages/UnsubscribePage";
import { supabase } from "./lib/supabaseClient";
import { NotFoundPage } from "./pages/NotFoundPage";
import { RecurringTransactionsTable } from "./pages/RecurringTransactionsTable";
import LandingPage from "./pages/LandingPage";

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
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Define public routes that don't require authentication
    const publicRoutes = ["/login", "/signup", "/unsubscribe", "/landing"];

    // Check if the user is trying to access a protected route on the web without a session
    if (!session && !publicRoutes.includes(location.pathname)) {
      // Redirect to the login page
      throw redirect({
        to: "/login", // Target route
        // search: { redirect: location.href }, // Optional: pass original location to redirect back after login
        replace: true, // Replace history entry to avoid back button issues
      });
    }

    // Optional: Redirect logged-in web users away from login/signup pages
    // if (session && publicRoutes.includes(location.pathname)) {
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
  unsubscribeRoute,
  landingRoute,
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
