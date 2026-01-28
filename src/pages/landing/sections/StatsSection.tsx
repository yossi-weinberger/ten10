import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  useScrollAnimation,
  fadeInUp,
  staggerContainer,
  staggerItem,
} from "@/hooks/useScrollAnimation";
import { useCountUp } from "@/hooks/useCountUp";
import { usePublicStats } from "@/hooks/usePublicStats";

function formatStatsDate(isoDate: string, locale: string): string {
  if (!isoDate) return "";
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString(locale === "he" ? "he-IL" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export const StatsSection: React.FC = () => {
  const { t, i18n } = useTranslation("landing");
  const statsRef = useScrollAnimation({ threshold: 0.3 });
  const { stats, loading: statsLoading } = usePublicStats();
  const asOfDate = formatStatsDate(stats.updated_at, i18n.language);

  // Animated counters: use .github/public-stats.json (fallback while loading)
  const downloadsCount = useCountUp({
    end: statsLoading ? 1850 : stats.total_downloads,
    duration: 2500,
    delay: 500,
  });
  const websiteUsersCount = useCountUp({
    end: statsLoading ? 2450 : stats.website_users,
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
        {asOfDate && (
          <motion.p
            className="text-blue-200/80 text-sm mt-4 text-center"
            variants={fadeInUp}
          >
            {t("stats.asOf", { date: asOfDate })}
          </motion.p>
        )}
      </div>
    </motion.section>
  );
};
