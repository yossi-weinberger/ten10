import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export const QuotesSection: React.FC = () => {
  const { t } = useTranslation("landing");
  const quotesRef = useScrollAnimation({ threshold: 0.1 });

  return (
    <section
      className="py-16 px-4 bg-gradient-to-r from-amber-50 to-orange-100 dark:from-amber-900 dark:to-orange-900"
      ref={quotesRef.ref}
    >
      <div className="container mx-auto max-w-4xl text-center">
        <motion.h2
          className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={
            quotesRef.isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }
          }
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
        >
          {t("quotes.title", "מהמקורות")}
        </motion.h2>
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg border-r-4 border-amber-500"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={
            quotesRef.isInView
              ? { opacity: 1, scale: 1 }
              : { opacity: 0, scale: 0.9 }
          }
          transition={{
            delay: 0.2,
            type: "spring",
            damping: 20,
            stiffness: 300,
          }}
        >
          <blockquote className="text-lg md:text-xl text-gray-700 dark:text-gray-300 italic mb-4">
            "{t("quotes.main", "עשר תעשר את כל תבואת זרעך היוצא השדה שנה שנה")}"
          </blockquote>
          <cite className="text-sm text-gray-500 dark:text-gray-400">
            {t("quotes.source", "דברים יד, כב")}
          </cite>
        </motion.div>
        <div className="mt-6 grid md:grid-cols-2 gap-6">
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border-r-4 border-blue-500"
            initial={{ opacity: 0, x: -30 }}
            animate={
              quotesRef.isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }
            }
            transition={{
              delay: 0.4,
              type: "spring",
              damping: 20,
              stiffness: 300,
            }}
          >
            <p className="text-gray-700 dark:text-gray-300 italic mb-2">
              "{t("quotes.chazal1", "המעשר מביא ברכה לבית")}"
            </p>
            <cite className="text-xs text-gray-500 dark:text-gray-400">
              {t("quotes.chazalSource1", "תלמוד בבלי, תענית ט.")}
            </cite>
          </motion.div>
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border-r-4 border-green-500"
            initial={{ opacity: 0, x: 30 }}
            animate={
              quotesRef.isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }
            }
            transition={{
              delay: 0.5,
              type: "spring",
              damping: 20,
              stiffness: 300,
            }}
          >
            <p className="text-gray-700 dark:text-gray-300 italic mb-2">
              "{t("quotes.chazal2", "נסני נא בזאת - בדבר המעשרות")}"
            </p>
            <cite className="text-xs text-gray-500 dark:text-gray-400">
              {t("quotes.chazalSource2", "מלאכי ג, י")}
            </cite>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

