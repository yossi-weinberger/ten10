// Version 1 of the sidebar, with the indicator

// import React, { useState, useEffect } from "react";
// import { useTranslation } from "react-i18next";
// import {
//   Calculator,
//   Home,
//   PlusCircle,
//   Settings,
//   Info,
//   User,
//   Book,
//   BarChart,
//   Table,
// } from "lucide-react";
// import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
// import { Button } from "@/components/ui/button";
// import { cn } from "@/lib/utils";
// import { PlatformIndicator } from "./PlatformIndicator";
// import { usePlatform } from "@/contexts/PlatformContext";
// import { useAuth } from "@/contexts/AuthContext";
// import { supabase } from "@/lib/supabaseClient";
// import { Skeleton } from "@/components/ui/skeleton";

// interface SidebarProps {
//   expanded?: boolean;
//   inSheet?: boolean;
// }

// export function Sidebar({ expanded = false, inSheet = false }: SidebarProps) {
//   const currentPath = useRouterState({ select: (s) => s.location.pathname });
//   const { platform } = usePlatform();
//   const { session, loading: authLoading } = useAuth();
//   const navigate = useNavigate();
//   const { t, i18n } = useTranslation("navigation");

//   const [profileFullName, setProfileFullName] = useState<string | null>(null);
//   const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
//   const [profileLoading, setProfileLoading] = useState<boolean>(false);

//   const expandedWidth = inSheet ? "w-32" : "w-52";
//   const collapsedWidth = "w-16";

//   useEffect(() => {
//     if (platform === "web" && session && session.user && !authLoading) {
//       let isMounted = true;
//       setProfileLoading(true);
//       setProfileFullName(null);
//       setProfileAvatarUrl(null);
//       logger.log("[Sidebar] Fetching profile for user ID:", session?.user?.id);

//       async function fetchSidebarProfile() {
//         if (!session || !session.user) {
//           logger.log("[Sidebar] No session or user, aborting fetch.");
//           if (isMounted) setProfileLoading(false);
//           return;
//         }
//         try {
//           logger.log(
//             `[Sidebar] Attempting to fetch profile for ID: ${session.user.id}`
//           );
//           const { data, error } = await supabase
//             .from("profiles")
//             .select(`full_name, avatar_url`)
//             .eq("id", session.user.id)
//             .single();

//           logger.log("[Sidebar] Supabase response:", { data, error });

//           if (error && error.code !== "PGRST116") {
//             logger.error("[Sidebar] Supabase error:", error);
//             throw error;
//           }
//           if (isMounted) {
//             if (data) {
//               logger.log("[Sidebar] Profile data received:", data);
//               setProfileFullName(data.full_name);
//               setProfileAvatarUrl(data.avatar_url);
//             } else {
//               logger.log(
//                 "[Sidebar] No profile data received (data is null/undefined)."
//               );
//             }
//           }
//         } catch (err) {
//           logger.error(
//             "[Sidebar] Error in fetchSidebarProfile catch block:",
//             err
//           );
//         } finally {
//           if (isMounted) {
//             logger.log(
//               "[Sidebar] Fetch finished, setting profileLoading to false."
//             );
//             setProfileLoading(false);
//           }
//         }
//       }
//       fetchSidebarProfile();
//       return () => {
//         isMounted = false;
//       };
//     } else {
//       setProfileLoading(false);
//       setProfileFullName(null);
//       setProfileAvatarUrl(null);
//     }
//   }, [platform, session, authLoading]);

//   const NavLink = ({
//     to,
//     icon: Icon,
//     children,
//   }: {
//     to: string;
//     icon: React.ElementType;
//     children: React.ReactNode;
//   }) => {
//     const isActive =
//       to === "/" ? currentPath === to : currentPath.startsWith(to);

