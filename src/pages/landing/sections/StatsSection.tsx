import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  useScrollAnimation,
  fadeInUp,
  staggerContainer,
  staggerItem,
} from "@/hooks/useScrollAnimation";
import { useCountUp } from "@/hooks/useCountUp";

export const StatsSection: React.FC = () => {
  const { t } = useTranslation("landing");
  const statsRef = useScrollAnimation({ threshold: 0.3 });

  // Animated counters for stats
  const downloadsCount = useCountUp({ end: 1850, duration: 2500, delay: 500 });
  const websiteUsersCount = useCountUp({
    end: 2450,
    duration: 2500,
    delay: 700,
  });

  return (
    <motion.section
      className="py-16 px-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white relative overflow-hidden"
      ref={statsRef.ref}
      initial="hidden"
      animate={statsRef.isInView ? "visible" : "hidden"}
      variants={staggerContainer}
    >
      {/* Animated background elements */}
      <motion.div
        className="absolute top-0 left-0 w-full h-full opacity-10"
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%"],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        style={{
          backgroundImage:
            "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />

      <div className="container mx-auto max-w-4xl relative z-10">
        <motion.div
          className="grid md:grid-cols-2 gap-8 text-center"
          variants={staggerContainer}
        >
          <motion.div variants={staggerItem}>
            <motion.div
              ref={downloadsCount.elementRef}
              className="text-4xl font-bold mb-2"
              whileHover={{ scale: 1.1 }}
              animate={{
                textShadow: [
                  "0 0 10px rgba(255,255,255,0.5)",
                  "0 0 20px rgba(255,255,255,0.8)",
                  "0 0 10px rgba(255,255,255,0.5)",
                ],
              }}
              transition={{
                textShadow: { duration: 2, repeat: Infinity },
                scale: { type: "spring", damping: 20, stiffness: 300 },
              }}
            >
              {downloadsCount.count.toLocaleString()}+
            </motion.div>
            <motion.p className="text-blue-100" variants={fadeInUp}>
              {t("stats.downloads")}
            </motion.p>
          </motion.div>

          <motion.div variants={staggerItem}>
            <motion.div
              ref={websiteUsersCount.elementRef}
              className="text-4xl font-bold mb-2"
              whileHover={{ scale: 1.1 }}
              animate={{
                textShadow: [
                  "0 0 10px rgba(255,255,255,0.5)",
                  "0 0 20px rgba(255,255,255,0.8)",
                  "0 0 10px rgba(255,255,255,0.5)",
                ],
              }}
              transition={{
                textShadow: { duration: 2, repeat: Infinity, delay: 0.5 },
                scale: { type: "spring", damping: 20, stiffness: 300 },
              }}
            >
              {websiteUsersCount.count.toLocaleString()}+
            </motion.div>
            <motion.p className="text-blue-100" variants={fadeInUp}>
              {t("stats.websiteUsers")}
            </motion.p>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
};
