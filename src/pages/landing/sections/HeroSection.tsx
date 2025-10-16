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
import { FadeInWords, RevealText } from "@/components/ui/animated-text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LazyImage } from "@/components/ui/lazy-image";
import { Download, Globe, Calculator } from "lucide-react";
import { ScreenshotCarousel } from "../components/ScreenshotCarousel";

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
      {/* Enhanced Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 opacity-50 animate-gradient"></div>

      <motion.div
        className="absolute top-20 left-10 w-72 h-72 bg-blue-200 dark:bg-blue-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-30"
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
        className="absolute bottom-20 right-10 w-72 h-72 bg-purple-200 dark:bg-purple-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-30"
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

      {/* Additional floating elements */}
      <motion.div
        className="absolute top-1/2 left-1/4 w-32 h-32 bg-green-200 dark:bg-green-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-2xl opacity-20"
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
        animate={heroRef.isInView ? "visible" : "hidden"}
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
              <LazyImage
                src="/icon-512.png"
                alt="Ten10 Logo"
                className="w-24 h-24 mx-auto rounded-2xl shadow-lg gpu-accelerated animate-pulse-glow"
                placeholder={
                  <div className="w-24 h-24 mx-auto bg-blue-100 dark:bg-blue-900 rounded-2xl flex items-center justify-center animate-pulse">
                    <Calculator className="h-12 w-12 text-blue-600" />
                  </div>
                }
              />
            </motion.div>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <Badge
              variant="secondary"
              className="mb-4 text-sm font-medium animate-shimmer"
            >
              {t("hero.badge")}
            </Badge>
          </motion.div>

          <motion.h1
            className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6"
            variants={fadeInUp}
          >
            <motion.span
              className="gradient-text"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              Ten10
            </motion.span>{" "}
            -{" "}
            <FadeInWords delay={0.5}>
              {t("hero.title").replace("Ten10 - ", "")}
            </FadeInWords>
          </motion.h1>

          <motion.div variants={fadeInUp}>
            <RevealText
              className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto"
              delay={0.8}
            >
              {t("hero.subtitle")}
            </RevealText>
          </motion.div>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            variants={staggerContainer}
          >
            <motion.div variants={staggerItem}>
              <motion.div whileHover={buttonHover} whileTap={buttonTap}>
                <Button
                  size="lg"
                  className="text-lg px-8 py-3"
                  onClick={() => onDownloadClick("hero")}
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
                  className="text-lg px-8 py-3"
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

