import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export const QuotesSection: React.FC = () => {
  const { t } = useTranslation("landing");
  const quotesRef = useScrollAnimation({ threshold: 0.1 });

  return (
    <section
      // Changed background to lighter brand colors (Emerald/Teal tint)
      className="py-16 px-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950"
      ref={quotesRef.ref}
    >
      <div className="container mx-auto max-w-4xl text-center">
        <motion.h2
          className="text-2xl md:text-3xl font-bold text-emerald-900 dark:text-emerald-100 mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={
            quotesRef.isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }
          }
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
        >
          {t("quotes.title")}
        </motion.h2>
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg border-r-4 border-emerald-500"
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
            "{t("quotes.main")}"
          </blockquote>
          <cite className="text-sm text-gray-500 dark:text-gray-400">
            {t("quotes.source")}
          </cite>
        </motion.div>
        <div className="mt-6 grid md:grid-cols-2 gap-6">
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border-r-4 border-teal-500"
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
              "{t("quotes.chazal1")}"
            </p>
            <cite className="text-xs text-gray-500 dark:text-gray-400">
              {t("quotes.chazalSource1")}
            </cite>
          </motion.div>
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border-r-4 border-cyan-500"
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
              "{t("quotes.chazal2")}"
            </p>
            <cite className="text-xs text-gray-500 dark:text-gray-400">
              {t("quotes.chazalSource2")}
            </cite>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
