import React, { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Outlet } from "@tanstack/react-router";
import { Button } from "./components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "./components/ui/sheet";
import { Sidebar } from "./components/layout/Sidebar";
import { usePlatform } from "./contexts/PlatformContext";
import { setDataServicePlatform, loadTransactions } from "./lib/dataService";
import { invoke } from "@tauri-apps/api";
import { useDonationStore } from "./lib/store";
import { Transaction } from "./types/transaction";

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  const { platform } = usePlatform();

  useEffect(() => {
    if (platform !== "loading") {
      setDataServicePlatform(platform);
      if (platform === "desktop") {
        invoke("init_db")
          .then(() => {
            console.log("Database initialized successfully.");

            loadTransactions()
              .then((transactions) => {
                console.log(
                  "Loaded initial transactions from DB:",
                  transactions
                );
                useDonationStore.setState({
                  transactions: transactions,
                });
              })
              .catch((error) =>
                console.error("Error loading initial transactions:", error)
              );
          })
          .catch((error) =>
            console.error("Error initializing database:", error)
          );
      }
    }
  }, [platform]);

  if (platform === "loading") {
    return <div>Loading platform info...</div>;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div
        className="hidden md:block w-[4rem] hover:w-48 transition-all duration-300 border-l bg-card overflow-hidden h-screen"
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
      >
        <Sidebar expanded={isSidebarExpanded} />
      </div>

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

      <div className="flex-1 h-screen overflow-y-auto">
        <main className="container py-6 px-4 md:px-6 md:pt-6 pt-20">
          <div className={platform === "desktop" ? "is-desktop" : "is-web"}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
