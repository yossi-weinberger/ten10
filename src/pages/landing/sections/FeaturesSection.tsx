import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { BentoGridItem } from "@/components/ui/bento-grid";
import { Spotlight } from "@/components/ui/spotlight";
import { features, PlatformAvailability } from "../constants/features";
import { Globe, Monitor } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FeaturesSectionProps {
  sectionRef: React.RefObject<HTMLElement>;
}

const PlatformIcon = ({ type }: { type: PlatformAvailability }) => {
  if (type === "web") return <Globe className="w-4 h-4 text-blue-500" />;
  if (type === "desktop") return <Monitor className="w-4 h-4 text-green-500" />;
  return null;
};

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
        <div className="text-center mb-12" ref={featuresRef.ref}>
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

        {/* Legend */}
        <motion.div
          className="flex justify-center gap-6 mb-12"
          initial={{ opacity: 0 }}
          animate={featuresRef.isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-4 py-2 rounded-full shadow-sm border border-zinc-200 dark:border-zinc-800">
            <Globe className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
              {t("features.legend.web")}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-4 py-2 rounded-full shadow-sm border border-zinc-200 dark:border-zinc-800">
            <Monitor className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
              {t("features.legend.desktop")}
            </span>
          </div>
        </motion.div>

        {/* Grid - 4 columns on large screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          <TooltipProvider>
            {features.map((feature, i) => (
              <BentoGridItem
                key={i}
                title={t(feature.titleKey)}
                description={t(feature.descriptionKey)}
                // Intentionally use the `header` slot as a visual/media area because BentoGridItem has no dedicated image prop; this lets us render a square image with a fallback icon while keeping the default content layout.
                header={
                  <div className="relative w-full aspect-square overflow-hidden bg-neutral-100 dark:bg-neutral-900 group rounded-t-xl">
                    {/* Fallback Icon if image fails/missing - placed behind image */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <feature.icon className="w-12 h-12 text-neutral-500/20 dark:text-neutral-300/20" />
                    </div>
                    {/* Image infrastructure - placed on top */}
                    <img
                      src={feature.imageSrc}
                      alt={t(feature.titleKey)}
                      className="relative z-10 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                }
                // Icon slot displays platform availability indicators
                icon={
                  <div className="flex gap-2">
                    {feature.availability.map((type) => (
                      <Tooltip key={type}>
                        <TooltipTrigger>
                          <PlatformIcon type={type} />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {type === "web"
                              ? t("features.legend.web")
                              : t("features.legend.desktop")}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                }
                className="h-full min-h-[300px]" // Ensure height
              />
            ))}
          </TooltipProvider>
        </div>
      </div>
    </section>
  );
};