//     return (
//       <Button
//         variant={isActive ? "secondary" : "ghost"}
//         className={cn(
//           "w-full h-12",
//           expanded ? "justify-start px-4 gap-3" : "justify-center px-0",
//           !isActive && "text-foreground",
//           isActive &&
//             "relative after:absolute after:inset-y-2 after:w-1 after:bg-primary",
//           isActive && i18n.dir() === "rtl"
//             ? "after:right-0 after:rounded-l-full"
//             : "after:left-0 after:rounded-r-full",
//           "[&_svg]:size-6" // Force icon size to be consistent
//         )}
//         asChild
//       >
//         <Link to={to}>
//           <Icon className="h-6 w-6 min-w-[24px] flex-shrink-0" />
//           <span
//             className={cn(
//               "transition-all duration-200 whitespace-nowrap min-w-0",
//               !expanded && "w-0 overflow-hidden",
//               !expanded ? "opacity-0" : "opacity-100"
//             )}
//           >
//             {children}
//           </span>
//         </Link>
//       </Button>
//     );
//   };

//   return (
//     <div
//       className={cn(
//         "flex flex-col transition-all duration-200",
//         inSheet ? "h-full" : "h-screen overflow-hidden py-4",
//         expanded ? expandedWidth : collapsedWidth
//       )}
//       dir={i18n.dir()}
//     >
//       <Link to="/" className="flex items-center gap-2 px-4 mb-6">
//         <Calculator className="h-6 w-6 text-primary flex-shrink-0" />
//         <h1
//           className={cn(
//             "text-lg font-bold dark:text-slate-100 whitespace-nowrap min-w-0",
//             "transition-all duration-200",
//             !expanded && "w-0 overflow-hidden",
//             !expanded ? "opacity-0" : "opacity-100"
//           )}
//         >
//           {t("appName")}
//         </h1>
//       </Link>

//       <nav
//         className={cn(
//           "flex-1 flex flex-col gap-1 overflow-y-auto overflow-x-hidden"
//         )}
//       >
//         <NavLink to="/" icon={Home}>
//           {t("menu.home")}
//         </NavLink>
//         <NavLink to="/add-transaction" icon={PlusCircle}>
//           {t("menu.addTransaction")}
//         </NavLink>
//         {/* <NavLink to="/analytics" icon={BarChart}>
//           {t("menu.analytics")}
//         </NavLink> */}
//         <NavLink to="/transactions-table" icon={Table}>
//           {t("menu.transactionsTable")}
//         </NavLink>
//         <NavLink to="/halacha" icon={Book}>
//           {t("menu.halacha")}
//         </NavLink>
//         <NavLink to="/settings" icon={Settings}>
//           {t("menu.settings")}
//         </NavLink>
//         <NavLink to="/about" icon={Info}>
//           {t("menu.about")}
//         </NavLink>
//       </nav>

//       {/* Combined bottom block for user info and platform indicator */}
//       <div className="mt-auto pt-4 border-t border-border/20 px-2">
//         {platform === "web" && session?.user && (
//           <div className="pb-2">
//             {" "}
//             {/* Adjusted: Removed individual mt-auto, pt-4, border-t. Added pb-2 for spacing if needed before PlatformIndicator */}
//             <Link
//               to="/profile"
//               aria-label={t("menu.profile")}
//               className={cn(
//                 "flex items-center p-2 rounded-md hover:bg-muted/50 transition-colors",
//                 expanded ? "gap-3" : "flex-col gap-1 justify-center text-center"
//               )}
//             >
//               {authLoading || profileLoading ? (
//                 <>
//                   <Skeleton
//                     className={cn(
//                       "rounded-full flex-shrink-0",
//                       expanded ? "h-10 w-10" : "h-9 w-9"
//                       // Removed !expanded && "mb-1" to control spacing more directly
//                     )}
//                   />
//                   {expanded && (
//                     <div className="flex flex-col gap-1 w-full">
//                       <Skeleton className="h-4 w-3/4" />
//                       <Skeleton className="h-3 w-full" />
//                     </div>
//                   )}
//                 </>
//               ) : profileAvatarUrl ? (
//                 <img
//                   src={profileAvatarUrl}
//                   alt={profileFullName || "User Avatar"}
//                   className={cn(
//                     "rounded-full flex-shrink-0 object-cover",
//                     expanded ? "h-10 w-10" : "h-9 w-9"
//                   )}
//                 />
//               ) : (
//                 <div
//                   className={cn(
//                     "rounded-full bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0",
//                     expanded ? "h-10 w-10" : "h-9 w-9"
//                     // Removed !expanded && "mb-1"
//                   )}
//                 >
//                   <User className="h-6 w-6" />
//                 </div>
//               )}
//               {!authLoading && !profileLoading && (
//                 <div
//                   className={cn(
//                     "flex flex-col text-sm transition-all duration-200",
//                     expanded ? "items-start" : "hidden"
//                   )}
//                 >
//                   {profileFullName && (
//                     <span className="font-semibold">{profileFullName}</span>
//                   )}
//                   {/* {session.user.email && (
//                     <span className="text-xs text-muted-foreground">
//                       {session.user.email}
//                     </span>
//                   )} */}
//                 </div>
//               )}
//             </Link>
//           </div>
//         )}
//         <PlatformIndicator expanded={expanded} />
//       </div>
//     </div>
//   );
// }

