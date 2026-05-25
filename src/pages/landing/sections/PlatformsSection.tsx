import { motion, useInView } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { buttonHover, buttonTap } from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";
import {
  Globe,
  Monitor,
  Download,
  Cloud,
  Mail,
  Smartphone,
  Wifi,
  WifiOff,
  HardDrive,
  Zap,
  Bell,
  Shield,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { useRef } from "react";

interface PlatformsSectionProps {
  sectionRef: React.RefObject<HTMLElement | null>;
}

export const PlatformsSection: React.FC<PlatformsSectionProps> = ({
  sectionRef,
}) => {
  const { t, i18n } = useTranslation("landing");
  const contentRef = useRef(null);
  const isInView = useInView(contentRef, { once: true, margin: "-100px" });
  const isRTL = i18n.dir() === "rtl";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const webFeatures = [
    { icon: Globe, text: t("platforms.web.features.0") },
    { icon: Cloud, text: t("platforms.web.features.1") },
    { icon: Mail, text: t("platforms.web.features.2") },
    { icon: Zap, text: t("platforms.web.features.3") },
    { icon: Shield, text: t("platforms.web.features.5") },
    { icon: Smartphone, text: t("platforms.web.features.6") },
  ];

  const desktopFeatures = [
    { icon: WifiOff, text: t("platforms.desktop.features.0") },
    { icon: HardDrive, text: t("platforms.desktop.features.1") },
    { icon: Zap, text: t("platforms.desktop.features.2") },
    { icon: Bell, text: t("platforms.desktop.features.3") },
  ];

  return (
    <section
      id="platforms"
      ref={sectionRef}
      className="py-24 px-4 relative overflow-hidden bg-gradient-to-b from-background via-muted/30 to-background"
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 start-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 end-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto max-w-6xl relative" ref={contentRef}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance">
            {t("platforms.title")}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            שתי דרכים להשתמש במערכת — בחר את זו שמתאימה לסגנון העבודה שלך
          </p>
        </motion.div>

        {/* Main comparison layout */}
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          {/* Web Version Card */}
          <motion.div
            initial={{ opacity: 0, x: isRTL ? 50 : -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="group relative"
          >
            <div className="h-full bg-card border border-border rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-xl hover:border-primary/30">
              {/* Card header with icon */}
              <div className="relative p-8 pb-6">
                <div className="flex items-start gap-5">
                  <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-sky-500/25">
                    <Globe className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-2xl font-bold text-foreground mb-1">
                      {t("platforms.web.title")}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {t("platforms.web.subtitle")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Features grid */}
              <div className="px-8 pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {webFeatures.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={isInView ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 0.4, delay: 0.3 + index * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <feature.icon className="w-5 h-5 text-sky-600 flex-shrink-0" />
                      <span className="text-sm text-foreground/90">
                        {feature.text}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="px-8 pb-8">
                <motion.div whileHover={buttonHover} whileTap={buttonTap}>
                  <Button
                    variant="outline"
                    className="w-full py-6 text-base font-medium border-2 hover:border-sky-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-all group/btn"
                    asChild
                  >
                    <Link
                      to="/"
                      className="inline-flex items-center justify-center gap-2"
                    >
                      <Globe className="w-5 h-5" />
                      {t("platforms.web.button")}
                      <ArrowIcon className="w-4 h-4 transition-transform group-hover/btn:translate-x-1 rtl:group-hover/btn:-translate-x-1" />
                    </Link>
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Desktop Version Card */}
          <motion.div
            initial={{ opacity: 0, x: isRTL ? -50 : 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="group relative"
          >
            {/* Highlight ring for desktop */}
            <div className="absolute -inset-[2px] bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />

            <div className="relative h-full bg-card border-2 border-emerald-500/50 rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-xl hover:shadow-emerald-500/10">
              {/* Card header with icon */}
              <div className="relative p-8 pb-6">
                <div className="flex items-start gap-5">
                  <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <Monitor className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-2xl font-bold text-foreground mb-1">
                      {t("platforms.desktop.title")}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {t("platforms.desktop.subtitle")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Features with emphasis */}
              <div className="px-8 pb-6">
                <div className="space-y-3">
                  {desktopFeatures.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
                      animate={isInView ? { opacity: 1, x: 0 } : {}}
                      transition={{ duration: 0.4, delay: 0.4 + index * 0.08 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <feature.icon className="w-5 h-5 text-emerald-600" />
                      </div>
                      <span className="text-base text-foreground font-medium">
                        {feature.text}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Offline indicator */}
              <div className="px-8 pb-4">
                <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-emerald-500/10 text-emerald-600 text-sm font-medium">
                  <WifiOff className="w-4 h-4" />
                  <span>עובד גם ללא אינטרנט</span>
                </div>
              </div>

              {/* CTA */}
              <div className="px-8 pb-8">
                <motion.div whileHover={buttonHover} whileTap={buttonTap}>
                  <Button
                    className="w-full py-6 text-base font-medium bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all group/btn"
                    onClick={() => {
                      document
                        .getElementById("download")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    <Download className="w-5 h-5 me-2" />
                    {t("platforms.desktop.button")}
                    <ArrowIcon className="w-4 h-4 ms-2 transition-transform group-hover/btn:translate-x-1 rtl:group-hover/btn:-translate-x-1" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center text-muted-foreground text-sm mt-10"
        >
          ניתן להעביר נתונים בין הגרסאות בקלות דרך ייצוא וייבוא קובץ גיבוי
        </motion.p>
      </div>
    </section>
  );
};
