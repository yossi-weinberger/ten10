import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import {
  fadeInUp,
  scaleIn,
  staggerContainer,
  staggerItem,
  buttonTap,
  buttonHover,
} from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";
import { Download, Globe } from "lucide-react";
import { AnimatedLogo } from "../components/AnimatedLogo";

interface HeroSectionProps {
  sectionRef: React.RefObject<HTMLElement | null>;
  onDownloadClick: (platform: string) => void;
  onWebAppClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  sectionRef,
  onDownloadClick,
  onWebAppClick,
}) => {
  const { t } = useTranslation("landing");
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      id="hero"
      ref={sectionRef}
      className="relative overflow-hidden bg-background px-4 pb-12 pt-20 text-foreground md:pb-16 md:pt-24"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <div className="absolute inset-0 bg-noise opacity-[0.05] dark:opacity-[0.035]" />
      <div className="absolute inset-x-0 top-0 h-px bg-border" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-border" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_32%),radial-gradient(circle_at_bottom_right,hsl(var(--accent)/0.10),transparent_32%)]" />
      <motion.div
        className="absolute -start-24 top-12 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
        animate={reduceMotion ? undefined : { scale: [1, 1.08, 1], opacity: [0.55, 0.8, 0.55] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -end-20 bottom-10 h-64 w-64 rounded-full bg-accent/20 blur-3xl"
        animate={reduceMotion ? undefined : { y: [0, -12, 0], opacity: [0.4, 0.65, 0.4] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />
      <div className="absolute inset-x-10 top-[40%] h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />

      <motion.div
        className="container relative z-10 mx-auto max-w-6xl"
        variants={staggerContainer}
      >
        <div className="text-center">
          <motion.div className="mb-10" variants={scaleIn}>
            <AnimatedLogo />
          </motion.div>

          <motion.div
            className="mb-6 text-balance text-4xl font-bold text-primary md:text-6xl"
            variants={fadeInUp}
            role="heading"
            aria-level={1}
          >
            {t("hero.tagline")}
          </motion.div>

          <motion.div
            className="mx-auto mb-8 max-w-3xl text-xl leading-relaxed text-muted-foreground"
            variants={fadeInUp}
          >
            {t("hero.subtitle")}
          </motion.div>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            variants={staggerContainer}
          >
            <motion.div variants={staggerItem}>
              <motion.div whileHover={buttonHover} whileTap={buttonTap}>
                <Button
                  size="lg"
                  className="min-w-[200px] border-none bg-primary px-8 py-3 text-lg text-primary-foreground shadow-soft hover:bg-primary/90"
                  onClick={() => {
                    onDownloadClick("hero");
                    document
                      .getElementById("download")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <Download className="mr-2 h-5 w-5" />
                  {t("hero.downloadButton")}
                </Button>
              </motion.div>
            </motion.div>

            <motion.div variants={staggerItem}>
              <motion.div whileHover={buttonHover} whileTap={buttonTap}>
                <Button
                  size="lg"
                  variant="outline"
                  className="min-w-[200px] border-primary/20 px-8 py-3 text-lg text-primary hover:bg-primary/5"
                  onClick={onWebAppClick}
                  asChild
                >
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center"
                    aria-label={t("hero.tryButton")}
                  >
                    <Globe className="mr-2 h-5 w-5" />
                    {t("hero.tryButton")}
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </motion.section>
  );
};