// Version 2 of the sidebar, with the slider and the indicator

// import React, { useState, useEffect, useRef } from "react";
// import { useTranslation } from "react-i18next";
// import {
//   Calculator,
//   Home,
//   PlusCircle,
//   Settings,
//   Info,
//   User,
//   Book,
//   BarChart,
//   Table,
// } from "lucide-react";
// import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
// import { Button } from "@/components/ui/button";
// import { cn } from "@/lib/utils";
// import { PlatformIndicator } from "./PlatformIndicator";
// import { usePlatform } from "@/contexts/PlatformContext";
// import { useAuth } from "@/contexts/AuthContext";
// import { supabase } from "@/lib/supabaseClient";
// import { Skeleton } from "@/components/ui/skeleton";

// interface SidebarProps {
//   expanded?: boolean;
//   inSheet?: boolean;
// }

// export function Sidebar({ expanded = false, inSheet = false }: SidebarProps) {
//   const currentPath = useRouterState({ select: (s) => s.location.pathname });
//   const { platform } = usePlatform();
//   const { session, loading: authLoading } = useAuth();
//   const navigate = useNavigate();
//   const { t, i18n } = useTranslation("navigation");

//   const [profileFullName, setProfileFullName] = useState<string | null>(null);
//   const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
//   const [profileLoading, setProfileLoading] = useState<boolean>(false);

//   const navRef = useRef<HTMLElement | null>(null);
//   const [sliderStyle, setSliderStyle] = useState({
//     opacity: 0,
//     top: 0,
//     height: 0,
//   });

//   const expandedWidth = inSheet ? "w-32" : "w-52";
//   const collapsedWidth = "w-16";

//   useEffect(() => {
//     const updateSlider = () => {
//       if (!navRef.current) return;
//       const activeButton = navRef.current.querySelector(
//         '[data-active="true"]'
//       ) as HTMLAnchorElement;

//       if (activeButton) {
//         setSliderStyle({
//           opacity: 1,
//           top: activeButton.offsetTop,
//           height: activeButton.clientHeight,
//         });
//       } else {
//         // Hide slider if no active button is found
//         setSliderStyle((s) => ({ ...s, opacity: 0 }));
//       }
//     };

//     // Use a short timeout to allow the DOM to update before calculating position
//     const timerId = setTimeout(updateSlider, 50);
//     window.addEventListener("resize", updateSlider);

//     return () => {
//       clearTimeout(timerId);
//       window.removeEventListener("resize", updateSlider);
//     };
//   }, [currentPath, expanded, i18n.dir()]); // Rerun on path, expansion, or language direction change

//   useEffect(() => {
//     if (platform === "web" && session && session.user && !authLoading) {
//       let isMounted = true;
//       setProfileLoading(true);
//       setProfileFullName(null);
//       setProfileAvatarUrl(null);
//       logger.log("[Sidebar] Fetching profile for user ID:", session?.user?.id);

