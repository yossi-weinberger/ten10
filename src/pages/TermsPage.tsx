import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useScrollAnimation, fadeInUp } from "@/hooks/useScrollAnimation";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, AlertCircle, Scale, CheckCircle } from "lucide-react";

export function TermsPage() {
  const { t, i18n } = useTranslation("terms");
  const headerRef = useScrollAnimation({ threshold: 0.1 });

  return (
    <div className="min-h-screen" dir={i18n.dir()}>
      <div className="container mx-auto max-w-4xl px-4 py-12">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          ref={headerRef.ref}
          initial="hidden"
          animate={headerRef.isInView ? "visible" : "hidden"}
          variants={fadeInUp}
        >
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-green-600" />
          </div>
          <motion.h1
            className="text-4xl font-bold text-gray-900 dark:text-white mb-4"
            variants={fadeInUp}
          >
            {t("title")}
          </motion.h1>
          <motion.p
            className="text-lg text-gray-600 dark:text-gray-300"
            variants={fadeInUp}
          >
            {t("lastUpdated")}
          </motion.p>
        </motion.div>

        {/* Content */}
        <div className="space-y-8">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {t("acceptance.title")}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    {t("acceptance.description")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <Scale className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {t("service.title")}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {t("service.description")}
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ms-4">
                    <li>{t("service.item1")}</li>
                    <li>{t("service.item2")}</li>
                    <li>{t("service.item3")}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {t("disclaimer.title")}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {t("disclaimer.description")}
                  </p>
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      {t("disclaimer.note")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {t("userResponsibilities.title")}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t("userResponsibilities.description")}
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ms-4">
                <li>{t("userResponsibilities.item1")}</li>
                <li>{t("userResponsibilities.item2")}</li>
                <li>{t("userResponsibilities.item3")}</li>
                <li>{t("userResponsibilities.item4")}</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {t("limitations.title")}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                {t("limitations.description")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {t("changes.title")}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                {t("changes.description")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {t("contact.title")}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                {t("contact.description")}
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                <a
                  href="mailto:contact@ten10-app.com"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  contact@ten10-app.com
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
