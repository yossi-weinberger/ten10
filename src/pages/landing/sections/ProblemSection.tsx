import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { FileQuestion, Calculator, ListChecks } from "lucide-react";

export const ProblemSection = () => {
  const { t } = useTranslation("landing");
  const sectionRef = useScrollAnimation({ threshold: 0.2 });

  const challenges = [
    {
      icon: ListChecks,
      titleKey: "problem.items.forgot.title",
      descKey: "problem.items.forgot.desc",
    },
    {
      icon: FileQuestion,
      titleKey: "problem.items.confusion.title",
      descKey: "problem.items.confusion.desc",
    },
    {
      icon: Calculator,
      titleKey: "problem.items.excel.title",
      descKey: "problem.items.excel.desc",
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background gradient - matching hero style */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/50 via-white to-white dark:from-emerald-950/20 dark:via-gray-900 dark:to-gray-900" />

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-200 dark:via-emerald-800 to-transparent" />

      <div
        className="container mx-auto max-w-6xl px-4 relative z-10"
        ref={sectionRef.ref}
      >
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={
            sectionRef.isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
          }
          transition={{ duration: 0.6 }}
        >
          <motion.span
            className="inline-block px-4 py-1.5 mb-6 text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 rounded-full"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={
              sectionRef.isInView
                ? { opacity: 1, scale: 1 }
                : { opacity: 0, scale: 0.9 }
            }
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {t("problem.badge")}
          </motion.span>

          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            {t("problem.title")}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            {t("problem.subtitle")}
          </p>
        </motion.div>

        {/* Challenge Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {challenges.map((item, index) => (
            <motion.div
              key={index}
              className="group relative"
              initial={{ opacity: 0, y: 30 }}
              animate={
                sectionRef.isInView
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 30 }
              }
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            >
              {/* Card with emerald accent border */}
              <div className="h-full bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />

                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <item.icon
                    className="w-7 h-7 text-emerald-600 dark:text-emerald-400"
                    strokeWidth={1.5}
                  />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {t(item.titleKey)}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {t(item.descKey)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Transition text to solution */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          animate={
            sectionRef.isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
          }
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <p className="text-lg text-gray-500 dark:text-gray-400">
            {t("problem.transition")}
          </p>
        </motion.div>
      </div>
    </section>
  );
};