//       async function fetchSidebarProfile() {
//         if (!session || !session.user) {
//           logger.log("[Sidebar] No session or user, aborting fetch.");
//           if (isMounted) setProfileLoading(false);
//           return;
//         }
//         try {
//           logger.log(
//             `[Sidebar] Attempting to fetch profile for ID: ${session.user.id}`
//           );
//           const { data, error } = await supabase
//             .from("profiles")
//             .select(`full_name, avatar_url`)
//             .eq("id", session.user.id)
//             .single();

//           logger.log("[Sidebar] Supabase response:", { data, error });

//           if (error && error.code !== "PGRST116") {
//             logger.error("[Sidebar] Supabase error:", error);
//             throw error;
//           }
//           if (isMounted) {
//             if (data) {
//               logger.log("[Sidebar] Profile data received:", data);
//               setProfileFullName(data.full_name);
//               setProfileAvatarUrl(data.avatar_url);
//             } else {
//               logger.log(
//                 "[Sidebar] No profile data received (data is null/undefined)."
//               );
//             }
//           }
//         } catch (err) {
//           logger.error(
//             "[Sidebar] Error in fetchSidebarProfile catch block:",
//             err
//           );
//         } finally {
//           if (isMounted) {
//             logger.log(
//               "[Sidebar] Fetch finished, setting profileLoading to false."
//             );
//             setProfileLoading(false);
//           }
//         }
//       }
//       fetchSidebarProfile();
//       return () => {
//         isMounted = false;
//       };
//     } else {
//       setProfileLoading(false);
//       setProfileFullName(null);
//       setProfileAvatarUrl(null);
//     }
//   }, [platform, session, authLoading]);

//   const NavLink = ({
//     to,
//     icon: Icon,
//     children,
//   }: {
//     to: string;
//     icon: React.ElementType;
//     children: React.ReactNode;
//   }) => {
//     const isActive =
//       to === "/" ? currentPath === to : currentPath.startsWith(to);

//     return (
//       <Button
//         variant="ghost" // All buttons are ghost, the background is the slider
//         className={cn(
//           "w-full h-12 z-10", // z-10 to be on top of the slider
//           "transition-colors duration-200",
//           expanded ? "justify-start px-4 gap-3" : "justify-center px-0",
//           isActive
//             ? "text-secondary-foreground hover:bg-transparent" // Active text, no hover background
//             : "text-foreground", // Inactive will get hover from 'ghost' variant
//           "[&_svg]:size-6"
//         )}
//         asChild
//       >
//         <Link to={to} data-active={isActive}>
//           <Icon className="h-6 w-6 min-w-[24px] flex-shrink-0" />
//           <span
//             className={cn(
//               "transition-all duration-200 whitespace-nowrap min-w-0",
//               !expanded && "w-0 overflow-hidden",
//               !expanded ? "opacity-0" : "opacity-100"
//             )}
//           >
//             {children}
//           </span>
//         </Link>
//       </Button>
//     );
//   };

//   return (
//     <div
//       className={cn(
//         "flex flex-col transition-all duration-200",
//         inSheet ? "h-full" : "h-screen overflow-hidden py-4",
//         expanded ? expandedWidth : collapsedWidth
//       )}
//       dir={i18n.dir()}
//     >
//       <Link to="/" className="flex items-center gap-2 px-4 mb-6">
//         <Calculator className="h-6 w-6 text-primary flex-shrink-0" />
//         <h1
//           className={cn(
//             "text-lg font-bold dark:text-slate-100 whitespace-nowrap min-w-0",
//             "transition-all duration-200",
//             !expanded && "w-0 overflow-hidden",
//             !expanded ? "opacity-0" : "opacity-100"
//           )}
//         >
//           {t("appName")}
//         </h1>
//       </Link>

