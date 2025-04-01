import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Outlet } from '@tanstack/react-router';
import { Button } from './components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from './components/ui/sheet';
import { Sidebar } from './components/layout/Sidebar';
import { getPlatformInfo, type PlatformInfo } from './lib/platform';

function App() {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  useEffect(() => {
    const initPlatform = async () => {
      try {
        const info = await getPlatformInfo();
        setPlatformInfo(info);
      } catch (error) {
        console.error('שגיאה בטעינת מידע הפלטפורמה:', error);
      }
    };

    initPlatform();
  }, []);

  const togglePlatform = () => {
    if (!platformInfo?.isDev) return;
    
    const url = new URL(window.location.href);
    if (url.searchParams.has('platform')) {
      url.searchParams.delete('platform');
    } else {
      url.searchParams.set('platform', 'desktop');
    }
    window.location.href = url.toString();
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <div 
        className="hidden md:block w-[4rem] hover:w-48 transition-all duration-300 border-l bg-card overflow-hidden"
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
      >
        <Sidebar 
          expanded={isSidebarExpanded}
          platformInfo={platformInfo}
          onTogglePlatform={togglePlatform}
        />
      </div>

      {/* Mobile Menu */}
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
          <Sidebar 
            expanded={true}
            platformInfo={platformInfo}
            onTogglePlatform={togglePlatform}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1">
        <main className="container py-6 px-4 md:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default App;