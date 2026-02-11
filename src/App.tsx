import { useState, useEffect, useRef } from "react";
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
import { WhatsNewModal } from "./components/WhatsNewModal";
import { Footer } from "@/pages/landing/sections/Footer";
import AppLoader from "./components/layout/AppLoader";

import { RecurringTransactionsService } from "./lib/services/recurring-transactions.service";
import { PUBLIC_ROUTES, FULL_SCREEN_ROUTES } from "./lib/constants";
import {
  isDesktopLockEnabled,
  isUnlocked,
  lockNow,
} from "./lib/security/appLock.service";
import { DesktopLockScreen } from "./components/security/DesktopLockScreen";

export type DesktopLockStatus =
  | null
  | { enabled: boolean; unlocked: boolean };

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  // Web is ready immediately (no DB init needed), desktop needs async initialization
  // @ts-expect-error __TAURI_INTERNALS__ is injected by Tauri
  const [isAppReady, setIsAppReady] = useState(() => !window.__TAURI_INTERNALS__);
  // Desktop app lock: null = checking, { enabled, unlocked } = resolved
  const [desktopLockStatus, setDesktopLockStatus] =
    useState<DesktopLockStatus>(null);
  const [desktopInitComplete, setDesktopInitComplete] = useState(false);
  // Prevent re-running desktop init when language changes (t function reference changes)
  const desktopInitDone = useRef(false);

  const { platform } = usePlatform();
  const { isTWA } = useTWA();
  const { user } = useAuth();
  const { i18n, t } = useTranslation();
  const tRef = useRef(t); // Ref to access latest t without adding it to dependencies
  tRef.current = t; // Always keep ref up to date
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  // Get Zustand store state for language synchronization and auto-lock
  const settings = useDonationStore((state) => state.settings);
  const _hasHydrated = useDonationStore((state) => state._hasHydrated);
  const autoLockTimeoutMinutes =
    settings.autoLockTimeoutMinutes ?? 10;

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

  // Desktop: resolve app lock status (enabled + unlocked) then set app ready
  useEffect(() => {
    if (platform !== "desktop" || desktopLockStatus !== null) return;
    let cancelled = false;
    isDesktopLockEnabled()
      .then((enabled) => {
        if (cancelled) return;
        const unlocked = enabled ? isUnlocked() : true;
        setDesktopLockStatus({ enabled, unlocked });
        setIsAppReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setDesktopLockStatus({ enabled: false, unlocked: true });
          setIsAppReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [platform, desktopLockStatus]);

  // Web: app ready as soon as platform is known
  useEffect(() => {
    if (platform === "web") {
      setGlobalPlatform(platform);
      setIsAppReady(true);
    }
  }, [platform]);

  // Desktop: run init_db only when lock is disabled or user has unlocked
  useEffect(() => {
    if (platform !== "desktop" || !desktopLockStatus) return;
    if (desktopLockStatus.enabled && !desktopLockStatus.unlocked) return;
    if (desktopInitDone.current) return;
    setGlobalPlatform(platform);
    desktopInitDone.current = true;

    import("@tauri-apps/api/core")
      .then(({ invoke }) => {
        invoke("init_db")
          .then(() => {
            logger.log("Database initialized successfully.");
            return RecurringTransactionsService.processDueTransactions();
          })
          .then(() => {
            logger.log("Recurring transactions processed.");
            return checkAndSendDesktopReminder(tRef.current);
          })
          .then(() => {
            logger.log("Desktop reminder check complete.");
            checkForUpdates()
              .then((updateInfo) => {
                if (updateInfo) {
                  logger.log(`Update available: ${updateInfo.version}`);
                  toast.success(
                    tRef.current("versionInfo.updateAvailable", {
                      version: updateInfo.version,
                      ns: "settings",
                    }),
                    { duration: 5000, icon: "🔔" }
                  );
                } else {
                  logger.log("App is up to date");
                }
              })
              .catch((error) => {
                logger.error("Failed to check for updates:", error);
              });
          })
          .catch((error) =>
            logger.error("Error during desktop initialization sequence:", error)
          )
          .finally(() => {
            setDesktopInitComplete(true);
          });
      })
      .catch((e) => {
        logger.error("Failed to load Tauri core API", e);
        setDesktopInitComplete(true);
      });
  }, [platform, desktopLockStatus]);

  // Desktop: auto-lock after real user inactivity (mouse/keyboard/touch/etc.)
  useEffect(() => {
    if (platform !== "desktop") return;
    if (!desktopLockStatus?.enabled || !desktopLockStatus?.unlocked) return;
    if (!desktopInitComplete || autoLockTimeoutMinutes <= 0) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const delayMs = autoLockTimeoutMinutes * 60 * 1000;
    let lastActivityAt = Date.now();

    const lockApp = () => {
      lockNow();
      setDesktopLockStatus((prev) =>
        prev ? { ...prev, unlocked: false } : prev
      );
    };

    const scheduleLock = () => {
      if (timeoutId) clearTimeout(timeoutId);
      const elapsedMs = Date.now() - lastActivityAt;
      const remainingMs = delayMs - elapsedMs;
      if (remainingMs <= 0) {
        lockApp();
        return;
      }
      timeoutId = setTimeout(() => {
        timeoutId = null;
        lockApp();
      }, remainingMs);
    };

    const clearLockTimer = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const markActivity = () => {
      lastActivityAt = Date.now();
      if (!document.hidden) scheduleLock();
    };

    // Start counting inactivity immediately.
    scheduleLock();

    // Treat these interactions as user activity.
    const activityEvents: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "wheel",
      "focus",
    ];

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, markActivity, { passive: true });
    }

    // When returning to the app, lock immediately if timeout already passed.
    const onVisibilityChange = () => {
      if (!document.hidden) scheduleLock();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, markActivity);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearLockTimer();
    };
  }, [
    platform,
    desktopLockStatus?.enabled,
    desktopLockStatus?.unlocked,
    desktopInitComplete,
    autoLockTimeoutMinutes,
  ]);

  if (!isAppReady) {
    return <AppLoader />;
  }

  const desktopLocked =
    platform === "desktop" &&
    desktopLockStatus?.enabled &&
    !desktopLockStatus.unlocked;

  if (desktopLocked) {
    return (
      <DesktopLockScreen
        isFirstTime={false}
        onUnlocked={() => {
          setDesktopLockStatus((s) =>
            s ? { ...s, unlocked: true } : s
          );
        }}
      />
    );
  }

  const desktopInitPending =
    platform === "desktop" &&
    (!desktopLockStatus?.enabled || desktopLockStatus?.unlocked) &&
    !desktopInitComplete;

  if (desktopInitPending) {
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
      <WhatsNewModal />
    </TooltipProvider>
  );
}

export default App;
