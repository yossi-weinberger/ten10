import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useScrollAnimation, fadeInUp } from "@/hooks/useScrollAnimation";
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield,
  Database,
  Lock,
  Eye,
  Mail,
  Globe,
  Building,
  Plane,
  Clock,
  Cookie,
  UserCheck,
} from "lucide-react";

export function PrivacyPage() {
  const { t, i18n } = useTranslation("privacy");
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
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
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
          {/* Service Owner */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <Building className="h-6 w-6 text-slate-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {t("serviceOwner.title")}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    {t("serviceOwner.description")}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">
                    {t("serviceOwner.contact")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Collection */}
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
                    <li>{t("dataCollection.item5")}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <Lock className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {t("dataStorage.title")}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {t("dataStorage.description")}
                  </p>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {t("dataStorage.web.title")}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {t("dataStorage.web.description")}
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white mt-4">
                      {t("dataStorage.desktop.title")}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {t("dataStorage.desktop.description")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* International Transfer */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <Plane className="h-6 w-6 text-sky-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {t("internationalTransfer.title")}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {t("internationalTransfer.description")}
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ms-4">
                    <li>{t("internationalTransfer.item1")}</li>
                    <li>{t("internationalTransfer.item2")}</li>
                    <li>{t("internationalTransfer.item3")}</li>
                  </ul>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                    {t("internationalTransfer.note")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Retention */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <Clock className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {t("dataRetention.title")}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {t("dataRetention.description")}
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ms-4">
                    <li>{t("dataRetention.item1")}</li>
                    <li>{t("dataRetention.item2")}</li>
                    <li>{t("dataRetention.item3")}</li>
                    <li>{t("dataRetention.item4")}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Usage */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <Eye className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {t("dataUsage.title")}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {t("dataUsage.description")}
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ms-4">
                    <li>{t("dataUsage.item1")}</li>
                    <li>{t("dataUsage.item2")}</li>
                    <li>{t("dataUsage.item3")}</li>
                    <li>{t("dataUsage.item4")}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {t("communications.title")}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {t("communications.description")}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">
                    {t("communications.unsubscribe")}
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
                    {t("analytics.title")}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {t("analytics.description")}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">
                    {t("analytics.note")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cookies */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <Cookie className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {t("cookies.title")}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {t("cookies.description")}
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ms-4">
                    <li>{t("cookies.item1")}</li>
                    <li>{t("cookies.item2")}</li>
                    <li>{t("cookies.item3")}</li>
                  </ul>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                    {t("cookies.note")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Age Requirement */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <UserCheck className="h-6 w-6 text-indigo-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {t("ageRequirement.title")}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    {t("ageRequirement.description")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Rights */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {t("userRights.title")}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t("userRights.description")}
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ms-4">
                <li>{t("userRights.item1")}</li>
                <li>{t("userRights.item2")}</li>
                <li>{t("userRights.item3")}</li>
                <li>{t("userRights.item4")}</li>
                <li>{t("userRights.item5")}</li>
              </ul>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {t("contact.title")}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
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
