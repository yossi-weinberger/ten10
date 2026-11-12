import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { usePlatform } from "@/contexts/PlatformContext";
import { supabase } from "@/lib/supabaseClient";
import { AI_BETA_TERMS_VERSION } from "@/lib/ai/beta-terms-version";
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
import { Link } from "@tanstack/react-router";
import { COMPACT_VIEWPORT_QUERY, useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

interface BetaTermsDialogProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function BetaTermsDialog({
  open,
  onAccept: onAcceptCallback,
  onDecline,
}: BetaTermsDialogProps) {
  const { t, i18n } = useTranslation("navigation");
  const { platform } = usePlatform();
  const [isLoading, setIsLoading] = useState(false);
  const isCompactNow = useMediaQuery(COMPACT_VIEWPORT_QUERY);
  const [useDrawer, setUseDrawer] = useState(isCompactNow);

  useEffect(() => {
    if (open) return;
    const timeoutId = window.setTimeout(() => setUseDrawer(isCompactNow), 0);
    return () => window.clearTimeout(timeoutId);
  }, [isCompactNow, open]);

  const handleAccept = async () => {
    setIsLoading(true);

    const metadata = {
      platform: platform === "loading" ? "web" : platform,
      locale: i18n.language,
    };

    try {
      const { error } = await supabase.rpc("accept_ai_beta_terms", {
        p_version: AI_BETA_TERMS_VERSION,
        p_metadata: metadata,
      });

      if (error) {
        throw error;
      }

      toast.success(t("aiIntake.betaTerms.acceptSuccess"));
      onAcceptCallback();
    } catch (error) {
      console.error("Failed to accept AI beta terms:", error);
      toast.error(t("aiIntake.betaTerms.acceptError"));
      // Keep dialog open and button usable for retry (fail closed)
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  const termsContent = (enlargedLink: boolean) => (
    <div className="flex flex-col gap-3 py-2 text-start">
      <p className="text-sm text-muted-foreground">
        {t("aiIntake.betaTerms.shortDescription")}
      </p>
      <p className="text-sm">
        <Link
          to="/beta-terms"
          target={platform === "web" ? "_blank" : undefined}
          className={cn(
            "font-medium text-primary hover:underline",
            enlargedLink && "inline-flex min-h-11 items-center",
          )}
        >
          {t("aiIntake.betaTerms.readFullTerms")}
        </Link>
      </p>
    </div>
  );

  if (!useDrawer) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          dir={i18n.dir()}
        >
          <DialogHeader>
            <DialogTitle>{t("aiIntake.betaTerms.title")}</DialogTitle>
            <DialogDescription>{t("aiIntake.betaTerms.description")}</DialogDescription>
          </DialogHeader>
          {termsContent(false)}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onDecline}
              disabled={isLoading}
              className="w-full sm:w-auto min-w-[120px]"
            >
              {t("aiIntake.betaTerms.declineButton")}
            </Button>
            <Button
              type="button"
              onClick={handleAccept}
              disabled={isLoading}
              className="w-full sm:w-auto min-w-[120px]"
            >
              {isLoading
                ? t("aiIntake.betaTerms.accepting")
                : t("aiIntake.betaTerms.acceptButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={() => {}} dismissible={false}>
      <DrawerContent className="max-h-[90vh]" dir={i18n.dir()}>
        <DrawerHeader className="text-start rtl:text-right ltr:text-left">
          <DrawerTitle>{t("aiIntake.betaTerms.title")}</DrawerTitle>
          <DrawerDescription>{t("aiIntake.betaTerms.description")}</DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-4">{termsContent(true)}</div>
        <DrawerFooter className="gap-2 pt-2 pb-[max(16px,calc(env(safe-area-inset-bottom)+12px))]">
          <Button
            type="button"
            onClick={handleAccept}
            disabled={isLoading}
            className="h-11 w-full"
          >
            {isLoading
              ? t("aiIntake.betaTerms.accepting")
              : t("aiIntake.betaTerms.acceptButton")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onDecline}
            disabled={isLoading}
            className="h-11 w-full border-none bg-[#f0c000] text-yellow-950 shadow-sm hover:bg-[#d9ad00]"
          >
            {t("aiIntake.betaTerms.declineButton")}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
