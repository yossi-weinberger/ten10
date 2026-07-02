import { Button } from "@/components/ui/button";
import {
  Calculator,
  Heart,
  ExternalLink,
  Mail,
  Users,
  Building2,
  ArrowLeft,
  ArrowRight,
  Gift,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import {
  useScrollAnimation,
  staggerContainer,
  staggerItem,
} from "@/hooks/useScrollAnimation";

const panelClass =
  "relative flex h-full flex-col overflow-hidden border border-emerald-900/10 bg-white/80 p-6 shadow-sm transition-shadow duration-300 hover:border-emerald-900/20 hover:shadow-xl dark:border-emerald-100/10 dark:bg-gray-900/55 dark:hover:border-emerald-100/20 md:p-7";
const iconBadgeClass =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300";
const panelFooterClass =
  "mt-6 border-t border-emerald-900/10 pt-5 dark:border-emerald-100/10";
const insetBoxClass =
  "rounded-lg border border-emerald-900/10 bg-emerald-50/40 p-3 dark:border-emerald-100/10 dark:bg-emerald-950/15";
const TEAM_EMAIL = "dev@ten10-app.com";

export function AboutPage() {
  const { t, i18n } = useTranslation("about");
  const shouldReduceMotion = useReducedMotion();
  const cardsRef = useScrollAnimation({ threshold: 0.1 });
  const isRtl = i18n.dir() === "rtl";
  const LearnMoreIcon = isRtl ? ArrowLeft : ArrowRight;

  return (
    <div className="grid gap-6" dir={i18n.dir()}>
      <div className="grid gap-1">
        <h2 className="text-2xl font-bold text-foreground">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <section className="relative overflow-hidden rounded-xl border border-emerald-900/10 bg-[#fdfbf7] px-4 py-8 dark:border-emerald-100/10 dark:bg-gray-950 sm:px-6 md:py-10">
        <div className="pointer-events-none absolute inset-0 bg-noise opacity-[0.06] dark:opacity-[0.04]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-emerald-900/10 dark:bg-emerald-100/10" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-emerald-900/10 dark:bg-emerald-100/10" />

        <motion.div
          className="relative grid gap-6 lg:grid-cols-3 lg:items-stretch"
          ref={cardsRef.ref}
          initial={shouldReduceMotion ? false : "hidden"}
          animate={cardsRef.isInView ? "visible" : "hidden"}
          variants={staggerContainer}
        >
          {/* אודות האפליקציה */}
          <motion.div className="h-full" variants={staggerItem}>
            <article className={panelClass}>
              <div className="pointer-events-none absolute end-3 top-3 h-8 w-8 border-e border-t border-amber-700/25 dark:border-amber-300/25" />

              <div className="flex items-center gap-4 text-start">
                <div className={iconBadgeClass}>
                  <Calculator className="h-5 w-5" strokeWidth={1.7} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold leading-tight tracking-tight text-gray-950 dark:text-white">
                    {t("appInfo.title")}
                  </h3>
                </div>
              </div>

              <div className="mt-5 flex-1 space-y-4 text-start">
                <p className="leading-relaxed text-gray-600 dark:text-gray-300">
                  {t("appInfo.description")}
                </p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    {t("appInfo.feature1")}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    {t("appInfo.feature2")}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    {t("appInfo.feature3")}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    {t("appInfo.feature4")}
                  </div>
                </div>
              </div>

              <div className={panelFooterClass}>
                <Link to="/landing">
                  <Button className="h-11 w-full">
                    {t("appInfo.learnMore")}
                    <LearnMoreIcon className="ms-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </article>
          </motion.div>

          {/* אודות מכון תורת האדם לאדם */}
          <motion.div className="h-full" variants={staggerItem}>
            <article className={panelClass}>
              <div className="pointer-events-none absolute end-3 top-3 h-8 w-8 border-e border-t border-amber-700/25 dark:border-amber-300/25" />

              <div className="flex items-center gap-4 text-start">
                <div className={iconBadgeClass}>
                  <Building2 className="h-5 w-5" strokeWidth={1.7} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold leading-tight tracking-tight text-gray-950 dark:text-white">
                    {t("institute.title")}
                  </h3>
                </div>
              </div>

              <div className="mt-5 flex-1 space-y-4 text-start">
                <p className="leading-relaxed text-gray-600 dark:text-gray-300">
                  {t("institute.description")}
                </p>

                <div className={`${insetBoxClass} p-4`}>
                  <div className="mb-2 flex items-center gap-2">
                    <Heart className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                    <span className="font-semibold text-gray-950 dark:text-white">
                      {t("institute.support")}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    {t("institute.supportDescription")}
                  </p>
                </div>
              </div>

              <div className={`${panelFooterClass} space-y-3`}>
                <Button
                  asChild
                  className="h-11 w-full border-none text-yellow-950 brightness-90 saturate-110 shadow-[0_0_16px_rgba(218,165,32,0.28)] transition-all duration-300 hover:brightness-95 hover:shadow-[0_0_22px_rgba(218,165,32,0.42)] dark:text-yellow-900 bg-golden-static hover:bg-golden-hover dark:hover:bg-yellow-600 dark:hover:text-yellow-950"
                >
                  <a
                    href="https://www.matara.pro/nedarimplus/online/?mosad=7007125&Avour=%D7%A2%D7%91%D7%95%D7%A8%20Ten10"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center"
                  >
                    <Gift className="me-2 h-4 w-4" />
                    {t("institute.donateButton")}
                    <ExternalLink className="ms-2 h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="outline" className="h-11 w-full">
                  <a
                    href="https://veahavta-kamocha.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center"
                  >
                    <Building2 className="me-2 h-4 w-4" />
                    {t("institute.visitWebsite")}
                    <ExternalLink className="ms-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </article>
          </motion.div>

          {/* אודות צוות הפיתוח */}
          <motion.div className="h-full" variants={staggerItem}>
            <article className={panelClass}>
              <div className="pointer-events-none absolute end-3 top-3 h-8 w-8 border-e border-t border-amber-700/25 dark:border-amber-300/25" />

              <div className="flex items-center gap-4 text-start">
                <div className={iconBadgeClass}>
                  <Users className="h-5 w-5" strokeWidth={1.7} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold leading-tight tracking-tight text-gray-950 dark:text-white">
                    {t("team.title")}
                  </h3>
                </div>
              </div>

              <div className="mt-5 flex-1 space-y-4 text-start">
                <p className="leading-relaxed text-gray-600 dark:text-gray-300">
                  {t("team.description")}
                </p>
              </div>

              <div className={`${panelFooterClass} space-y-3`}>
                <div className={`${insetBoxClass} w-full p-4`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
                      <span className="font-semibold text-gray-950 dark:text-white">
                        {t("team.contactEmail")}
                      </span>
                    </div>
                    <a
                      href={`mailto:${TEAM_EMAIL}`}
                      className="shrink-0 text-sm text-primary hover:text-primary/80"
                    >
                      {TEAM_EMAIL}
                    </a>
                  </div>
                </div>
                <Button asChild className="h-11 w-full">
                  <a
                    href={`mailto:${TEAM_EMAIL}`}
                    className="inline-flex items-center justify-center"
                  >
                    <Mail className="me-2 h-4 w-4" />
                    {t("team.contactButton")}
                  </a>
                </Button>
              </div>
            </article>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
