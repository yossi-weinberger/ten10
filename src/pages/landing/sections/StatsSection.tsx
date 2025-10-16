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
  const usersCount = useCountUp({ end: 10000, duration: 2500, delay: 500 });
  const moneyCount = useCountUp({ end: 50, duration: 2500, delay: 700 }); // 50M
  const donatedCount = useCountUp({ end: 25, duration: 2500, delay: 900 }); // 25M donated

  return (
    <motion.section
      className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-700 text-white relative overflow-hidden"
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
          className="grid md:grid-cols-3 gap-8 text-center"
          variants={staggerContainer}
        >
          <motion.div variants={staggerItem}>
            <motion.div
              ref={usersCount.elementRef}
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
              {usersCount.count.toLocaleString()}+
            </motion.div>
            <motion.p className="text-blue-100" variants={fadeInUp}>
              {t("stats.users")}
            </motion.p>
          </motion.div>

          <motion.div variants={staggerItem}>
            <motion.div
              ref={moneyCount.elementRef}
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
              ₪{moneyCount.count}M+
            </motion.div>
            <motion.p className="text-blue-100" variants={fadeInUp}>
              {t("stats.managed")}
            </motion.p>
          </motion.div>

          <motion.div variants={staggerItem}>
            <motion.div
              ref={donatedCount.elementRef}
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
                textShadow: { duration: 2, repeat: Infinity, delay: 1 },
                scale: { type: "spring", damping: 20, stiffness: 300 },
              }}
            >
              ₪{donatedCount.count}M+
            </motion.div>
            <motion.p className="text-blue-100" variants={fadeInUp}>
              {t("stats.donated")}
            </motion.p>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
};

