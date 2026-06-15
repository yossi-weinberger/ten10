import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
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
import { HeroShaderBackground } from "../components/HeroShaderBackground";
import { HeroScrollIndicator } from "../components/ScrollIndicators";
import { TextRoll } from "../components/TextRoll";

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

  return (
    <motion.section
      id="hero"
      ref={sectionRef}
      className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#EFEFEF] text-foreground dark:bg-background"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <HeroShaderBackground />
      <HeroScrollIndicator />

      {/* Logo — pinned at the top */}
      <motion.div
        className="relative z-20 flex justify-center px-4 pt-20 md:pt-24"
        variants={scaleIn}
      >
        <AnimatedLogo />
      </motion.div>

      {/* Tagline + subtitle + buttons — centred in the remaining space */}
      {/* pb-28 sm:pb-24 ensures scroll indicator never overlaps, and shifts the
          visual centre of the flex-1 area upward so content reads as centred   */}
      <motion.div
        className="relative z-20 flex flex-1 flex-col items-center justify-center px-4 pb-28 sm:pb-24 md:pb-20"
        variants={staggerContainer}
      >
        <motion.h1
          className="mb-6 max-w-4xl text-balance text-center text-4xl font-bold text-primary md:text-6xl"
          variants={fadeInUp}
        >
          {t("hero.tagline")}
        </motion.h1>

        <motion.p
          className="mx-auto mb-10 max-w-3xl text-center text-xl leading-relaxed text-muted-foreground"
          variants={fadeInUp}
        >
          {t("hero.subtitle")}
        </motion.p>

        <motion.div
          className="flex flex-col items-center gap-4 sm:flex-row"
          variants={staggerContainer}
        >
          <motion.div variants={staggerItem}>
            <motion.div whileHover={buttonHover} whileTap={buttonTap}>
              <Button
                size="lg"
                className="group min-w-[200px] border-none bg-primary px-8 py-3 text-lg text-primary-foreground shadow-soft hover:bg-primary/90"
                onClick={() => {
                  onDownloadClick("hero");
                  document
                    .getElementById("download")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <Download className="me-2 h-5 w-5 shrink-0" />
                <TextRoll
                  className="h-[28px]"
                  lineClassName="h-[28px] leading-[28px] text-lg"
                >
                  {t("hero.downloadButton")}
                </TextRoll>
              </Button>
            </motion.div>
          </motion.div>

          <motion.div variants={staggerItem}>
            <motion.div whileHover={buttonHover} whileTap={buttonTap}>
              <Button
                size="lg"
                variant="outline"
                className="group min-w-[200px] border-primary/20 px-8 py-3 text-lg text-primary hover:bg-primary/5"
                onClick={onWebAppClick}
                asChild
              >
                <Link
                  to="/"
                  className="inline-flex items-center justify-center"
                  aria-label={t("hero.tryButton")}
                >
                  <Globe className="me-2 h-5 w-5 shrink-0" />
                  <TextRoll
                    className="h-[28px]"
                    lineClassName="h-[28px] leading-[28px] text-lg"
                  >
                    {t("hero.tryButton")}
                  </TextRoll>
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.section>
  );
};
