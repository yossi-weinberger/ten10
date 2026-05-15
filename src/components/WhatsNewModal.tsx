import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatform } from "@/contexts/PlatformContext";
import { useDonationStore } from "@/lib/store";
import { supabase } from "@/lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Link, useRouterState } from "@tanstack/react-router";
import { PUBLIC_ROUTES } from "@/lib/constants";
import { useMediaQuery } from "@/hooks/use-media-query";
import { logger } from "@/lib/logger";
import { CURRENT_WHATS_NEW_VERSION } from "@/lib/whats-new-history";
import {
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  Sparkles,
  TableProperties,
} from "lucide-react";

interface FeatureItem {
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
}

const iconClass = "h-5 w-5 text-primary flex-shrink-0";

const highlights: FeatureItem[] = [
  {
    icon: <FileSpreadsheet className={iconClass} />,
    titleKey: "featured.highlights.files.title",
    descriptionKey: "featured.highlights.files.description",
  },
  {
    icon: <TableProperties className={iconClass} />,
    titleKey: "featured.highlights.mapping.title",
    descriptionKey: "featured.highlights.mapping.description",
  },
  {
    icon: <ClipboardCheck className={iconClass} />,
    titleKey: "featured.highlights.review.title",
    descriptionKey: "featured.highlights.review.description",
  },
];

interface WhatsNewModalProps {
  /** Force open the modal (manual trigger) */
  open?: boolean;
  /** Callback when modal is closed (for manual control) */
  onOpenChange?: (open: boolean) => void;
}

