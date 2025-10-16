import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  useScrollAnimation,
  fadeInUp,
  staggerContainer,
  staggerItem,
} from "@/hooks/useScrollAnimation";
import { CheckCircle } from "lucide-react";

interface AboutSectionProps {
  sectionRef: React.RefObject<HTMLElement>;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ sectionRef }) => {
  const { t } = useTranslation("landing");
  const aboutRef = useScrollAnimation({ threshold: 0.1 });

  return (
    <section
      id="about"
      ref={sectionRef}
      className="py-20 px-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900"
    >
      <div className="container mx-auto max-w-6xl">
        <motion.div
          className="text-center mb-16"
          ref={aboutRef.ref}
          variants={staggerContainer}
        >
          <motion.h2
            className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
            variants={fadeInUp}
          >
            {t("about.title", "אודות Ten10")}
          </motion.h2>
          <motion.p
            className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto"
            variants={fadeInUp}
          >
            {t(
              "about.subtitle",
              "פותח בשיתוף עם מכון תורת האדם לאדם ובהסכמת רבנים מובילים"
            )}
          </motion.p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 gap-12 items-center mb-16"
          variants={staggerContainer}
        >
          <motion.div variants={staggerItem}>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {t("about.partnership.title", "שיתוף עם מכון תורת האדם לאדם")}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              {t(
                "about.partnership.description",
                "Ten10 פותח בשיתוף עם מכון תורת האדם לאדם, המוביל בתחום ההלכה הפרקטית. המכון ליווה את הפיתוח ואישר את דיוק החישובים ההלכתיים."
              )}
            </p>
            <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {t("about.partnership.verified", "מאושר הלכתית")}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t("about.partnership.institute", "מכון תורת האדם לאדם")}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg"
            variants={staggerItem}
          >
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              {t("about.endorsements.title", "הסכמות רבנים")}
            </h4>
            <div className="space-y-6">
              <div className="border-r-4 border-blue-500 pr-4">
                <p className="text-gray-600 dark:text-gray-300 italic mb-2">
                  "
                  {t(
                    "about.endorsements.quote1",
                    "מערכת מצוינת לניהול מעשרות בדיוק ובקלות. מומלץ בחום."
                  )}
                  "
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t("about.endorsements.rabbi1", "הרב [שם הרב]")}
                </p>
              </div>

              <div className="border-r-4 border-green-500 pr-4">
                <p className="text-gray-600 dark:text-gray-300 italic mb-2">
                  "
                  {t(
                    "about.endorsements.quote2",
                    "כלי חשוב ומועיל לכל בית יהודי. החישובים מדויקים והממשק נוח."
                  )}
                  "
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t("about.endorsements.rabbi2", "הרב [שם הרב]")}
                </p>
              </div>

              <div className="border-r-4 border-purple-500 pr-4">
                <p className="text-gray-600 dark:text-gray-300 italic mb-2">
                  "
                  {t(
                    "about.endorsements.quote3",
                    "פתרון מקצועי ואמין לניהול מעשרות. ממליץ לכל המתלמידים שלי."
                  )}
                  "
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t("about.endorsements.rabbi3", "הרב [שם הרב]")}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

