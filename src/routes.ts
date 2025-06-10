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
import { supabase } from "./lib/supabaseClient";
import { isTauri } from "@tauri-apps/api/core";

const rootRoute = createRootRoute({
  component: App,
  beforeLoad: async ({ location }) => {
    // --- Platform Check ---
    // The correct way to check for Tauri in v2
    const isDesktop = await isTauri();
    if (isDesktop) {
      return; // Allow access on desktop regardless of auth state
    }

    // --- Web Platform Auth Check ---
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Define public routes that don't require authentication
    const publicRoutes = ["/login", "/signup"];

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
  path: "/transactionsTable",
  component: TransactionsTable,
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
  transactionsTableRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
