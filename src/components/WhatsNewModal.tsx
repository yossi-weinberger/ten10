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
import { useRouterState } from "@tanstack/react-router";
import { PUBLIC_ROUTES } from "@/lib/constants";
import { useMediaQuery } from "@/hooks/use-media-query";
import { logger } from "@/lib/logger";
import {
  Wallet,
  Lock,
  Package,
  RefreshCw,
  Bug,
  Palette,
  AlertTriangle,
  Mail,
} from "lucide-react";

// CURRENT_WHATS_NEW_VERSION controls when the "What's New" modal is shown.
// - Bump this version string (e.g. "0.5.1" -> "0.6.0") whenever you change
//   the modal content in a way that users should see again.
// - This version is persisted per user to avoid re-showing the same release notes.
// - This is intentionally separate from package.json version (not every release has new features).
const CURRENT_WHATS_NEW_VERSION = "0.5.7";

interface FeatureItem {
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
}

const iconClass = "h-4 w-4 text-primary flex-shrink-0";

const newFeatures: FeatureItem[] = [
  {
    icon: <Wallet className={iconClass} />,
    titleKey: "features.paymentMethod.title",
    descriptionKey: "features.paymentMethod.description",
  },
  {
    icon: <Lock className={iconClass} />,
    titleKey: "features.appLock.title",
    descriptionKey: "features.appLock.description",
  },
];

const improvements: FeatureItem[] = [
  {
    icon: <Package className={iconClass} />,
    titleKey: "improvements.desktopInstaller.title",
    descriptionKey: "improvements.desktopInstaller.description",
  },
  {
    icon: <Palette className={iconClass} />,
    titleKey: "improvements.pdfColors.title",
    descriptionKey: "improvements.pdfColors.description",
  },
  {
    icon: <RefreshCw className={iconClass} />,
    titleKey: "improvements.recurringTransactions.title",
    descriptionKey: "improvements.recurringTransactions.description",
  },
  {
    icon: <Bug className={iconClass} />,
    titleKey: "improvements.bugFixes.title",
    descriptionKey: "improvements.bugFixes.description",
  },
];

const notices: FeatureItem[] = [
  {
    icon: <AlertTriangle className={iconClass} />,
    titleKey: "notices.multiCurrency.title",
    descriptionKey: "notices.multiCurrency.description",
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

  // Filter notices based on platform - email privacy only for web
  const visibleNotices: FeatureItem[] =
    platform === "web"
      ? [
          ...notices,
          {
            icon: <Mail className={iconClass} />,
            titleKey: "notices.emailPrivacy.title",
            descriptionKey: "notices.emailPrivacy.description",
          },
        ]
      : notices;

  const whatsNewContent = (
    <div className="flex flex-col gap-6 text-start">
      {/* New Features */}
      <section>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
          {t("sections.newFeatures")}
        </h3>
        <ul className="space-y-0 divide-y divide-border rounded-md border border-border bg-card">
          {newFeatures.map((feature, index) => (
            <li
              key={index}
              className="flex gap-3 px-3 py-2.5 first:pt-3 last:pb-3"
            >
              <span className="mt-0.5">{feature.icon}</span>
              <div className="min-w-0">
                <p className="font-medium text-sm text-foreground">
                  {t(feature.titleKey)}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t(feature.descriptionKey)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Improvements */}
      <section>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
          {t("sections.improvements")}
        </h3>
        <ul className="space-y-0 divide-y divide-border rounded-md border border-border bg-card">
          {improvements.map((item, index) => (
            <li
              key={index}
              className="flex gap-3 px-3 py-2.5 first:pt-3 last:pb-3"
            >
              <span className="mt-0.5">{item.icon}</span>
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

      {/* Important Notices */}
      <section>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
          {t("sections.important")}
        </h3>
        <ul className="space-y-2">
          {visibleNotices.map((notice, index) => (
            <li
              key={index}
              className="flex gap-3 rounded-md border border-border bg-muted/40 px-3 py-2.5 border-s-2 border-s-primary"
            >
              <span className="mt-0.5">{notice.icon}</span>
              <div className="min-w-0">
                <p className="font-medium text-sm text-foreground">
                  {t(notice.titleKey)}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t(notice.descriptionKey)}
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