//       <nav
//         ref={navRef}
//         className={cn(
//           "flex-1 flex flex-col gap-1 overflow-y-auto overflow-x-hidden p-1", // Added padding
//           "relative" // Needed for the absolute positioned slider
//         )}
//       >
//         {/* The combined sliding background and indicator */}
//         <div
//           className="absolute z-0 bg-secondary rounded-md transition-all duration-200 ease-in-out"
//           style={{
//             opacity: sliderStyle.opacity,
//             height: `${sliderStyle.height}px`,
//             transform: `translateY(${sliderStyle.top}px)`,
//             left: "0.25rem", // Corresponds to p-1
//             right: "0.25rem", // Corresponds to p-1
//             top: 0, // Base position for the transform
//           }}
//         >
//           {/* The side indicator is now part of the slider */}
//           <div
//             className={cn(
//               "absolute inset-y-2 w-1 bg-primary",
//               i18n.dir() === "rtl"
//                 ? "right-0 rounded-l-full"
//                 : "left-0 rounded-r-full"
//             )}
//           />
//         </div>

//         <NavLink to="/" icon={Home}>
//           {t("menu.home")}
//         </NavLink>
//         <NavLink to="/add-transaction" icon={PlusCircle}>
//           {t("menu.addTransaction")}
//         </NavLink>
//         {/* <NavLink to="/analytics" icon={BarChart}>
//           {t("menu.analytics")}
//         </NavLink> */}
//         <NavLink to="/transactions-table" icon={Table}>
//           {t("menu.transactionsTable")}
//         </NavLink>
//         <NavLink to="/halacha" icon={Book}>
//           {t("menu.halacha")}
//         </NavLink>
//         <NavLink to="/settings" icon={Settings}>
//           {t("menu.settings")}
//         </NavLink>
//         <NavLink to="/about" icon={Info}>
//           {t("menu.about")}
//         </NavLink>
//       </nav>

//       {/* Combined bottom block for user info and platform indicator */}
//       <div className="mt-auto pt-4 border-t border-border/20 px-2">
//         {platform === "web" && session?.user && (
//           <div className="pb-2">
//             {" "}
//             {/* Adjusted: Removed individual mt-auto, pt-4, border-t. Added pb-2 for spacing if needed before PlatformIndicator */}
//             <Link
//               to="/profile"
//               aria-label={t("menu.profile")}
//               className={cn(
//                 "flex items-center p-2 rounded-md hover:bg-muted/50 transition-colors",
//                 expanded ? "gap-3" : "flex-col gap-1 justify-center text-center"
//               )}
//             >
//               {authLoading || profileLoading ? (
//                 <>
//                   <Skeleton
//                     className={cn(
//                       "rounded-full flex-shrink-0",
//                       expanded ? "h-10 w-10" : "h-9 w-9"
//                       // Removed !expanded && "mb-1" to control spacing more directly
//                     )}
//                   />
//                   {expanded && (
//                     <div className="flex flex-col gap-1 w-full">
//                       <Skeleton className="h-4 w-3/4" />
//                       <Skeleton className="h-3 w-full" />
//                     </div>
//                   )}
//                 </>
//               ) : profileAvatarUrl ? (
//                 <img
//                   src={profileAvatarUrl}
//                   alt={profileFullName || "User Avatar"}
//                   className={cn(
//                     "rounded-full flex-shrink-0 object-cover",
//                     expanded ? "h-10 w-10" : "h-9 w-9"
//                   )}
//                 />
//               ) : (
//                 <div
//                   className={cn(
//                     "rounded-full bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0",
//                     expanded ? "h-10 w-10" : "h-9 w-9"
//                     // Removed !expanded && "mb-1"
//                   )}
//                 >
//                   <User className="h-6 w-6" />
//                 </div>
//               )}
//               {!authLoading && !profileLoading && (
//                 <div
//                   className={cn(
//                     "flex flex-col text-sm transition-all duration-200",
//                     expanded ? "items-start" : "hidden"
//                   )}
//                 >
//                   {profileFullName && (
//                     <span className="font-semibold">{profileFullName}</span>
//                   )}
//                   {/* {session.user.email && (
//                     <span className="text-xs text-muted-foreground">
//                       {session.user.email}
//                     </span>
//                   )} */}
//                 </div>
//               )}
//             </Link>
//           </div>
//         )}
//         <PlatformIndicator expanded={expanded} />
//       </div>
//     </div>
//   );
// }

