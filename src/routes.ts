import { createRouter, createRoute } from '@tanstack/react-router';
import App from './App';
import { HomePage } from './pages/HomePage';
import { IncomePage } from './pages/IncomePage';
import { DonationsPage } from './pages/DonationsPage';
import { HalachaPage } from './pages/HalachaPage';
import { SettingsPage } from './pages/SettingsPage';
import { AboutPage } from './pages/AboutPage';
import { ProfilePage } from './pages/ProfilePage';

const rootRoute = createRoute({
  component: App,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const incomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/income',
  component: IncomePage,
});

const donationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/donations',
  component: DonationsPage,
});

const halachaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/halacha',
  component: HalachaPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: AboutPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfilePage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  incomeRoute,
  donationsRoute,
  halachaRoute,
  settingsRoute,
  aboutRoute,
  profileRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}