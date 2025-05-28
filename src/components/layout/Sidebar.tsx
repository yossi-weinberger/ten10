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
  Table,
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
  inSheet?: boolean;
}

export function Sidebar({ expanded = false, inSheet = false }: SidebarProps) {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const { platform } = usePlatform();
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [profileFullName, setProfileFullName] = useState<string | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);

  const expandedWidth = inSheet ? "w-32" : "w-52";
  const collapsedWidth = "w-16";

  useEffect(() => {
    if (platform === "web" && session && session.user && !authLoading) {
      let isMounted = true;
      setProfileLoading(true);
      setProfileFullName(null);
      setProfileAvatarUrl(null);
      console.log("[Sidebar] Fetching profile for user ID:", session?.user?.id);

      async function fetchSidebarProfile() {
        if (!session || !session.user) {
          console.log("[Sidebar] No session or user, aborting fetch.");
          if (isMounted) setProfileLoading(false);
          return;
        }
        try {
          console.log(
            `[Sidebar] Attempting to fetch profile for ID: ${session.user.id}`
          );
          const { data, error } = await supabase
            .from("profiles")
            .select(`full_name, avatar_url`)
            .eq("id", session.user.id)
            .single();

          console.log("[Sidebar] Supabase response:", { data, error });

          if (error && error.code !== "PGRST116") {
            console.error("[Sidebar] Supabase error:", error);
            throw error;
          }
          if (isMounted) {
            if (data) {
              console.log("[Sidebar] Profile data received:", data);
              setProfileFullName(data.full_name);
              setProfileAvatarUrl(data.avatar_url);
            } else {
              console.log(
                "[Sidebar] No profile data received (data is null/undefined)."
              );
            }
          }
        } catch (err) {
          console.error(
            "[Sidebar] Error in fetchSidebarProfile catch block:",
            err
          );
        } finally {
          if (isMounted) {
            console.log(
              "[Sidebar] Fetch finished, setting profileLoading to false."
            );
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
    <div
      className={cn(
        "flex flex-col transition-all duration-200",
        inSheet ? "h-full" : "h-screen overflow-hidden py-4",
        expanded ? expandedWidth : collapsedWidth
      )}
    >
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

      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
        <NavLink to="/" icon={Home}>
          דף הבית
        </NavLink>
        <NavLink to="/add-transaction" icon={PlusCircle}>
          הוסף תנועה
        </NavLink>
        <NavLink to="/analytics" icon={BarChart}>
          ניתוח נתונים
        </NavLink>
        <NavLink to="/transactionsTable" icon={Table}>
          טבלת נתונים
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

      {/* Combined bottom block for user info and platform indicator */}
      <div className="mt-auto pt-4 border-t border-border/20 px-2">
        {platform === "web" && session?.user && (
          <div className="pb-2">
            {" "}
            {/* Adjusted: Removed individual mt-auto, pt-4, border-t. Added pb-2 for spacing if needed before PlatformIndicator */}
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
                      "rounded-full flex-shrink-0",
                      expanded ? "h-10 w-10" : "h-9 w-9"
                      // Removed !expanded && "mb-1" to control spacing more directly
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
                  className={cn(
                    "rounded-full flex-shrink-0 object-cover",
                    expanded ? "h-10 w-10" : "h-9 w-9"
                  )}
                />
              ) : (
                <div
                  className={cn(
                    "rounded-full bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0",
                    expanded ? "h-10 w-10" : "h-9 w-9"
                    // Removed !expanded && "mb-1"
                  )}
                >
                  <User className="h-6 w-6" />
                </div>
              )}
              {!authLoading && !profileLoading && (
                <div
                  className={cn(
                    "flex flex-col text-sm transition-all duration-200",
                    expanded ? "items-start" : "hidden"
                  )}
                >
                  {profileFullName && (
                    <span className="font-semibold">{profileFullName}</span>
                  )}
                  {/* {session.user.email && (
                    <span className="text-xs text-muted-foreground">
                      {session.user.email}
                    </span>
                  )} */}
                </div>
              )}
            </div>
          </div>
        )}
        <PlatformIndicator expanded={expanded} />
      </div>
    </div>
  );
}
