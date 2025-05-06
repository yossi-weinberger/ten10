import React from "react";
import {
  Calculator,
  Home,
  PlusCircle,
  Settings,
  Info,
  User,
  Book,
  BarChart,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { Link, useRouter, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlatformIndicator } from "./PlatformIndicator";
import { usePlatform } from "@/contexts/PlatformContext";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  expanded?: boolean;
}

export function Sidebar({ expanded = false }: SidebarProps) {
  const router = useRouter();
  const currentPath = router.state.location.pathname;
  const { platform } = usePlatform();
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const NavLink = ({
    to,
    icon: Icon,
    children,
  }: {
    to: string;
    icon: React.ElementType;
    children: React.ReactNode;
  }) => (
    <Button
      variant={currentPath === to ? "secondary" : "ghost"}
      className={cn(
        "w-full h-12",
        expanded ? "justify-start px-4 gap-3" : "justify-center px-0",
        currentPath === to &&
          "relative after:absolute after:inset-y-2 after:right-0 after:w-1 after:bg-primary after:rounded-l-full"
      )}
      asChild
    >
      <Link to={to}>
        <Icon className="h-6 w-6 min-w-[24px] flex-shrink-0" />
        <span
          className={cn(
            "transition-all duration-200",
            !expanded && "w-0 overflow-hidden opacity-0"
          )}
        >
          {children}
        </span>
      </Link>
    </Button>
  );

  const handleLogout = async () => {
    try {
      await signOut();
      navigate({ to: "/login", replace: true });
    } catch (e) {
      console.error("Logout caught in component:", e);
    }
  };

  return (
    <div className="h-full flex flex-col py-4">
      <Link to="/" className="flex items-center gap-2 px-4 mb-6">
        <Calculator className="h-6 w-6 text-primary flex-shrink-0" />
        <h1
          className={cn(
            "text-lg font-bold transition-all duration-200",
            !expanded && "w-0 overflow-hidden opacity-0"
          )}
        >
          Tenten
        </h1>
      </Link>

      <nav className="flex-1 flex flex-col gap-1">
        <NavLink to="/" icon={Home}>
          דף הבית
        </NavLink>
        <NavLink to="/add-transaction" icon={PlusCircle}>
          הוסף תנועה
        </NavLink>
        <NavLink to="/analytics" icon={BarChart}>
          ניתוח נתונים
        </NavLink>
        <NavLink to="/sync" icon={RefreshCw}>
          סנכרון נתונים
        </NavLink>
        <NavLink to="/halacha" icon={Book}>
          הלכות
        </NavLink>
        <NavLink to="/settings" icon={Settings}>
          הגדרות
        </NavLink>
        <NavLink to="/about" icon={Info}>
          אודות
        </NavLink>
        {platform === "web" && (
          <NavLink to="/profile" icon={User}>
            פרופיל
          </NavLink>
        )}
      </nav>

      {platform === "web" && user && (
        <div className="mt-auto pt-4 border-t border-border/20">
          <Button
            variant="ghost"
            className={cn(
              "w-full h-12 text-red-600 hover:bg-red-100 hover:text-red-700 focus-visible:ring-red-500",
              expanded ? "justify-start px-4 gap-3" : "justify-center px-0"
            )}
            onClick={handleLogout}
            disabled={authLoading}
          >
            <LogOut className="h-6 w-6 min-w-[24px] flex-shrink-0" />
            <span
              className={cn(
                "transition-all duration-200",
                !expanded && "w-0 overflow-hidden opacity-0"
              )}
            >
              {authLoading ? "מתנתק..." : "התנתק"}
            </span>
          </Button>
        </div>
      )}

      <PlatformIndicator expanded={expanded} />
    </div>
  );
}
