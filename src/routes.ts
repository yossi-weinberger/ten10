import {
  createRouter,
  createRootRoute,
  createRoute,
} from "@tanstack/react-router";
import App from "./App";
import { HomePage } from "./pages/HomePage";
import { AddTransactionPage } from "./pages/AddTransactionPage";
import { HalachaPage } from "./pages/HalachaPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AboutPage } from "./pages/AboutPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AnalyticsPage } from "./pages/AnalyticsPage";

const rootRoute = createRootRoute({
  component: App,
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  addTransactionRoute,
  halachaRoute,
  settingsRoute,
  aboutRoute,
  profileRoute,
  analyticsRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
