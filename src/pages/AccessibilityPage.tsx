import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useScrollAnimation, fadeInUp } from "@/hooks/useScrollAnimation";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accessibility,
  Keyboard,
  Eye,
  Volume2,
  MousePointer,
} from "lucide-react";

export function AccessibilityPage() {
  const { t, i18n } = useTranslation("accessibility");
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
          <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Accessibility className="h-8 w-8 text-teal-600" />
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
            {t("subtitle")}
          </motion.p>
        </motion.div>

        {/* Content */}
        <div className="space-y-8">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <Eye className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {t("visual.title")}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {t("visual.description")}
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ms-4">
                    <li>{t("visual.item1")}</li>
                    <li>{t("visual.item2")}</li>
                    <li>{t("visual.item3")}</li>
                    <li>{t("visual.item4")}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <Keyboard className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {t("keyboard.title")}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {t("keyboard.description")}
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ms-4">
                    <li>{t("keyboard.item1")}</li>
                    <li>{t("keyboard.item2")}</li>
                    <li>{t("keyboard.item3")}</li>
                    <li>{t("keyboard.item4")}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <Volume2 className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {t("screenReaders.title")}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {t("screenReaders.description")}
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ms-4">
                    <li>{t("screenReaders.item1")}</li>
                    <li>{t("screenReaders.item2")}</li>
                    <li>{t("screenReaders.item3")}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <MousePointer className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {t("navigation.title")}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    {t("navigation.description")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {t("standards.title")}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t("standards.description")}
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ms-4">
                <li>{t("standards.item1")}</li>
                <li>{t("standards.item2")}</li>
                <li>{t("standards.item3")}</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {t("feedback.title")}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t("feedback.description")}
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
