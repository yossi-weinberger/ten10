import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { FileQuestion, Calculator, ListChecks } from "lucide-react";

export const ProblemSection = () => {
  const { t, i18n } = useTranslation("landing");

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
    <section
      className="relative overflow-hidden bg-white px-4 py-14 md:py-16 text-gray-950 dark:bg-gray-900 dark:text-gray-50"
      dir={i18n.dir()}
    >
      <div className="absolute inset-0 bg-noise opacity-[0.035] dark:opacity-[0.04]" />
      <div className="absolute inset-x-0 top-0 h-px bg-emerald-900/10 dark:bg-emerald-100/10" />

      <div className="container relative z-10 mx-auto max-w-7xl">
        <motion.div
          className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -80px 0px" }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="max-w-xl text-start">
            <p className="text-sm font-semibold tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              {t("problem.badge")}
            </p>

            <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-gray-950 dark:text-white md:text-5xl">
              {t("problem.title")}
            </h2>

            <p className="mt-5 text-base leading-relaxed text-gray-600 dark:text-gray-300 md:text-lg">
              {t("problem.subtitle")}
            </p>

            <div className="mt-6 inline-flex border-t border-emerald-900/20 pt-4 text-base font-semibold text-emerald-800 dark:border-emerald-100/20 dark:text-emerald-200">
              {t("problem.transition")}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-x-4 top-1/2 hidden h-px bg-emerald-900/10 dark:bg-emerald-100/10 lg:block" />

            <ol className="relative divide-y divide-gray-200 border-y border-gray-200 bg-[#fdfbf7]/60 dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-950/40">
              {challenges.map((item) => (
                <li
                  key={item.titleKey}
                  className="grid gap-4 px-5 py-5 md:grid-cols-[3.5rem_1fr] md:px-7"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-900/10 bg-white text-emerald-700 dark:border-emerald-100/10 dark:bg-gray-900 dark:text-emerald-300">
                    <item.icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white">
                      {t(item.titleKey)}
                    </h3>
                    <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-gray-300">
                      {t(item.descKey)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
