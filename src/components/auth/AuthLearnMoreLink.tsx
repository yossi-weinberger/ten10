import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { usePlatform } from "@/contexts/PlatformContext";
import { trackProductEvent } from "@/lib/analytics/productAnalytics";

/**
 * Secondary web-only link from auth screens to the marketing landing page.
 * Hidden in the Tauri desktop build, where /landing is not a product entry path.
 */
export function AuthLearnMoreLink() {
  const { platform } = usePlatform();
  const { t } = useTranslation("auth");

  if (platform !== "web") {
    return null;
  }

  return (
    <p className="text-center text-sm text-muted-foreground">
      <Link
        to="/landing"
        className="hover:text-foreground hover:underline underline-offset-4 transition-colors"
        onClick={() => {
          trackProductEvent("login_learn_more_clicked");
        }}
      >
        {t("layout.learnMore")}
      </Link>
    </p>
  );
}
