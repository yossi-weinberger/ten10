import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { CloudOff, HelpCircle, Calculator } from "lucide-react";

export const ProblemSection = () => {
  const { t } = useTranslation("landing");
  const sectionRef = useScrollAnimation({ threshold: 0.2 });

  const problems = [
    {
      icon: Calculator,
      titleKey: "problem.items.excel.title",
      descKey: "problem.items.excel.desc",
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30",
    },
    {
      icon: HelpCircle,
      titleKey: "problem.items.confusion.title",
      descKey: "problem.items.confusion.desc",
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-100 dark:bg-orange-900/30",
    },
    {
      icon: CloudOff,
      titleKey: "problem.items.forgot.title",
      descKey: "problem.items.forgot.desc",
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-100 dark:bg-purple-900/30",
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-white to-neutral-50 dark:from-black dark:to-neutral-900 relative overflow-hidden">
      <div
        className="container mx-auto max-w-6xl px-4 relative z-10"
        ref={sectionRef.ref}
      >
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={
            sectionRef.isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
          }
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold text-neutral-800 dark:text-neutral-100 mb-6">
            {t("problem.title")}
          </h2>
          <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            {t("problem.subtitle")}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {problems.map((item, index) => (
            <motion.div
              key={index}
              className="bg-white dark:bg-neutral-800/50 rounded-2xl p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 border border-neutral-100 dark:border-neutral-800"
              initial={{ opacity: 0, y: 30 }}
              animate={
                sectionRef.isInView
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 30 }
              }
              transition={{ duration: 0.6, delay: index * 0.2 }}
            >
              <div
                className={`w-16 h-16 ${item.bg} rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3 transition-transform duration-300 group-hover:rotate-6`}
              >
                <item.icon className={`w-8 h-8 ${item.color}`} />
              </div>
              <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 mb-4">
                {t(item.titleKey)}
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {t(item.descKey)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
