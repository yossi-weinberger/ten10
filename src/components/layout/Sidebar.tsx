import React, { useState, useEffect } from "react";
import {
  Calculator,
  Home,
  PlusCircle,
  Settings,
  Info,
  User,
  Book,
  BarChart,
} from "lucide-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlatformIndicator } from "./PlatformIndicator";
import { usePlatform } from "@/contexts/PlatformContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";

interface SidebarProps {
  expanded?: boolean;
}

export function Sidebar({ expanded = false }: SidebarProps) {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const { platform } = usePlatform();
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [profileFullName, setProfileFullName] = useState<string | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);

  useEffect(() => {
    if (platform === "web" && session && session.user && !authLoading) {
      let isMounted = true;
      setProfileLoading(true);
      setProfileFullName(null);
      setProfileAvatarUrl(null);

      async function fetchSidebarProfile() {
        if (!session || !session.user) {
          if (isMounted) setProfileLoading(false);
          return;
        }
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select(`full_name, avatar_url`)
            .eq("id", session.user.id)
            .single();

          if (error && error.code !== "PGRST116") {
            throw error;
          }
          if (isMounted && data) {
            setProfileFullName(data.full_name);
            setProfileAvatarUrl(data.avatar_url);
          }
        } catch (err) {
          console.error("Error fetching sidebar profile:", err);
        } finally {
          if (isMounted) {
            setProfileLoading(false);
          }
        }
      }
      fetchSidebarProfile();
      return () => {
        isMounted = false;
      };
    } else {
      setProfileLoading(false);
      setProfileFullName(null);
      setProfileAvatarUrl(null);
    }
  }, [platform, session, authLoading]);

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
        currentPath !== to && "text-foreground",
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

  return (
    <div className="h-full flex flex-col py-4">
      <Link to="/" className="flex items-center gap-2 px-4 mb-6">
        <Calculator className="h-6 w-6 text-primary flex-shrink-0" />
        <h1
          className={cn(
            "text-lg font-bold transition-all duration-200",
            "dark:text-slate-100",
            !expanded && "w-0 overflow-hidden opacity-0"
          )}
        >
          Ten10
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

      <PlatformIndicator expanded={expanded} />

      {platform === "web" && session?.user && (
        <div className="mt-auto pt-4 border-t border-border/20 px-2">
          <div
            className={cn(
              "flex items-center p-2 rounded-md",
              expanded ? "gap-3" : "flex-col gap-1 justify-center text-center"
            )}
          >
            {authLoading || profileLoading ? (
              <>
                <Skeleton
                  className={cn(
                    "h-10 w-10 rounded-full flex-shrink-0",
                    !expanded && "mb-1"
                  )}
                />
                {expanded && (
                  <div className="flex flex-col gap-1 w-full">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                )}
              </>
            ) : profileAvatarUrl ? (
              <img
                src={profileAvatarUrl}
                alt={profileFullName || "User Avatar"}
                className="h-10 w-10 rounded-full flex-shrink-0 object-cover"
              />
            ) : (
              <div
                className={cn(
                  "h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0",
                  !expanded && "mb-1"
                )}
              >
                <User className="h-6 w-6" />
              </div>
            )}
            {!authLoading && !profileLoading && (
              <div
                className={cn(
                  "flex flex-col text-sm transition-all duration-200",
                  expanded
                    ? "items-start"
                    : "w-0 overflow-hidden opacity-0 items-center text-center"
                )}
              >
                {profileFullName && (
                  <span className="font-semibold">{profileFullName}</span>
                )}
                {session.user.email && (
                  <span className="text-xs text-muted-foreground">
                    {session.user.email}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
