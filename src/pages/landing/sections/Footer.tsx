import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Accessibility } from "lucide-react";
import { LazyImage } from "@/components/ui/lazy-image";
import { Calculator } from "lucide-react";

export const Footer: React.FC = () => {
  const { t } = useTranslation("landing");

  return (
    <footer className="py-6 px-4 bg-gray-900 text-white">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-3">
            <LazyImage
              src="/icon-192.png"
              alt="Ten10 Logo"
              className="w-6 h-6 rounded-lg"
              placeholder={
                <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Calculator className="h-3 w-3 text-white" />
                </div>
              }
            />
            <p>&copy; 2025 Ten10. {t("footer.copyright")}.</p>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-white transition-colors">
              {t("footer.privacy")}
            </Link>
            <span className="text-gray-600">|</span>
            <Link to="/terms" className="hover:text-white transition-colors">
              {t("footer.terms")}
            </Link>
            <span className="text-gray-600">|</span>
            <Link
              to="/accessibility"
              className="flex items-center gap-1 hover:text-white transition-colors"
              aria-label={t("footer.accessibility")}
            >
              <Accessibility className="h-4 w-4" />
              <span className="hidden sm:inline">
                {t("footer.accessibility")}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
