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
  Zap,
  Bell,
  Shield,
  WifiOff,
  HardDrive,
  Check,
} from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

interface PlatformsSectionProps {
  sectionRef: React.RefObject<HTMLElement | null>;
}

interface PlatformCardProps {
  icon: React.ElementType;
  iconGradient: string;
  title: string;
  subtitle: string;
  features: { icon: React.ElementType; text: string }[];
  buttonText: string;
  buttonVariant: "primary" | "outline";
  buttonAction: () => void;
  buttonAsLink?: boolean;
  linkTo?: string;
  accentColor: string;
  delay: number;
  isInView: boolean;
}

const PlatformCard: React.FC<PlatformCardProps> = ({
  icon: Icon,
  iconGradient,
  title,
  subtitle,
  features,
  buttonText,
  buttonVariant,
  buttonAction,
  buttonAsLink,
  linkTo,
  accentColor,
  delay,
  isInView,
}) => {
  const buttonContent = (
    <>
      {buttonVariant === "primary" ? (
        <Download className="w-5 h-5 me-2" />
      ) : (
        <Globe className="w-5 h-5 me-2" />
      )}
      {buttonText}
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="group h-full"
    >
      <div
        className={cn(
          "h-full bg-card border border-border rounded-2xl overflow-hidden",
          "transition-all duration-300",
          "hover:shadow-lg hover:border-primary/20"
        )}
      >
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-4 mb-4">
            <div
              className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center shadow-md",
                iconGradient
              )}
            >
              <Icon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="px-6 pb-4">
          <div className="space-y-2">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.3, delay: delay + 0.1 + index * 0.05 }}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg",
                  "bg-muted/40 hover:bg-muted/70 transition-colors"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    accentColor
                  )}
                >
                  <feature.icon className="w-4 h-4" />
                </div>
                <span className="text-sm text-foreground/90">{feature.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 mt-auto">
          <motion.div whileHover={buttonHover} whileTap={buttonTap}>
            {buttonAsLink && linkTo ? (
              <Button
                variant={buttonVariant === "primary" ? "default" : "outline"}
                className={cn(
                  "w-full py-5 text-base font-medium",
                  buttonVariant === "primary"
                    ? "bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 text-primary-foreground shadow-md"
                    : "border-2 hover:border-primary/50 hover:bg-primary/5"
                )}
                asChild
              >
                <Link to={linkTo} className="inline-flex items-center justify-center">
                  {buttonContent}
                </Link>
              </Button>
            ) : (
              <Button
                variant={buttonVariant === "primary" ? "default" : "outline"}
                className={cn(
                  "w-full py-5 text-base font-medium",
                  buttonVariant === "primary"
                    ? "bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 text-primary-foreground shadow-md"
                    : "border-2 hover:border-primary/50 hover:bg-primary/5"
                )}
                onClick={buttonAction}
              >
                {buttonContent}
              </Button>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export const PlatformsSection: React.FC<PlatformsSectionProps> = ({
  sectionRef,
}) => {
  const { t } = useTranslation("landing");
  const contentRef = useRef(null);
  const isInView = useInView(contentRef, { once: true, margin: "-100px" });

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
    { icon: Shield, text: "פרטיות מלאה - הנתונים נשארים אצלך" },
    { icon: Check, text: "ללא צורך ברישום או הרשמה" },
  ];

  return (
    <section
      id="platforms"
      ref={sectionRef}
      className="py-24 px-4 relative overflow-hidden bg-muted/30"
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,theme(colors.primary/0.03)_1px,transparent_0)] bg-[size:32px_32px] pointer-events-none" />

      <div className="container mx-auto max-w-5xl relative" ref={contentRef}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance">
            {t("platforms.title")}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            שתי דרכים להשתמש במערכת — בחר את זו שמתאימה לסגנון העבודה שלך
          </p>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          {/* Desktop Version Card */}
          <PlatformCard
            icon={Monitor}
            iconGradient="bg-gradient-to-br from-primary to-emerald-600"
            title={t("platforms.desktop.title")}
            subtitle={t("platforms.desktop.subtitle")}
            features={desktopFeatures}
            buttonText={t("platforms.desktop.button")}
            buttonVariant="primary"
            buttonAction={() => {
              document
                .getElementById("download")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            accentColor="bg-primary/10 text-primary"
            delay={0.2}
            isInView={isInView}
          />

          {/* Web Version Card */}
          <PlatformCard
            icon={Globe}
            iconGradient="bg-gradient-to-br from-sky-500 to-cyan-600"
            title={t("platforms.web.title")}
            subtitle={t("platforms.web.subtitle")}
            features={webFeatures}
            buttonText={t("platforms.web.button")}
            buttonVariant="outline"
            buttonAction={() => {}}
            buttonAsLink
            linkTo="/"
            accentColor="bg-sky-500/10 text-sky-600"
            delay={0.3}
            isInView={isInView}
          />
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center text-muted-foreground text-sm mt-10"
        >
          ניתן להעביר נתונים בין הגרסאות בקלות דרך ייצוא וייבוא קובץ גיבוי
        </motion.p>
      </div>
    </section>
  );
};
