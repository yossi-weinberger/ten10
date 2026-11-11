import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useScrollAnimation, fadeInUp } from "@/hooks/useScrollAnimation";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import {
  FileText,
  AlertCircle,
  Shield,
  CheckCircle,
  Lock,
  Globe,
  Brain,
  Database,
  UserX,
  Clock,
} from "lucide-react";

export function BetaTermsPage() {
  const { t, i18n } = useTranslation("betaTerms");
  const { ref: headerRef, isInView: headerIsInView } = useScrollAnimation({ threshold: 0.1 });

  return (
    <div className="min-h-screen" dir={i18n.dir()}>
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <motion.div
          className="text-center mb-12"
          ref={headerRef}
          initial="hidden"
          animate={headerIsInView ? "visible" : "hidden"}
          variants={fadeInUp}
        >
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-blue-600" />
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
                <Brain className="h-6 w-6 text-indigo-600 flex-shrink-0 mt-1" />
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
                <Database className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {t("dataCollection.title")}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {t("dataCollection.description")}
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ms-4">
                    <li>{t("dataCollection.item1")}</li>
                    <li>{t("dataCollection.item2")}</li>
                    <li>{t("dataCollection.item3")}</li>
                    <li>{t("dataCollection.item4")}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <Clock className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {t("retention.title")}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    {t("retention.description")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <Globe className="h-6 w-6 text-teal-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {t("processors.title")}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {t("processors.description")}
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ms-4">
                    <li>{t("processors.item1")}</li>
                    <li>{t("processors.item2")}</li>
                    <li>{t("processors.item3")}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <UserX className="h-6 w-6 text-rose-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {t("yourRights.title")}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    {t("yourRights.description")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <Shield className="h-6 w-6 text-green-700 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {t("security.title")}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    {t("security.description")}
                  </p>
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
              <div className="flex items-start gap-3">
                <Lock className="h-6 w-6 text-indigo-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {t("generalTerms.title")}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {t("generalTerms.description")}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">
                    <span>{t("generalTerms.linkPrefix")}</span>{" "}
                    <Link
                      to="/terms"
                      className="font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
                    >
                      {t("generalTerms.linkText")}
                    </Link>
                    <span>{t("generalTerms.linkSuffix")}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
