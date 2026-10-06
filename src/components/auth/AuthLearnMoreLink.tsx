import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePlatform } from "@/contexts/PlatformContext";
import { trackProductEvent } from "@/lib/analytics/productAnalytics";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AuthLearnMoreLinkProps {
  variant?: "outline" | "ghost";
  className?: string;
}

/**
 * Secondary web-only link from auth screens to the marketing landing page.
 * Hidden in the Tauri desktop build, where /landing is not a product entry path.
 */
export function AuthLearnMoreLink({
  variant = "outline",
  className,
}: AuthLearnMoreLinkProps) {
  const { platform } = usePlatform();
  const { t, i18n } = useTranslation("auth");

  if (platform !== "web") {
    return null;
  }

  const isRtl = i18n.dir() === "rtl";
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  return (
    <Button variant={variant} size="sm" asChild className={cn("rounded-full", className)}>
      <Link
        to="/landing"
        onClick={() => {
          trackProductEvent("login_learn_more_clicked");
        }}
      >
        <span>{t("layout.learnMore")}</span>
        <ArrowIcon className="h-4 w-4" aria-hidden="true" />
      </Link>
    </Button>
  );
}