export function WhatsNewModal({
  open: forcedOpen,
  onOpenChange: onForcedOpenChange,
}: WhatsNewModalProps = {}) {
  const { t } = useTranslation("whats-new");
  const { user } = useAuth();
  const { platform } = usePlatform();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const updatePromiseRef = useRef<Promise<void> | null>(null);
  const isDesktopQuery = useMediaQuery("(min-width: 768px)");
  const [useDesktop, setUseDesktop] = useState(isDesktopQuery);

  // If forced open is provided, use it instead of auto-check
  // Only consider it "manually controlled" if both open and onOpenChange are provided
  const isManuallyControlled =
    forcedOpen !== undefined && onForcedOpenChange !== undefined;
  // Use forcedOpen if fully controlled, otherwise use local state
  const modalOpen = isManuallyControlled ? forcedOpen : isOpen;

  // Lock the variant (Drawer/Dialog) when the modal is open
  useEffect(() => {
    if (!modalOpen) setUseDesktop(isDesktopQuery);
  }, [isDesktopQuery, modalOpen]);

  // Define public paths where the modal should NOT appear
  const isPublicPath = PUBLIC_ROUTES.includes(currentPath);

  // Desktop state - get store reference once
  const store = useDonationStore();
  const updateSettings = store.updateSettings;
  const lastSeenVersion = store.settings.lastSeenVersion;

  // Extract user ID for proper dependency tracking
  const userId = user?.id;

  // Determine if component is in partial manual mode (only open prop, no callback)
  const isPartialManualMode =
    forcedOpen !== undefined && onForcedOpenChange === undefined;

  useEffect(() => {
    // Skip auto-check if fully manually controlled (both open and onOpenChange provided)
    if (isManuallyControlled) {
      setCheckingStatus(false);
      return;
    }

    // If only open is provided without callback, treat as local state control
    if (isPartialManualMode) {
      setIsOpen(forcedOpen!);
      setCheckingStatus(false);
      return;
    }

    const checkWhatsNewStatus = async () => {
      setCheckingStatus(true);

      // Don't show modal on public paths
      if (isPublicPath) {
        setIsOpen(false);
        setCheckingStatus(false);
        return;
      }

      if (platform === "loading") {
        setCheckingStatus(false);
        return; // Wait for platform detection
      }

      // For Desktop: Check local store (single user per device)
      if (platform === "desktop") {
        logger.log(
          `[WhatsNew] Desktop check: lastSeen=${lastSeenVersion}, current=${CURRENT_WHATS_NEW_VERSION}`,
        );
        if (!lastSeenVersion || lastSeenVersion < CURRENT_WHATS_NEW_VERSION) {
          setIsOpen(true);
        } else {
          setIsOpen(false);
        }
        setCheckingStatus(false);
        return;
      }

      // For Web: Always check DB to ensure per-user verification
      if (platform === "web") {
        if (!userId) {
          setIsOpen(false);
          setCheckingStatus(false);
          return;
        }

        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("last_seen_version")
            .eq("id", userId)
            .single();

          if (error) {
            logger.error("Error checking whats-new status:", error);
            // On error, don't block UX - let user proceed
            setIsOpen(false);
          } else {
            const lastSeen = data?.last_seen_version;
            logger.log(
              `[WhatsNew] Web check: lastSeen=${lastSeen}, current=${CURRENT_WHATS_NEW_VERSION}`,
            );
            if (!lastSeen || lastSeen < CURRENT_WHATS_NEW_VERSION) {
              setIsOpen(true);
            } else {
              setIsOpen(false);
            }
          }
        } catch (err) {
          logger.error("Unexpected error checking whats-new:", err);
          setIsOpen(false);
        } finally {
          setCheckingStatus(false);
        }
      }
    };

    checkWhatsNewStatus();
    // userId changes when user switches accounts - this triggers re-check
    // forcedOpen and onForcedOpenChange are needed for manual control mode
    // lastSeenVersion is needed for desktop mode to react to store changes
  }, [
    userId,
    platform,
    isPublicPath,
    isManuallyControlled,
    isPartialManualMode,
    lastSeenVersion,
    forcedOpen,
    onForcedOpenChange,
  ]);

  // Update DB/store in background (fire and forget)
  const updateLastSeenVersion = async () => {
    // Prevent concurrent execution by tracking the promise
    if (updatePromiseRef.current) {
      return updatePromiseRef.current;
    }

    setIsLoading(true);

    const updatePromise = (async () => {
      try {
        // Always update lastSeenVersion when modal is dismissed, regardless of control mode
        if (platform === "desktop") {
          // Update local store
          updateSettings({ lastSeenVersion: CURRENT_WHATS_NEW_VERSION });
          logger.log("[WhatsNew] Desktop: Updated lastSeenVersion in store");
        } else if (platform === "web" && user) {
          // Update Supabase
          const { error } = await supabase
            .from("profiles")
            .update({
              last_seen_version: CURRENT_WHATS_NEW_VERSION,
            })
            .eq("id", user.id);

          if (error) {
            throw error;
          }

          // Update local store for cache
          updateSettings({ lastSeenVersion: CURRENT_WHATS_NEW_VERSION });
          logger.log(
            "[WhatsNew] Web: Updated last_seen_version in DB and store",
          );
        }
      } catch (error) {
        logger.error("Failed to update lastSeenVersion:", error);
        // Continue even if save fails
      } finally {
        setIsLoading(false);
        updatePromiseRef.current = null;
      }
    })();

    updatePromiseRef.current = updatePromise;
    return updatePromise;
  };

  // Handle modal state update (immediate, synchronous)
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Modal is being closed - update state immediately for responsive UI
      // Use existing control-mode logic instead of recomputing it here
      if (isManuallyControlled && onForcedOpenChange) {
        // Fully manually controlled - delegate to parent
        onForcedOpenChange(false);
      } else {
        // Auto or partially controlled mode - close via local state
        setIsOpen(false);
      }

      // Update DB/store in background (fire and forget)
      updateLastSeenVersion();
    }
  };

  // Handle button click (same as handleOpenChange but for explicit button clicks)
  const handleDismiss = () => {
    handleOpenChange(false);
  };

  // Don't render anything while checking (unless manually controlled) or if not open
  // If forcedOpen is provided, component runs in manual mode (skip auto-check)
  const isManualMode = forcedOpen !== undefined;
  if (!isManualMode && !isOpen && !checkingStatus) return null;
  if (!isManualMode && checkingStatus) return null;

  const whatsNewContent = (
    <div className="flex flex-col gap-5 text-start">
      <section className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-sm">
        <div className="absolute -top-12 end-0 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div className="min-w-0 space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t("featured.badge")}
              </span>
              <div>
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  {t("featured.title")}
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {t("featured.description")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <ul className="grid gap-3">
          {highlights.map((item) => (
            <li
              key={item.titleKey}
              className="group flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-3 transition-colors hover:bg-muted/40"
            >
              <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 transition-transform group-hover:scale-105">
                {item.icon}
              </span>
              <div className="min-w-0">
                <p className="font-medium text-sm text-foreground">
                  {t(item.titleKey)}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t(item.descriptionKey)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );

  if (useDesktop) {
    return (
      <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg font-semibold text-foreground">
              {t("title", { version: CURRENT_WHATS_NEW_VERSION })}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {t("description")}
            </DialogDescription>
          </DialogHeader>
          {whatsNewContent}
          <DialogFooter className="sm:justify-center">
            <Button
              asChild
              variant="outline"
              className="w-full sm:w-auto min-w-[120px]"
            >
              <Link to="/changelog" onClick={handleDismiss}>
                <Sparkles className="h-4 w-4" />
                {t("historyButton")}
              </Link>
            </Button>
            <Button
              type="button"
              onClick={handleDismiss}
              disabled={isLoading}
              className="w-full sm:w-auto min-w-[120px]"
            >
              {isLoading ? t("dismissing") : t("dismissButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={modalOpen} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[95vh]">
        <DrawerHeader className="text-start space-y-1.5">
          <DrawerTitle className="text-lg font-semibold text-foreground">
            {t("title", { version: CURRENT_WHATS_NEW_VERSION })}
          </DrawerTitle>
          <DrawerDescription className="text-sm text-muted-foreground">
            {t("description")}
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-3 md:px-4 pb-4 overflow-y-auto">
          {whatsNewContent}
        </div>
        <DrawerFooter className="pt-2">
          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto min-w-[120px]"
          >
            <Link to="/changelog" onClick={handleDismiss}>
              <Sparkles className="h-4 w-4" />
              {t("historyButton")}
            </Link>
          </Button>
          <Button
            type="button"
            onClick={handleDismiss}
            disabled={isLoading}
            className="w-full sm:w-auto min-w-[120px]"
          >
            {isLoading ? t("dismissing") : t("dismissButton")}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
