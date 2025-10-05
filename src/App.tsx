import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { Button } from "./components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "./components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "./components/layout/Sidebar";
import { usePlatform } from "./contexts/PlatformContext";
import { setPlatform as setGlobalPlatform } from "./lib/platformManager";
import { init_db } from "@/lib/data-layer/db_commands";
import { useDonationStore } from "./lib/store";
import { checkAndSendDesktopReminder } from "./lib/data-layer/reminders";

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);

  const { platform } = usePlatform();
  const { i18n, t } = useTranslation();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  // Hide sidebar on landing page
  const isLandingPage = currentPath === "/landing";

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
                console.log("Database initialized successfully.");
                // Now, execute the recurring transactions handler
                return invoke("execute_due_recurring_transactions_handler");
              })
              .then((message) => {
                console.log(
                  "Recurring transactions handler executed:",
                  message
                );
                // Check for desktop reminders after recurring transactions
                return checkAndSendDesktopReminder(t);
              })
              .then(() => {
                console.log("Desktop reminder check complete.");
              })
              .catch((error) =>
                console.error(
                  "Error during desktop initialization sequence:",
                  error
                )
              )
              .finally(() => {
                setIsAppReady(true);
              });
          })
          .catch((e) => {
            console.error("Failed to load Tauri core API", e);
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
      <div className="min-h-screen bg-background flex">
        {!isLandingPage && (
          <div
            className="hidden md:block w-[4rem] hover:w-48 transition-all duration-300 bg-card overflow-hidden h-screen shadow-lg"
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
              <div className="flex-1 overflow-y-auto pt-12">
                <Sidebar expanded={true} inSheet={true} />
              </div>
            </SheetContent>
          </Sheet>
        )}

        <div
          className={`flex-1 h-screen overflow-y-auto ${
            isLandingPage ? "w-full" : ""
          }`}
        >
          <main
            className={`${
              isLandingPage
                ? "p-0"
                : "container py-6 px-4 md:px-6 md:pt-6 pt-20"
            }`}
          >
            <div className={platform === "desktop" ? "is-desktop" : "is-web"}>
              <Outlet />
            </div>
          </main>
        </div>
        <Toaster richColors />
      </div>
    </TooltipProvider>
  );
}

export default App;
