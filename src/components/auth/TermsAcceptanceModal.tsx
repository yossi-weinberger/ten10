import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatform } from "@/contexts/PlatformContext";
import { useDonationStore } from "@/lib/store";
import { supabase } from "@/lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouterState, Link } from "@tanstack/react-router";
import { PUBLIC_ROUTES } from "@/lib/constants";

// Constants
const CURRENT_TERMS_VERSION = "v1.0"; // Update this when terms change significantly

export function TermsAcceptanceModal() {
  const { t } = useTranslation(["auth", "terms"]);
  const { user } = useAuth();
  const { platform } = usePlatform();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Define public paths where the modal should NOT appear
  const isPublicPath = PUBLIC_ROUTES.includes(currentPath);

  // Desktop state - get store reference once
  const store = useDonationStore();
  const updateSettings = store.updateSettings;

  // Extract user ID for proper dependency tracking
  const userId = user?.id;

  useEffect(() => {
    const checkTermsStatus = async () => {
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

      // Get fresh value from store (not stale closure)
      const currentTermsVersion = store.settings.termsAcceptedVersion;

      // For Desktop: Check local store (single user per device)
      if (platform === "desktop") {
        if (currentTermsVersion === CURRENT_TERMS_VERSION) {
          setIsOpen(false);
        } else {
          setIsOpen(true);
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
            .select("terms_accepted_at, terms_version")
            .eq("id", userId)
            .single();

          if (error) {
            console.error("Error checking terms status:", error);
            // On error, don't block UX - let user proceed
            setIsOpen(false);
          } else if (
            !data.terms_accepted_at ||
            data.terms_version !== CURRENT_TERMS_VERSION
          ) {
            setIsOpen(true);
          } else {
            setIsOpen(false);
          }
        } catch (err) {
          console.error("Unexpected error checking terms:", err);
          setIsOpen(false);
        } finally {
          setCheckingStatus(false);
        }
      }
    };

    checkTermsStatus();
    // userId changes when user switches accounts - this triggers re-check
  }, [userId, platform, isPublicPath, store]);

  const handleAccept = async () => {
    setIsLoading(true);
    const timestamp = new Date().toISOString();

    // Collect metadata for legal records
    const metadata = {
      local_time: new Date().toString(),
      time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      user_agent: navigator.userAgent,
      platform: platform,
    };

    try {
      if (platform === "desktop") {
        // Update local store
        updateSettings({ termsAcceptedVersion: CURRENT_TERMS_VERSION });
        setIsOpen(false);
        // toast.success(t("termsModal.success", "Terms accepted locally"));
      } else if (platform === "web" && user) {
        // Update Supabase with metadata
        const { error } = await supabase
          .from("profiles")
          .update({
            terms_accepted_at: timestamp,
            terms_version: CURRENT_TERMS_VERSION,
            terms_accepted_metadata: metadata,
          })
          .eq("id", user.id);

        if (error) {
          throw error;
        }

        // Update local store for cache
        updateSettings({ termsAcceptedVersion: CURRENT_TERMS_VERSION });
        setIsOpen(false);
        // toast.success(t("termsModal.success", "Terms accepted"));
      }
    } catch (error) {
      console.error("Failed to accept terms:", error);
      // toast.error(t("termsModal.error", "Failed to accept terms. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render anything while checking or if not open
  if (!isOpen && !checkingStatus) return null;
  // If checking, we might want to render nothing or a loading spinner.
  // Rendering nothing is safer to avoid flashing.
  if (checkingStatus) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("termsModal.title")}</DialogTitle>
          <DialogDescription>{t("termsModal.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4 text-start">
          <div className="text-sm text-muted-foreground">
            <span className="block mb-2">
              {t("signup.termsConsentPrefix")}{" "}
              <Link
                to="/terms"
                target="_blank"
                className="text-primary hover:underline"
              >
                {t("signup.termsConsentLink")}
              </Link>{" "}
              {t("signup.termsConsentSuffix")}
            </span>
            <span className="block">
              {t("terms:dataAndPrivacy.privacyLinkPrefix")}{" "}
              <Link
                to="/privacy"
                target="_blank"
                className="text-primary hover:underline"
              >
                {t("terms:dataAndPrivacy.privacyLinkText")}
              </Link>{" "}
              {t("terms:dataAndPrivacy.privacyLinkSuffix")}
            </span>
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button
            type="button"
            onClick={handleAccept}
            disabled={isLoading}
            className="w-full sm:w-auto min-w-[120px]"
          >
            {isLoading
              ? t("termsModal.accepting")
              : t("termsModal.acceptButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
