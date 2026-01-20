import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Menu } from "lucide-react";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { Button } from "./components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "./components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "./components/layout/Sidebar";
import { usePlatform } from "./contexts/PlatformContext";
import { useTWA } from "./contexts/TWAContext";
import { useAuth } from "@/contexts/AuthContext";
import { setPlatform as setGlobalPlatform } from "./lib/platformManager";
import { useDonationStore } from "./lib/store";
import { checkAndSendDesktopReminder } from "./lib/data-layer/reminders";
import { checkForUpdates } from "./lib/data-layer/updater.service";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils/index";
import toast from "react-hot-toast";
import ContactFAB from "./components/layout/ContactFAB";
import { TermsAcceptanceModal } from "./components/auth/TermsAcceptanceModal";
import { Footer } from "@/pages/landing/sections/Footer";
import AppLoader from "./components/layout/AppLoader";

import { PUBLIC_ROUTES, FULL_SCREEN_ROUTES } from "./lib/constants";

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  // Web is ready immediately (no DB init needed), desktop needs async initialization
  // @ts-expect-error __TAURI_INTERNALS__ is injected by Tauri
  const [isAppReady, setIsAppReady] = useState(() => !window.__TAURI_INTERNALS__);

  const { platform } = usePlatform();
  const { isTWA } = useTWA();
  const { user } = useAuth();
  const { i18n, t } = useTranslation();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  // Get Zustand store state for language synchronization
  const settings = useDonationStore((state) => state.settings);
  const _hasHydrated = useDonationStore((state) => state._hasHydrated);

  // Define pages that take full screen without sidebar/padding
  // - FULL_SCREEN_ROUTES (login/signup/landing) are always full-screen on all platforms.
  // - On WEB: If user is NOT logged in, hide sidebar on public routes (because they have no context).
  // - On DESKTOP: User is always null (no auth required), so ALWAYS show sidebar except on FULL_SCREEN_ROUTES.
  const isFullScreenPage =
    FULL_SCREEN_ROUTES.includes(currentPath) ||
    (platform === "web" && !user && PUBLIC_ROUTES.includes(currentPath));

  // Show footer on all pages except login and signup
  const shouldShowFooter = ![
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
  ].includes(currentPath);

  // Hide floating contact button on auth + landing pages (FULL_SCREEN_ROUTES)
  // BUT allow it on terms/privacy if user is logged in
  const shouldShowContactFab =
    (user || platform === "desktop") &&
    !FULL_SCREEN_ROUTES.includes(currentPath);

  // Synchronize i18n with Zustand store language after hydration
  useEffect(() => {
    if (_hasHydrated && i18n.language !== settings.language) {
      logger.log(
        `[i18n-sync] Synchronizing language: i18n=${i18n.language}, Zustand=${settings.language}`
      );
      (i18n as any).changeLanguage(settings.language);
    }
  }, [_hasHydrated, settings.language, i18n]);

  useEffect(() => {
    document.documentElement.dir = i18n.dir();
    document.documentElement.lang = i18n.language;
  }, [i18n, i18n.language]);

  useEffect(() => {
    if (platform !== "loading") {
      setGlobalPlatform(platform);
      if (platform === "desktop") {
        import("@tauri-apps/api/core")
          .then(({ invoke }) => {
            invoke("init_db")
              .then(() => {
                logger.log("Database initialized successfully.");
                // Now, execute the recurring transactions handler
                return invoke("execute_due_recurring_transactions_handler");
              })
              .then((message) => {
                logger.log("Recurring transactions handler executed:", message);
                // Check for desktop reminders after recurring transactions
                return checkAndSendDesktopReminder(t);
              })
              .then(() => {
                logger.log("Desktop reminder check complete.");
                // Check for updates silently in background (non-blocking)
                checkForUpdates()
                  .then((updateInfo) => {
                    if (updateInfo) {
                      logger.log(`Update available: ${updateInfo.version}`);
                      // Notify user about available update
                      toast.success(
                        t("versionInfo.updateAvailable", {
                          version: updateInfo.version,
                          ns: "settings",
                        }),
                        {
                          duration: 5000,
                          icon: "🔔",
                        }
                      );
                    } else {
                      logger.log("App is up to date");
                      // No notification if up to date - silent check
                    }
                  })
                  .catch((error) => {
                    logger.error("Failed to check for updates:", error);
                    // Don't block app startup if update check fails
                    // Don't show error toast on startup - user can check manually if needed
                  });
              })
              .catch((error) =>
                logger.error(
                  "Error during desktop initialization sequence:",
                  error
                )
              )
              .finally(() => {
                // Ensure app is ready even if there was an error
                setIsAppReady(true);
              });
          })
          .catch((e) => {
            logger.error("Failed to load Tauri core API", e);
            setIsAppReady(true);
          });
      } else {
        // For web, we can consider the app ready once platform is known.
        // Auth and data loading are handled within components/contexts.
        setIsAppReady(true);
      }
    }
  }, [platform, t]);

  if (!isAppReady) {
    // Desktop: Show loader during DB init (instead of blank screen)
    // This only happens on desktop since web has isAppReady=true from start
    return <AppLoader />;
  }

  return (
    <TooltipProvider>
      <div className="h-full w-full overflow-hidden bg-background flex">
        {!isFullScreenPage && (
          <div
            className={cn(
              "hidden md:block transition-all duration-300 bg-card overflow-hidden h-full shadow-lg",
              isSidebarExpanded ? "w-44" : "w-16"
            )}
            onMouseEnter={() => setIsSidebarExpanded(true)}
            onMouseLeave={() => setIsSidebarExpanded(false)}
          >
            <Sidebar expanded={isSidebarExpanded} />
          </div>
        )}

        {!isFullScreenPage && (
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "md:hidden fixed top-4 z-50 rounded-full border border-border bg-card text-card-foreground shadow-md hover:bg-accent hover:text-accent-foreground",
                  i18n.dir() === "rtl" ? "right-4" : "left-4"
                )}
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side={i18n.dir() === "rtl" ? "right" : "left"}
              className="p-0 flex flex-col w-44 overflow-x-hidden"
            >
              {/* Accessibility: Provide a DialogTitle for the Sheet to satisfy Radix requirements */}
              <SheetHeader>
                <SheetTitle className="sr-only">Mobile navigation</SheetTitle>
                <SheetDescription className="sr-only">
                  Main navigation panel for mobile view
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto overflow-x-hidden pt-12 pb-4">
                <Sidebar
                  expanded={true}
                  inSheet={true}
                  onLinkClick={() => setIsMobileMenuOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>
        )}

        <div
          className={`flex-1 h-full overflow-y-auto flex flex-col ${
            isFullScreenPage ? "w-full" : ""
          }`}
        >
          <main
            className={`flex-1 ${
              isFullScreenPage
                ? "p-0"
                : "container py-6 px-4 md:px-6 md:pt-6 pt-20"
            }`}
          >
            <div
              className={`${platform === "desktop" ? "is-desktop" : "is-web"} ${
                isTWA ? "is-twa" : ""
              }`}
            >
              <Outlet />
            </div>
          </main>
          {shouldShowFooter && <Footer />}
        </div>
        <Toaster richColors />
      </div>
      {shouldShowContactFab && <ContactFAB />}
      <TermsAcceptanceModal />
    </TooltipProvider>
  );
}

export default App;
