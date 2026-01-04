import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  useScrollAnimation,
  fadeInUp,
  staggerContainer,
  staggerItem,
} from "@/hooks/useScrollAnimation";
import { CheckCircle, ExternalLink } from "lucide-react";

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
            {t("about.title")}
          </motion.h2>
          <motion.p
            className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto"
            variants={fadeInUp}
          >
            {t("about.subtitle")}
          </motion.p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 gap-12 items-stretch mb-16"
          variants={staggerContainer}
        >
          <motion.div variants={staggerItem} className="flex flex-col">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {t("about.partnership.title")}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed flex-grow">
              {t("about.partnership.description")}
            </p>
            <div className="flex items-center justify-between gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {t("about.partnership.verified")}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t("about.partnership.institute")}
                  </p>
                </div>
              </div>
              <a
                href="https://veahavta-kamocha.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors flex-shrink-0"
              >
                {t("about.partnership.visitWebsite")}
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </motion.div>

          <motion.div
            className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg flex flex-col"
            variants={staggerItem}
          >
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              {t("about.endorsements.title")}
            </h4>
            <div className="space-y-6">
              <div className="border-r-4 border-blue-500 pr-4">
                <p className="text-gray-600 dark:text-gray-300 italic mb-2">
                  "{t("about.endorsements.quote1")}"
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t("about.endorsements.rabbi1")}
                </p>
              </div>

              {/* <div className="border-r-4 border-green-500 pr-4">
                <p className="text-gray-600 dark:text-gray-300 italic mb-2">
                  "{t("about.endorsements.quote2")}"
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t("about.endorsements.rabbi2")}
                </p>
              </div> */}

              {/* <div className="border-r-4 border-teal-500 pr-4">
                <p className="text-gray-600 dark:text-gray-300 italic mb-2">
                  "{t("about.endorsements.quote3")}"
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t("about.endorsements.rabbi3")}
                </p>
              </div> */}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
