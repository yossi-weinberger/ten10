import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePlatform } from "@/contexts/PlatformContext";
import { trackProductEvent } from "@/lib/analytics/productAnalytics";
import { cn } from "@/lib/utils";

type AuthLearnMoreVariant = "branded" | "compact";

interface AuthLearnMoreLinkProps {
  variant: AuthLearnMoreVariant;
  className?: string;
}

/**
 * Secondary web-only link from auth screens to the marketing landing page.
 * Hidden in the Tauri desktop build, where /landing is not a product entry path.
 */
export function AuthLearnMoreLink({
  variant,
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
    <Link
      to="/landing"
      className={cn(linkClassName(variant), className)}
      onClick={() => {
        trackProductEvent("login_learn_more_clicked");
      }}
    >
      <span>{t("layout.learnMore")}</span>
      <ArrowIcon className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

function linkClassName(variant: AuthLearnMoreVariant): string {
  switch (variant) {
    case "branded":
      return "inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50";
    case "compact":
      return "inline-flex items-center gap-2 rounded-full border border-white/15 bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}
