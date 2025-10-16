import { useTranslation } from "react-i18next";
import { LazyImage } from "@/components/ui/lazy-image";
import { Calculator } from "lucide-react";

export const Footer: React.FC = () => {
  const { t } = useTranslation("landing");

  return (
    <footer className="py-12 px-4 bg-gray-900 text-white">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <LazyImage
                src="/icon-192.png"
                alt="Ten10 Logo"
                className="w-8 h-8 rounded-lg"
                placeholder={
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Calculator className="h-4 w-4 text-white" />
                  </div>
                }
              />
              <h3 className="text-xl font-bold text-blue-400">Ten10</h3>
            </div>
            <p className="text-gray-300">{t("footer.description")}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">{t("footer.product")}</h4>
            <ul className="space-y-2 text-gray-300">
              <li>{t("footer.links.features")}</li>
              <li>{t("footer.links.download")}</li>
              <li>{t("footer.links.support")}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">{t("footer.company")}</h4>
            <ul className="space-y-2 text-gray-300">
              <li>{t("footer.links.about")}</li>
              <li>{t("footer.links.contact")}</li>
              <li>{t("footer.links.privacy")}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">{t("footer.resources")}</h4>
            <ul className="space-y-2 text-gray-300">
              <li>{t("footer.links.halacha")}</li>
              <li>{t("footer.links.guides")}</li>
              <li>{t("footer.links.faq")}</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2025 Ten10. {t("footer.copyright")}.</p>
        </div>
      </div>
    </footer>
  );
};

