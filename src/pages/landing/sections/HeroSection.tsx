import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  useScrollAnimation,
  fadeInUp,
  scaleIn,
  staggerContainer,
  staggerItem,
  buttonTap,
  buttonHover,
} from "@/hooks/useScrollAnimation";
import { FadeInWords } from "@/components/ui/animated-text";
import { Button } from "@/components/ui/button";
import { Download, Globe } from "lucide-react";
import { ScreenshotCarousel } from "../components/ScreenshotCarousel";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  sectionRef: React.RefObject<HTMLElement>;
  onDownloadClick: (platform: string) => void;
  onWebAppClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  sectionRef,
  onDownloadClick,
  onWebAppClick,
}) => {
  const { t } = useTranslation("landing");
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, -100]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.8]);
  const heroRef = useScrollAnimation({ threshold: 0.2 });

  return (
    <motion.section
      id="hero"
      ref={sectionRef}
      style={{ y: heroY, opacity: heroOpacity }}
      className="relative overflow-hidden py-20 px-4 parallax-container"
    >
      {/* Enhanced Background decoration - Restored Floating Blobs */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-emerald-900 opacity-50 animate-gradient"></div>

      <motion.div
        className="absolute top-20 left-10 w-72 h-72 bg-emerald-200 dark:bg-emerald-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-30"
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute bottom-20 right-10 w-72 h-72 bg-cyan-200 dark:bg-cyan-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-30"
        animate={{
          scale: [1.2, 1, 1.2],
          rotate: [360, 180, 0],
          opacity: [0.6, 0.3, 0.6],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      {/* Additional floating elements for more "wow" */}
      <motion.div
        className="absolute top-1/2 left-1/4 w-32 h-32 bg-teal-200 dark:bg-teal-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-2xl opacity-20"
        animate={{
          y: [-20, 20, -20],
          x: [-10, 10, -10],
          scale: [0.8, 1.1, 0.8],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="container mx-auto max-w-6xl relative z-10"
        ref={heroRef.ref}
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <div className="text-center mb-16">
          {/* Logo */}
          <motion.div className="mb-8" variants={scaleIn}>
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="inline-block"
            >
              <div className="inline-flex items-center justify-center p-3 sm:p-4 rounded-2xl bg-card/70 backdrop-blur-md border border-border/50 shadow-lg gpu-accelerated animate-pulse-glow">
                <img
                  src="/logo/logo-wide.svg"
                  alt="Ten10 Logo"
                  loading="eager"
                  decoding="async"
                  className="h-16 sm:h-20 w-auto object-contain"
                />
              </div>
            </motion.div>
          </motion.div>

          <motion.h1
            className="text-4xl md:text-6xl font-bold text-primary mb-6"
            variants={fadeInUp}
          >
            <FadeInWords delay={0.3}>{t("hero.tagline")}</FadeInWords>
          </motion.h1>

          <motion.p
            className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto"
            variants={fadeInUp}
          >
            <FadeInWords delay={0.6}>{t("hero.subtitle")}</FadeInWords>
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            variants={staggerContainer}
          >
            <motion.div variants={staggerItem}>
              <motion.div whileHover={buttonHover} whileTap={buttonTap}>
                <Button
                  size="lg"
                  className={cn(
                    "text-lg px-8 py-3 border-none",
                    "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500",
                    "shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]",
                    "transition-shadow duration-300"
                  )}
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
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-3 backdrop-blur-sm bg-white/50 dark:bg-black/20 border-gray-200 dark:border-gray-700 hover:bg-white/80 dark:hover:bg-black/40"
                  onClick={onWebAppClick}
                  asChild
                >
                  <Link
                    to="/"
                    className="inline-flex items-center"
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

        {/* Screenshots Carousel */}
        <ScreenshotCarousel />
      </motion.div>
    </motion.section>
  );
};
