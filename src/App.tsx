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
import toast from "react-hot-toast";
import ContactFAB from "./components/layout/ContactFAB";
import { Footer } from "@/pages/landing/sections/Footer";

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);

  const { platform } = usePlatform();
  const { isTWA } = useTWA();
  const { user } = useAuth();
  const { i18n, t } = useTranslation();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  // Get Zustand store state for language synchronization
  const settings = useDonationStore((state) => state.settings);
  const _hasHydrated = useDonationStore((state) => state._hasHydrated);

  // Hide sidebar on landing page
  const isLandingPage = currentPath === "/landing";

  // Show footer on all pages except login and signup
  const shouldShowFooter = !["/login", "/signup"].includes(currentPath);

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
    return null;
  }

  return (
    <TooltipProvider>
      <div className="h-full w-full overflow-hidden bg-background flex">
        {!isLandingPage && (
          <div
            className="hidden md:block w-[4rem] hover:w-48 transition-all duration-300 bg-card overflow-hidden h-full shadow-lg"
            onMouseEnter={() => setIsSidebarExpanded(true)}
            onMouseLeave={() => setIsSidebarExpanded(false)}
          >
            <Sidebar expanded={isSidebarExpanded} />
          </div>
        )}

        {!isLandingPage && (
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden fixed top-4 right-4 z-50"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="p-0 flex flex-col w-40 max-w-[180px]"
            >
              {/* Accessibility: Provide a DialogTitle for the Sheet to satisfy Radix requirements */}
              <SheetHeader>
                <SheetTitle className="sr-only">Mobile navigation</SheetTitle>
                <SheetDescription className="sr-only">
                  Main navigation panel for mobile view
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto pt-12">
                <Sidebar expanded={true} inSheet={true} />
              </div>
            </SheetContent>
          </Sheet>
        )}

        <div
          className={`flex-1 h-full overflow-y-auto flex flex-col ${
            isLandingPage ? "w-full" : ""
          }`}
        >
          <main
            className={`flex-1 ${
              isLandingPage
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
      {(user || platform === "desktop") && <ContactFAB />}
    </TooltipProvider>
  );
}

export default App;
