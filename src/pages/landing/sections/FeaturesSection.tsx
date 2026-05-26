import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { features, PlatformAvailability } from "../constants/features";
import { BentoGridItem } from "@/components/ui/bento-grid";
import { Spotlight } from "@/components/ui/spotlight";
import { Globe, Monitor } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FeaturesSectionProps {
  sectionRef: React.RefObject<HTMLElement | null>;
}

const PlatformIcon = ({ type }: { type: PlatformAvailability }) => {
  if (type === "web") return <Globe className="h-4 w-4 text-primary" />;
  if (type === "desktop")
    return <Monitor className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />;
  return null;
};

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({
  sectionRef,
}) => {
  const { t } = useTranslation("landing");

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative overflow-hidden bg-background px-4 py-20 text-foreground md:py-24"
    >
      <div className="absolute inset-0 bg-noise opacity-[0.035] dark:opacity-[0.03]" />
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="hsl(var(--primary) / 0.28)"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,hsl(var(--accent)/0.08),transparent_30%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-border" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-border" />

      <div className="container relative z-10 mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <motion.span
            className="mb-2 block text-sm font-semibold uppercase tracking-wider text-primary"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -80px 0px" }}
          >
            {t("features.eyebrow")}
          </motion.span>
          <motion.h2
            className="mb-6 text-balance text-4xl font-bold text-foreground md:text-5xl"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -80px 0px" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {t("features.title")}
          </motion.h2>
          <motion.p
            className="mx-auto max-w-2xl text-xl leading-relaxed text-muted-foreground"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -80px 0px" }}
            transition={{ duration: 0.35, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            {t("features.subtitle")}
          </motion.p>
        </div>

        <motion.div
          className="flex justify-center gap-6 mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "0px 0px -80px 0px" }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-sm">
            <Globe className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">
              {t("features.legend.web")}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-sm">
            <Monitor className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
            <span className="text-sm font-medium text-muted-foreground">
              {t("features.legend.desktop")}
            </span>
          </div>
        </motion.div>

        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
          <TooltipProvider>
            {features.map((feature, index) => (
              <motion.div
                key={feature.titleKey}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{
                  delay: index * 0.04,
                  duration: 0.35,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <BentoGridItem
                  title={t(feature.titleKey)}
                  description={t(feature.descriptionKey)}
                  header={
                    <div className="group relative aspect-square w-full overflow-hidden rounded-t-xl bg-muted">
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <feature.icon className="h-12 w-12 text-primary/20" />
                      </div>
                      <img
                        src={feature.imageSrc}
                        alt={t(feature.titleKey)}
                        className="absolute inset-0 z-10 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  }
                  icon={
                    <div className="flex gap-2">
                      {feature.availability.map((type) => (
                        <Tooltip key={type}>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">
                              <PlatformIcon type={type} />
                            </span>
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
                  className="h-full min-h-[300px] border-border bg-card dark:bg-card"
                />
              </motion.div>
            ))}
          </TooltipProvider>
        </div>
      </div>
    </section>
  );
};