// Version 3 of the sidebar
import { useState, useLayoutEffect, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Calculator,
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

  const expandedWidth = inSheet ? "w-32" : "w-52";
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
          if (process.env.NODE_ENV !== "production") {
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

    return (
      <Button
        variant="ghost"
        className={cn(
          "w-full h-12 z-10",
          "transition-colors duration-200",
          expanded ? "justify-start px-4 gap-3" : "justify-center px-0",
          isActive
            ? "text-secondary-foreground hover:bg-transparent"
            : "text-foreground",
          "[&_svg]:size-6"
        )}
        asChild
      >
        <Link to={to} data-active={isActive}>
          <Icon className="h-6 w-6 min-w-[24px] flex-shrink-0" />
          <span
            className={cn(
              "transition-all duration-200 whitespace-nowrap min-w-0",
              !expanded && "w-0 overflow-hidden",
              !expanded ? "opacity-0" : "opacity-100"
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
        "flex flex-col transition-all duration-200",
        inSheet ? "h-full" : "h-screen overflow-hidden py-4",
        expanded ? expandedWidth : collapsedWidth
      )}
      dir={i18n.dir()}
    >
      <Link to="/" className="flex items-center gap-2 px-4 mb-6">
        <Calculator className="h-6 w-6 text-primary flex-shrink-0" />
        <h1
          className={cn(
            "text-lg font-bold dark:text-slate-100 whitespace-nowrap min-w-0",
            "transition-all duration-200",
            !expanded && "w-0 overflow-hidden",
            !expanded ? "opacity-0" : "opacity-100"
          )}
        >
          {t("appName")}
        </h1>
      </Link>

      {/* Parent wrapper (non-scroll) */}
      <div
        ref={listRef}
        className={cn(
          "relative flex-1 p-1", // not scrollable
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
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
        >
          <nav className="flex flex-col gap-1">
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
        <div className="my-2 h-px bg-border/20 -mx-1" />

        {/* Bottom-pinned Profile card (NOT inside the scroller) */}
        {platform === "web" && session?.user && (
          <Link
            to="/profile"
            data-active={currentPath.startsWith("/profile")}
            aria-label={t("menu.profile")}
            className={cn(
              "flex items-center p-2 rounded-md transition-colors relative z-10",
              "hover:bg-muted/50",
              expanded ? "gap-3" : "flex-col gap-1 justify-center text-center"
            )}
          >
            {authLoading || profileLoading ? (
              <>
                <Skeleton
                  className={cn(
                    "rounded-full flex-shrink-0",
                    expanded ? "h-10 w-10" : "h-9 w-9"
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
                loading="lazy"
                decoding="async"
                className={cn(
                  "rounded-full object-cover flex-shrink-0",
                  expanded ? "h-10 w-10" : "h-9 w-9"
                )}
              />
            ) : (
              <div
                className={cn(
                  "rounded-full bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0",
                  expanded ? "h-10 w-10" : "h-9 w-9"
                )}
              >
                <User className="h-6 w-6" />
              </div>
            )}

            {!authLoading && !profileLoading && (
              <div
                className={cn(
                  "flex flex-col text-sm transition-all duration-200 text-foreground",
                  expanded ? "items-start" : "hidden"
                )}
              >
                {profileFullName && (
                  <span className="font-semibold">{profileFullName}</span>
                )}
              </div>
            )}
          </Link>
        )}
      </div>

      {/* Bottom area (separate): platform indicator & border */}
      <div className="mt-auto pt-4 border-t border-border/20 px-2">
        <PlatformIndicator expanded={expanded} />
      </div>
    </div>
  );
}
