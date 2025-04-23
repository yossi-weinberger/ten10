import React, { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { Outlet } from "@tanstack/react-router";
import { Button } from "./components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./components/ui/sheet";
import { Sidebar } from "./components/layout/Sidebar";
import { usePlatform } from "./contexts/PlatformContext";

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  const { platform } = usePlatform();

  if (platform === "loading") {
    return <div>Loading platform info...</div>;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div
        className="hidden md:block w-[4rem] hover:w-48 transition-all duration-300 border-l bg-card overflow-hidden"
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
        <SheetContent side="right" className="w-48 p-0">
          <Sidebar expanded={true} />
        </SheetContent>
      </Sheet>

      <div className="flex-1">
        <main className="container py-6 px-4 md:px-6">
          <div className={platform === "desktop" ? "is-desktop" : "is-web"}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
