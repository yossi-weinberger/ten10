import React from 'react';
import { Calculator, Home, PlusCircle, Heart, Settings, Info, User, Book } from 'lucide-react';
import { Link, useRouter } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PlatformInfo } from '@/lib/platform';

interface SidebarProps {
  expanded?: boolean;
  platformInfo: PlatformInfo | null;
  onTogglePlatform: () => void;
}

export function Sidebar({ expanded = false, platformInfo, onTogglePlatform }: SidebarProps) {
  const router = useRouter();
  const currentPath = router.state.location.pathname;

  const NavLink = ({ to, icon: Icon, children }: { to: string; icon: React.ElementType; children: React.ReactNode }) => (
    <Button 
      variant={currentPath === to ? "secondary" : "ghost"} 
      className={cn(
        "w-full h-12",
        expanded ? "justify-start px-4 gap-3" : "justify-center px-0",
        currentPath === to && "relative after:absolute after:inset-y-2 after:right-0 after:w-1 after:bg-primary after:rounded-l-full"
      )} 
      asChild
    >
      <Link to={to}>
        <Icon className="h-6 w-6 min-w-[24px] flex-shrink-0" />
        <span className={cn(
          "transition-all duration-200",
          !expanded && "w-0 overflow-hidden opacity-0"
        )}>
          {children}
        </span>
      </Link>
    </Button>
  );

  return (
    <div className="h-full flex flex-col py-4">
      <Link to="/" className="flex items-center gap-2 px-4 mb-6">
        <Calculator className="h-6 w-6 text-primary flex-shrink-0" />
        <h1 className={cn(
          "text-lg font-bold transition-all duration-200",
          !expanded && "w-0 overflow-hidden opacity-0"
        )}>
          Tenten
        </h1>
      </Link>

      <nav className="flex-1 flex flex-col gap-1">
        <NavLink to="/" icon={Home}>דף הבית</NavLink>
        <NavLink to="/income" icon={PlusCircle}>הכנסות</NavLink>
        <NavLink to="/donations" icon={Heart}>תרומות</NavLink>
        <NavLink to="/halacha" icon={Book}>הלכות</NavLink>
        <NavLink to="/settings" icon={Settings}>הגדרות</NavLink>
        <NavLink to="/about" icon={Info}>אודות</NavLink>
        <NavLink to="/profile" icon={User}>פרופיל</NavLink>
      </nav>
    </div>
  );
}