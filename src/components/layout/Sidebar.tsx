// Version 3 of the sidebar
import { useState, useLayoutEffect, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Home,
  PlusCircle,
  Settings,
  Info,
  User,
  Book,
  Table,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlatformIndicator } from "./PlatformIndicator";
import { usePlatform } from "@/contexts/PlatformContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";

interface SidebarProps {
  expanded?: boolean;
  inSheet?: boolean;
}

type SliderStyle = { opacity: number; top: number; height: number };

export function Sidebar({ expanded = false, inSheet = false }: SidebarProps) {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const { platform } = usePlatform();
  const { session, loading: authLoading } = useAuth();
  const { t, i18n } = useTranslation("navigation");

  const [profileFullName, setProfileFullName] = useState<string | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);

  // Parent wrapper (non-scroll) that contains: scrollable nav + bottom profile card
  const listRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [sliderStyle, setSliderStyle] = useState<SliderStyle>({
    opacity: 0,
    top: 0,
    height: 0,
  });

  const expandedWidth = inSheet ? "w-44" : "w-44";
  const collapsedWidth = "w-16";

  // --- Slider measurement (active item background) ---
  useLayoutEffect(() => {
    const listEl = listRef.current;
    const scrollEl = scrollRef.current;
    if (!listEl) return;

    let raf = 0;

    const measure = () => {
      if (!listEl) return;
      const activeEl = listEl.querySelector(
        '[data-active="true"]'
      ) as HTMLElement | null;

      if (!activeEl) {
        setSliderStyle((prev) =>
          prev.opacity === 0 ? prev : { ...prev, opacity: 0 }
        );
        return;
      }

      const listRect = listEl.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      const top = elRect.top - listRect.top; // works for both scrolled nav and bottom card
      const height = elRect.height;

      setSliderStyle((prev) => {
        const next = { opacity: 1, top, height };
        return prev.opacity === next.opacity &&
          prev.top === next.top &&
          prev.height === next.height
          ? prev
          : next;
      });
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    schedule();
    window.addEventListener("resize", schedule);
    // listen to the inner scroller only (since parent doesn't scroll)
    scrollEl?.addEventListener("scroll", schedule, { passive: true });

    // observe size/content changes
    const roList =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(schedule)
        : null;
    const roScroll =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(schedule)
        : null;

    roList?.observe(listEl);
    scrollEl && roScroll?.observe(scrollEl);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", schedule);
      scrollEl?.removeEventListener("scroll", schedule);
      roList?.disconnect();
      roScroll?.disconnect();
    };
  }, [currentPath, expanded, i18n.language]);

  // --- Profile fetch ---
  useEffect(() => {
    if (platform === "web" && session?.user && !authLoading) {
      let isMounted = true;
      setProfileLoading(true);
      setProfileFullName(null);
      setProfileAvatarUrl(null);

      (async () => {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select(`full_name, avatar_url`)
            .eq("id", session.user.id)
            .single();

          if (error && (error as any).code !== "PGRST116") throw error;

          if (isMounted && data) {
            setProfileFullName(data.full_name);
            setProfileAvatarUrl(data.avatar_url);
          }
        } catch (err) {
          if (import.meta.env.DEV) {
            logger.error("[Sidebar] profile fetch error:", err);
          }
        } finally {
          if (isMounted) setProfileLoading(false);
        }
      })();

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
  }) => {
    const isActive =
      to === "/" ? currentPath === to : currentPath.startsWith(to);
    const isRtl = i18n.dir() === "rtl";

    return (
      <Button
        variant="ghost"
        className={cn(
          "w-full h-12 z-10 overflow-hidden max-w-full",
          "transition-all duration-300",
          "justify-start px-4",
          isActive
            ? "text-secondary-foreground hover:bg-transparent"
            : "text-foreground",
          "[&_svg]:size-6"
        )}
        asChild
      >
        <Link
          to={to}
          data-active={isActive}
          className="flex items-center w-full min-w-0 max-w-full overflow-hidden"
        >
          <Icon className="h-6 w-6 min-w-[24px] flex-shrink-0" />
          <span
            className={cn(
              "whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out min-w-0",
              expanded
                ? "max-w-[200px] opacity-100 flex-1"
                : "max-w-0 opacity-0 flex-none",
              expanded ? (isRtl ? "mr-4" : "ml-4") : "mx-0"
            )}
          >
            {children}
          </span>
        </Link>
      </Button>
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col transition-all duration-300 overflow-hidden",
        inSheet ? "h-full" : "h-screen overflow-hidden py-4",
        expanded ? expandedWidth : collapsedWidth
      )}
      dir={i18n.dir()}
    >
      <Link
        to="/"
        aria-label={t("appName")}
        className={cn(
          "flex items-center mb-6 overflow-hidden shrink-0 transition-all duration-300",
          expanded ? "px-4 justify-start" : "px-0 justify-center w-full"
        )}
        style={{ height: "36px" }}
      >
        <span className="sr-only">{t("appName")}</span>

        <div className="relative w-full h-full flex items-center">
          {/* Square Logo (Collapsed) */}
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
              expanded ? "opacity-0 pointer-events-none" : "opacity-100"
            )}
          >
            <img
              src="/logo/logo.svg"
              alt="Ten10"
              loading="eager"
              decoding="async"
              className="block dark:hidden h-9 w-9 object-contain"
            />
            <img
              src="/logo/logo.svg"
              alt="Ten10"
              loading="eager"
              decoding="async"
              className="hidden dark:block h-9 w-9 object-contain"
            />
          </div>

          {/* Wide Logo (Expanded) */}
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-start transition-opacity duration-300",
              expanded ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            <img
              src="/logo/logo-wide.svg"
              alt="Ten10"
              loading="eager"
              decoding="async"
              className="block dark:hidden h-7 w-auto object-contain"
            />
            <img
              src="/logo/logo-wide.svg"
              alt="Ten10"
              loading="eager"
              decoding="async"
              className="hidden dark:block h-7 w-auto object-contain"
            />
          </div>
        </div>
      </Link>

      {/* Parent wrapper (non-scroll) */}
      <div
        ref={listRef}
        className={cn(
          "relative flex-1 p-1 overflow-x-hidden", // not scrollable
          "flex flex-col min-h-0 gap-1"
        )}
      >
        {/* Slider overlay over the whole wrapper */}
        <div
          className="absolute z-0 bg-secondary rounded-md transition-[transform,height,opacity] duration-200 ease-in-out pointer-events-none"
          style={{
            opacity: sliderStyle.opacity,
            height: `${sliderStyle.height}px`,
            transform: `translateY(${Math.max(0, sliderStyle.top)}px)`,
            left: "0.25rem",
            right: "0.25rem",
            top: 0,
            willChange: "transform,height",
          }}
        >
          <div
            className={cn(
              "absolute inset-y-2 w-1 bg-primary",
              i18n.dir() === "rtl"
                ? "right-0 rounded-l-full"
                : "left-0 rounded-r-full"
            )}
          />
        </div>

        {/* Scrollable NAV area */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden min-w-0"
        >
          <nav className="flex flex-col gap-1 min-w-0">
            <NavLink to="/" icon={Home}>
              {t("menu.home")}
            </NavLink>
            <NavLink to="/add-transaction" icon={PlusCircle}>
              {t("menu.addTransaction")}
            </NavLink>
            {/* <NavLink to="/analytics" icon={BarChart}>
              {t("menu.analytics")}
            </NavLink> */}
            <NavLink to="/transactions-table" icon={Table}>
              {t("menu.transactionsTable")}
            </NavLink>
            <NavLink to="/halacha" icon={Book}>
              {t("menu.halacha")}
            </NavLink>
            <NavLink to="/settings" icon={Settings}>
              {t("menu.settings")}
            </NavLink>
            <NavLink to="/about" icon={Info}>
              {t("menu.about")}
            </NavLink>
          </nav>
        </div>

        {/* Divider spans the padded width */}
        <div className="my-2 h-px bg-border/20" />

        {/* Bottom-pinned Profile card (NOT inside the scroller) */}
        {platform === "web" && session?.user && (
          <Link
            to="/profile"
            data-active={currentPath.startsWith("/profile")}
            aria-label={t("menu.profile")}
            className={cn(
              "flex items-center rounded-md transition-all duration-300 relative z-10 min-w-0 overflow-hidden",
              "hover:bg-muted/50 justify-start px-3 h-14"
            )}
          >
            {authLoading || profileLoading ? (
              <>
                <Skeleton className="rounded-full flex-shrink-0 h-8 w-8" />
                <div
                  className={cn(
                    "flex flex-col gap-1 min-w-0 overflow-hidden transition-all duration-300 ease-in-out",
                    expanded
                      ? "opacity-100 max-w-[200px] flex-1"
                      : "opacity-0 max-w-0 flex-none",
                    expanded ? (i18n.dir() === "rtl" ? "mr-4" : "ml-4") : "mx-0"
                  )}
                >
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </>
            ) : profileAvatarUrl ? (
              <>
                <img
                  src={profileAvatarUrl}
                  alt={profileFullName || "User Avatar"}
                  loading="lazy"
                  decoding="async"
                  className="rounded-full object-cover flex-shrink-0 h-8 w-8"
                />
                {!authLoading && !profileLoading && (
                  <div
                    className={cn(
                      "flex flex-col text-sm transition-all duration-300 ease-in-out text-foreground min-w-0 overflow-hidden",
                      expanded
                        ? "opacity-100 max-w-[200px] flex-1"
                        : "opacity-0 max-w-0 flex-none",
                      expanded
                        ? i18n.dir() === "rtl"
                          ? "mr-4"
                          : "ml-4"
                        : "mx-0"
                    )}
                  >
                    {profileFullName && (
                      <span className="font-semibold truncate">
                        {profileFullName}
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="rounded-full bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0 h-8 w-8">
                  <User className="h-5 w-5" />
                </div>
                {!authLoading && !profileLoading && (
                  <div
                    className={cn(
                      "flex flex-col text-sm transition-all duration-300 ease-in-out text-foreground min-w-0 overflow-hidden",
                      expanded
                        ? "opacity-100 max-w-[200px] flex-1"
                        : "opacity-0 max-w-0 flex-none",
                      expanded
                        ? i18n.dir() === "rtl"
                          ? "mr-4"
                          : "ml-4"
                        : "mx-0"
                    )}
                  >
                    {profileFullName && (
                      <span className="font-semibold truncate">
                        {profileFullName}
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </Link>
        )}
      </div>

      {/* Bottom area (separate): platform indicator & border */}
      <div className="mt-auto pt-4 border-t border-border/20 px-1">
        <PlatformIndicator expanded={expanded} />
      </div>
    </div>
  );
}
