import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { Spotlight } from "@/components/ui/spotlight";
import { features } from "../constants/features";
import { cn } from "@/lib/utils";

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
      className="py-24 px-4 bg-zinc-50 dark:bg-black relative overflow-hidden"
    >
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="rgba(59, 130, 246, 0.5)"
      />

      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="text-center mb-20" ref={featuresRef.ref}>
          <motion.h2
            className="text-4xl md:text-5xl font-bold text-neutral-800 dark:text-white mb-6"
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
            className="text-xl text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto"
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

        <BentoGrid className="max-w-4xl mx-auto">
          {features.map((feature, i) => (
            <BentoGridItem
              key={i}
              title={t(feature.titleKey)}
              description={t(feature.descriptionKey)}
              header={
                <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-neutral-200 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 items-center justify-center group-hover/bento:scale-105 transition-transform duration-200">
                  <feature.icon className="w-10 h-10 text-neutral-500 dark:text-neutral-300" />
                </div>
              }
              icon={<feature.icon className="h-4 w-4 text-neutral-500" />}
              className={cn(i === 0 || i === 3 ? "md:col-span-2" : "")}
            />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
};
