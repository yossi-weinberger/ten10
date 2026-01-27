import { useEffect, useState } from "react";
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
  Sparkles,
  ArrowRightLeft,
  Wallet,
  Calculator,
  ShieldCheck,
  Zap,
  AlertTriangle,
  Mail,
  Bug,
  Tag,
} from "lucide-react";

// CURRENT_WHATS_NEW_VERSION controls when the "What's New" modal is shown.
// - Bump this version string (e.g. "0.5.1" -> "0.6.0") whenever you change
//   the modal content in a way that users should see again.
// - This version is persisted per user to avoid re-showing the same release notes.
// - This is intentionally separate from package.json version (not every release has new features).
const CURRENT_WHATS_NEW_VERSION = "0.5.4";

interface FeatureItem {
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
}

const newFeatures: FeatureItem[] = [
  {
    icon: <Tag className="h-5 w-5 text-purple-500" />,
    titleKey: "features.categories.title",
    descriptionKey: "features.categories.description",
  },
  {
    icon: <ArrowRightLeft className="h-5 w-5 text-blue-500" />,
    titleKey: "features.currencyConversion.title",
    descriptionKey: "features.currencyConversion.description",
  },
  {
    icon: <Wallet className="h-5 w-5 text-green-500" />,
    titleKey: "features.openingBalance.title",
    descriptionKey: "features.openingBalance.description",
  },
];

const improvements: FeatureItem[] = [
  {
    icon: <Calculator className="h-5 w-5 text-purple-500" />,
    titleKey: "improvements.autoChomesh.title",
    descriptionKey: "improvements.autoChomesh.description",
  },
  {
    icon: <Zap className="h-5 w-5 text-yellow-500" />,
    titleKey: "improvements.performance.title",
    descriptionKey: "improvements.performance.description",
  },
  {
    icon: <ShieldCheck className="h-5 w-5 text-red-500" />,
    titleKey: "improvements.security.title",
    descriptionKey: "improvements.security.description",
  },
  {
    icon: <Bug className="h-5 w-5 text-green-500" />,
    titleKey: "improvements.bugFixes.title",
    descriptionKey: "improvements.bugFixes.description",
  },
];

const notices: FeatureItem[] = [
  {
    icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
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
  const isDesktopQuery = useMediaQuery("(min-width: 768px)");
  const [useDesktop, setUseDesktop] = useState(isDesktopQuery);

  // If forced open is provided, use it instead of auto-check
  const isManuallyControlled = forcedOpen !== undefined;
  const modalOpen = isManuallyControlled ? forcedOpen : isOpen;

  // Lock the variant (Drawer/Dialog) when the modal is open
  useEffect(() => {
    if (!isOpen) setUseDesktop(isDesktopQuery);
  }, [isDesktopQuery, isOpen]);

  // Define public paths where the modal should NOT appear
  const isPublicPath = PUBLIC_ROUTES.includes(currentPath);

  // Desktop state - get store reference once
  const store = useDonationStore();
  const updateSettings = store.updateSettings;

  // Extract user ID for proper dependency tracking
  const userId = user?.id;

  useEffect(() => {
    // Skip auto-check if manually controlled
    if (isManuallyControlled) {
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
        return; // Wait for platform detection
      }

      // For Desktop: Check local store (single user per device)
      if (platform === "desktop") {
        const lastSeen = store.settings.lastSeenVersion;
        logger.log(
          `[WhatsNew] Desktop check: lastSeen=${lastSeen}, current=${CURRENT_WHATS_NEW_VERSION}`,
        );
        if (!lastSeen || lastSeen < CURRENT_WHATS_NEW_VERSION) {
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
  }, [userId, platform, isPublicPath, store]);

  const handleDismiss = async () => {
    // If manually controlled, just call the callback
    if (isManuallyControlled && onForcedOpenChange) {
      onForcedOpenChange(false);
      return;
    }

    setIsLoading(true);

    try {
      if (platform === "desktop") {
        // Update local store
        updateSettings({ lastSeenVersion: CURRENT_WHATS_NEW_VERSION });
        setIsOpen(false);
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
        setIsOpen(false);
        logger.log("[WhatsNew] Web: Updated last_seen_version in DB and store");
      }
    } catch (error) {
      logger.error("Failed to dismiss whats-new:", error);
      // Still close the modal even if save fails
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render anything while checking (unless manually controlled) or if not open
  if (!isManuallyControlled && !isOpen && !checkingStatus) return null;
  if (!isManuallyControlled && checkingStatus) return null;

  // Filter notices based on platform - email privacy only for web
  const visibleNotices: FeatureItem[] =
    platform === "web"
      ? [
          ...notices,
          {
            icon: <Mail className="h-5 w-5 text-blue-400" />,
            titleKey: "notices.emailPrivacy.title",
            descriptionKey: "notices.emailPrivacy.description",
          },
        ]
      : notices;

  const whatsNewContent = (
    <div className="flex flex-col gap-4 md:gap-6 py-2 text-start">
      {/* New Features Section */}
      <div>
        <h3 className="text-base font-semibold text-primary mb-2 md:mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          {t("sections.newFeatures")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
          {newFeatures.map((feature, index) => (
            <div
              key={index}
              className="flex gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-muted/50"
            >
              <div className="flex-shrink-0 mt-0.5">{feature.icon}</div>
              <div className="min-w-0">
                <p className="font-medium text-sm md:text-base">
                  {t(feature.titleKey)}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {t(feature.descriptionKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Improvements Section */}
      <div>
        <h3 className="text-base font-semibold text-muted-foreground mb-2 md:mb-3">
          {t("sections.improvements")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {improvements.map((item, index) => (
            <div key={index} className="flex gap-2 md:gap-3 p-2">
              <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
              <div className="min-w-0">
                <p className="text-sm md:text-base">{t(item.titleKey)}</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {t(item.descriptionKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Important Notices Section */}
      <div>
        <h3 className="text-base font-semibold text-amber-600 dark:text-amber-400 mb-2 md:mb-3">
          {t("sections.important")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
          {visibleNotices.map((notice, index) => (
            <div
              key={index}
              className="flex gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
            >
              <div className="flex-shrink-0 mt-0.5">{notice.icon}</div>
              <div className="min-w-0">
                <p className="font-medium text-sm md:text-base">
                  {t(notice.titleKey)}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {t(notice.descriptionKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (useDesktop) {
    return (
      <Dialog open={modalOpen} onOpenChange={handleDismiss}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t("title", { version: CURRENT_WHATS_NEW_VERSION })}
            </DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
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
    <Drawer open={modalOpen} onOpenChange={handleDismiss}>
      <DrawerContent className="max-h-[95vh]">
        <DrawerHeader className="text-start">
          <DrawerTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("title", { version: CURRENT_WHATS_NEW_VERSION })}
          </DrawerTitle>
          <DrawerDescription>{t("description")}</DrawerDescription>
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
