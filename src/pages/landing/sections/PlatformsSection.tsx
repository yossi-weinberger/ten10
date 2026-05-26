import { motion, type Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { buttonHover, buttonTap } from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Check,
  Cloud,
  Download,
  Globe,
  HardDrive,
  Mail,
  MessageCircleQuestion,
  Monitor,
  Shield,
  Smartphone,
  WifiOff,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformsSectionProps {
  sectionRef: React.RefObject<HTMLElement | null>;
}

type PlatformVariant = "desktop" | "web";

interface PlatformFeature {
  icon: LucideIcon;
  text: string;
}

interface PlatformCardProps {
  variant: PlatformVariant;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  label: string;
  features: PlatformFeature[];
  buttonText: string;
  buttonAsLink?: boolean;
  linkTo?: string;
  onButtonClick?: () => void;
}

const cardVariants: Record<
  PlatformVariant,
  {
    iconFrame: string;
    featureIcon: string;
    button: string;
    buttonVariant: "default" | "outline";
  }
> = {
  desktop: {
    iconFrame:
      "bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground shadow-md shadow-emerald-900/10",
    featureIcon: "bg-primary/10 text-primary",
    button:
      "bg-gradient-to-r from-primary to-emerald-600 text-primary-foreground shadow-md hover:from-primary/90 hover:to-emerald-600/90",
    buttonVariant: "default",
  },
  web: {
    iconFrame:
      "bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-md shadow-sky-900/10",
    featureIcon: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    button:
      "border-2 border-border hover:border-primary/50 hover:bg-primary/5",
    buttonVariant: "outline",
  },
};

const cardMotion: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const featureMotion: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

const PlatformCard: React.FC<PlatformCardProps> = ({
  variant,
  icon: Icon,
  title,
  subtitle,
  label,
  features,
  buttonText,
  buttonAsLink,
  linkTo,
  onButtonClick,
}) => {
  const styles = cardVariants[variant];
  const ButtonIcon = variant === "desktop" ? Download : Globe;

  const buttonContent = (
    <>
      <ButtonIcon className="me-2 h-5 w-5" />
      {buttonText}
    </>
  );

  return (
    <motion.div
      variants={cardMotion}
      className="group h-full"
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition-[border-color,box-shadow] duration-300 hover:border-primary/20 hover:shadow-lg">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl",
                styles.iconFrame
              )}
            >
              <Icon className="h-7 w-7" strokeWidth={1.7} />
            </div>
            <div className="min-w-0 text-start">
              <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground">
                {label}
              </p>
              <h3 className="mt-1 text-xl font-bold text-foreground">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
        </div>

        <motion.div
          className="space-y-2 px-6 pb-4"
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.04,
                delayChildren: 0.08,
              },
            },
          }}
        >
          {features.map((feature) => (
            <motion.div
              key={feature.text}
              variants={featureMotion}
              className="flex items-center gap-3 rounded-lg bg-muted/40 p-3 text-start transition-colors duration-200 hover:bg-muted/70"
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  styles.featureIcon
                )}
              >
                <feature.icon className="h-4 w-4" strokeWidth={1.8} />
              </div>
              <span className="text-sm leading-relaxed text-foreground/90">
                {feature.text}
              </span>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-auto px-6 pb-6">
          <motion.div whileHover={buttonHover} whileTap={buttonTap}>
            <Button
              variant={styles.buttonVariant}
              className={cn("w-full py-5 text-base font-medium", styles.button)}
              onClick={buttonAsLink ? undefined : onButtonClick}
              asChild={buttonAsLink}
            >
              {buttonAsLink && linkTo ? (
                <Link
                  to={linkTo}
                  className="inline-flex items-center justify-center"
                >
                  {buttonContent}
                </Link>
              ) : (
                buttonContent
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export const PlatformsSection: React.FC<PlatformsSectionProps> = ({
  sectionRef,
}) => {
  const { t, i18n } = useTranslation("landing");

  const webFeatures = t("platforms.web.features", {
    returnObjects: true,
  }) as string[];
  const desktopFeatures = t("platforms.desktop.features", {
    returnObjects: true,
  }) as string[];

  const webFeatureIcons = [
    Globe,
    Cloud,
    Mail,
    Zap,
    MessageCircleQuestion,
    Shield,
    Smartphone,
  ];
  const desktopFeatureIcons = [WifiOff, HardDrive, Zap, Bell, Shield, Check];

  const webFeatureItems: PlatformFeature[] = webFeatures.map((text, index) => ({
    text,
    icon: webFeatureIcons[index] ?? Check,
  }));

  const desktopFeatureItems: PlatformFeature[] = desktopFeatures.map(
    (text, index) => ({
      text,
      icon: desktopFeatureIcons[index] ?? Check,
    })
  );

  return (
    <section
      id="platforms"
      ref={sectionRef}
      className="relative overflow-hidden bg-muted/30 px-4 py-20 text-foreground md:py-24"
      dir={i18n.dir()}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,hsl(var(--primary)/0.04)_1px,transparent_0)] bg-[size:32px_32px]" />

      <div className="container relative mx-auto max-w-5xl">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -80px 0px" }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="text-balance text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
            {t("platforms.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            {t("platforms.subtitle")}
          </p>
        </motion.div>

        <motion.div
          className="grid items-stretch gap-6 md:grid-cols-2"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "0px 0px -80px 0px" }}
          transition={{ staggerChildren: 0.1 }}
        >
          <PlatformCard
            variant="desktop"
            icon={Monitor}
            title={t("platforms.desktop.title")}
            subtitle={t("platforms.desktop.subtitle")}
            label={t("platforms.desktop.label")}
            features={desktopFeatureItems}
            buttonText={t("platforms.desktop.button")}
            onButtonClick={() => {
              document
                .getElementById("download")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          />

          <PlatformCard
            variant="web"
            icon={Globe}
            title={t("platforms.web.title")}
            subtitle={t("platforms.web.subtitle")}
            label={t("platforms.web.label")}
            features={webFeatureItems}
            buttonText={t("platforms.web.button")}
            buttonAsLink
            linkTo="/"
          />
        </motion.div>

        <motion.p
          className="mt-10 text-center text-sm text-muted-foreground"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -80px 0px" }}
          transition={{ duration: 0.35, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {t("platforms.transferNote")}
        </motion.p>
      </div>
    </section>
  );
};
