import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { features } from "../constants/features";

interface FeaturesSectionProps {
  sectionRef: React.RefObject<HTMLElement>;
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({
  sectionRef,
}) => {
  const { t } = useTranslation("landing");
  const featuresRef = useScrollAnimation({ threshold: 0.1 });

  return (
    <section
      id="features"
      ref={sectionRef}
      className="py-20 px-4 bg-white dark:bg-gray-800 relative overflow-hidden"
    >
      {/* Background decoration */}
      <motion.div
        className="absolute top-10 right-10 w-80 h-80 bg-blue-200 dark:bg-blue-800 rounded-full opacity-40 filter blur-2xl"
        animate={{
          scale: [1, 1.3, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Additional background decoration */}
      <motion.div
        className="absolute bottom-10 left-10 w-60 h-60 bg-purple-200 dark:bg-purple-800 rounded-full opacity-30 filter blur-2xl"
        animate={{
          scale: [1.2, 1, 1.2],
          rotate: [360, 180, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 3,
        }}
      />

      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="text-center mb-16" ref={featuresRef.ref}>
          <motion.h2
            className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
            initial={{ opacity: 0, y: 30 }}
            animate={
              featuresRef.isInView
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 30 }
            }
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            {t("features.title")}
          </motion.h2>
          <motion.p
            className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={
              featuresRef.isInView
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 30 }
            }
            transition={{
              delay: 0.1,
              type: "spring",
              damping: 20,
              stiffness: 300,
            }}
          >
            {t("features.subtitle")}
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={`feature-${index}`}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                delay: index * 0.1,
                type: "spring",
                damping: 20,
                stiffness: 300,
              }}
              whileHover={{ y: -8 }}
              whileTap={{ scale: 0.98 }}
              className="group"
            >
              <Card
                className="relative isolate overflow-hidden h-full hover:shadow-xl transition-all duration-300 cursor-pointer
               border-0 rounded-lg
               bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900
               hover:from-blue-50 hover:to-purple-50 dark:hover:from-gray-700 dark:hover:to-gray-800"
              >
                <CardHeader className="relative z-10">
                  <motion.div
                    className="text-blue-600 mb-2"
                    whileHover={{ scale: 1.2, rotate: 10, color: "#8B5CF6" }}
                    transition={{
                      type: "spring",
                      damping: 20,
                      stiffness: 300,
                    }}
                  >
                    <feature.icon className="h-8 w-8" />
                  </motion.div>
                  <CardTitle className="text-xl group-hover:text-blue-600 transition-colors duration-300">
                    {t(feature.titleKey)}
                  </CardTitle>
                </CardHeader>

                <CardContent className="relative z-10">
                  <CardDescription className="text-base group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
                    {t(feature.descriptionKey)}
                  </CardDescription>
                </CardContent>

                {/* Hover effect overlay */}
                <motion.div
                  className="pointer-events-none absolute inset-0 z-0
                 bg-gradient-to-r from-blue-500/10 to-purple-500/10
                 rounded-lg opacity-0 group-hover:opacity-100
                 transition-opacity duration-300"
                  initial={{ scale: 0.9 }}
                  whileHover={{ scale: 1 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                />
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
